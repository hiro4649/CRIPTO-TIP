import type { SafeAuditSummary } from "./manual-gate-audit.js";
import type { ManualGateType } from "./manual-gates.js";

export const postgresProviderApplyTransactionReasonCodes = [
  "postgres_transaction_deadlock_retryable",
  "postgres_transaction_serialization_retryable",
  "postgres_transaction_lock_timeout_retryable",
  "postgres_transaction_unique_violation_terminal",
  "postgres_transaction_manual_gate_not_approved_terminal",
  "postgres_transaction_manual_gate_mismatch_terminal",
  "postgres_transaction_job_transition_invalid_terminal",
  "postgres_transaction_audit_append_failed_compensation_required",
  "postgres_transaction_metadata_limited_external_blocked",
  "postgres_transaction_unsafe_summary_terminal",
  "postgres_transaction_raw_provider_response_terminal"
] as const;

export type PostgresProviderApplyTransactionReasonCode = typeof postgresProviderApplyTransactionReasonCodes[number];

export type PostgresTransactionRetryClassification = {
  reasonCode: PostgresProviderApplyTransactionReasonCode;
  retryable: boolean;
  terminal: boolean;
  compensationRequired: boolean;
  nextOperatorAction: string;
};

export type PostgresProviderApplyTransactionIdempotency = {
  transaction_id: string;
  job_id: string;
  manual_gate_id: string;
  provider_result_id?: string | undefined;
  operation: ManualGateType;
  target_commit_sha: string;
  target_environment: string;
};

export type PostgresProviderApplyTransactionPlan = {
  lockOrder: readonly string[];
  idempotency: PostgresProviderApplyTransactionIdempotency;
  providerApplyOutsideDbTransaction: true;
  retryMustNotReexecuteProviderApply: true;
  sql: {
    begin: string;
    lockManualGate: string;
    lockProviderJob: string;
    updateProviderJob: string;
    markManualGateUsed: string;
    insertProviderAudit: string;
    insertManualGateAudit: string;
    commit: string;
  };
};

const lockOrder = [
  "manual_gates",
  "provider_deployment_jobs",
  "provider_deployment_audit_logs",
  "manual_gate_audit_logs"
] as const;

export const postgresProviderApplyTransactionSql = {
  begin: "BEGIN",
  lockManualGate: [
    "SELECT id, gate_type, status, target_environment, target_commit_sha, expires_at",
    "FROM manual_gates",
    "WHERE id = $1",
    "FOR UPDATE"
  ].join("\n"),
  lockProviderJob: [
    "SELECT id, operation, status, manual_gate_id, target_environment, target_commit_sha,",
    "       external_provider_apply_started, manual_gate_mark_used_attempted,",
    "       manual_gate_mark_used_succeeded, compensation_required,",
    "       rollback_plan_ref, operator_runbook_ref",
    "FROM provider_deployment_jobs",
    "WHERE id = $2",
    "FOR UPDATE"
  ].join("\n"),
  updateProviderJob: [
    "UPDATE provider_deployment_jobs",
    "SET status = $3,",
    "    safe_summary = $4,",
    "    external_provider_apply_started = $15,",
    "    manual_gate_mark_used_attempted = $16,",
    "    manual_gate_mark_used_succeeded = $17,",
    "    compensation_required = $18,",
    "    updated_at = $5",
    "WHERE id = $2"
  ].join("\n"),
  markManualGateUsed: [
    "UPDATE manual_gates",
    "SET status = 'used',",
    "    used_at = $5,",
    "    updated_at = $5",
    "WHERE id = $1",
    "  AND status = 'approved'",
    "  AND target_environment = $12",
    "  AND target_commit_sha = $13",
    "  AND expires_at > $5",
    "  AND used_at IS NULL"
  ].join("\n"),
  insertProviderAudit: [
    "INSERT INTO provider_deployment_audit_logs",
    "  (id, job_id, operation, action, target, safe_summary, created_at)",
    "VALUES ($6, $2, $7, $8, $9, $10, $5)"
  ].join("\n"),
  insertManualGateAudit: [
    "INSERT INTO manual_gate_audit_logs",
    "  (id, gate_id, action, actor_type, target_environment, target_commit_sha, safe_summary, created_at)",
    "VALUES ($11, $1, 'manual_gate.used', 'system', $12, $13, $14, $5)"
  ].join("\n"),
  commit: "COMMIT"
} as const;

export function createPostgresProviderApplyTransactionPlan(
  idempotency: PostgresProviderApplyTransactionIdempotency
): PostgresProviderApplyTransactionPlan {
  assertSafePostgresProviderApplyIdempotency(idempotency);
  return {
    lockOrder,
    idempotency: {
      ...idempotency,
      transaction_id: sanitizePostgresTransactionText(idempotency.transaction_id),
      job_id: sanitizePostgresTransactionText(idempotency.job_id),
      manual_gate_id: sanitizePostgresTransactionText(idempotency.manual_gate_id),
      ...(idempotency.provider_result_id ? { provider_result_id: sanitizePostgresTransactionText(idempotency.provider_result_id) } : {}),
      target_environment: sanitizePostgresTransactionText(idempotency.target_environment)
    },
    providerApplyOutsideDbTransaction: true,
    retryMustNotReexecuteProviderApply: true,
    sql: postgresProviderApplyTransactionSql
  };
}

export function classifyPostgresProviderApplyTransactionError(args: {
  sqlState?: string | undefined;
  providerApplySucceeded?: boolean | undefined;
  phase?: string | undefined;
  unsafeSummaryRejected?: boolean | undefined;
  rawProviderResponseRejected?: boolean | undefined;
}): PostgresTransactionRetryClassification {
  if (args.unsafeSummaryRejected) return terminal("postgres_transaction_unsafe_summary_terminal", "Remove unsafe summary fields before retry.");
  if (args.rawProviderResponseRejected) return terminal("postgres_transaction_raw_provider_response_terminal", "Remove raw provider response fields before retry.");
  if (args.phase === "manual_gate_not_approved") return terminal("postgres_transaction_manual_gate_not_approved_terminal", "Request a fresh approved manual gate record.");
  if (args.phase === "manual_gate_mismatch") return terminal("postgres_transaction_manual_gate_mismatch_terminal", "Use a manual gate bound to the same operation, commit, and environment.");
  if (args.phase === "job_transition_invalid") return terminal("postgres_transaction_job_transition_invalid_terminal", "Inspect provider job state before retry.");
  if (args.phase === "audit_append_failed" && args.providerApplySucceeded) {
    return {
      reasonCode: "postgres_transaction_audit_append_failed_compensation_required",
      retryable: false,
      terminal: false,
      compensationRequired: true,
      nextOperatorAction: "Follow provider apply compensation handoff; do not re-execute provider apply."
    };
  }
  if (args.sqlState === "40P01") return retryable("postgres_transaction_deadlock_retryable", "Retry durable state recording without re-executing provider apply.");
  if (args.sqlState === "40001") return retryable("postgres_transaction_serialization_retryable", "Retry durable state recording without re-executing provider apply.");
  if (args.sqlState === "55P03" && args.providerApplySucceeded) {
    return retryable("postgres_transaction_lock_timeout_retryable", "Retry durable state recording only; do not re-execute provider apply.");
  }
  if (args.sqlState === "55P03") {
    return retryable("postgres_transaction_lock_timeout_retryable", "Retry before provider apply or retry metadata-only planning.");
  }
  if (args.sqlState === "23505") return terminal("postgres_transaction_unique_violation_terminal", "Treat duplicate transaction identity as terminal and inspect idempotency evidence.");
  return terminal("postgres_transaction_metadata_limited_external_blocked", "Inspect safe metadata-limited evidence before retry.");
}

export function assertSafePostgresProviderApplyIdempotency(idempotency: PostgresProviderApplyTransactionIdempotency) {
  const serialized = JSON.stringify(idempotency);
  if (!idempotency.transaction_id) throw new Error("postgres provider apply transaction_id is required");
  if (!idempotency.job_id) throw new Error("postgres provider apply job_id is required");
  if (!idempotency.manual_gate_id) throw new Error("postgres provider apply manual_gate_id is required");
  if (!/^[0-9a-f]{40}$/i.test(idempotency.target_commit_sha)) throw new Error("postgres provider apply target_commit_sha is required");
  if (!idempotency.target_environment) throw new Error("postgres provider apply target_environment is required");
  if (unsafePostgresTransactionPattern().test(serialized)) {
    throw new Error("postgres provider apply idempotency contains unsafe value");
  }
}

export function assertSafePostgresProviderApplySummary(summary: SafeAuditSummary) {
  const serialized = JSON.stringify(summary);
  if (unsafePostgresTransactionPattern().test(serialized)) {
    throw new Error("postgres provider apply safe summary contains unsafe value");
  }
}

function retryable(reasonCode: PostgresProviderApplyTransactionReasonCode, nextOperatorAction: string): PostgresTransactionRetryClassification {
  return { reasonCode, retryable: true, terminal: false, compensationRequired: false, nextOperatorAction };
}

function terminal(reasonCode: PostgresProviderApplyTransactionReasonCode, nextOperatorAction: string): PostgresTransactionRetryClassification {
  return { reasonCode, retryable: false, terminal: true, compensationRequired: false, nextOperatorAction };
}

function sanitizePostgresTransactionText(value: string) {
  return String(value).replace(/[\r\n]/g, " ").slice(0, 160);
}

export function unsafePostgresTransactionPattern() {
  return /Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|webhook|api[_-]?key|oauth|secret|token|private|raw[_-]?message|raw[_-]?payload|raw[_-]?provider|provider[_-]?response|display[_-]?name|youtube[_-]?(author|id)|stdout|stderr|stack[_-]?trace/i;
}
