import { sanitizeProviderDeploymentSummary, type ProviderDeploymentJob } from "./provider-deployment-audit.js";
import type { ProviderDeploymentJobStatus } from "./provider-deployment-audit.js";
import type { SafeAuditSummary } from "./manual-gate-audit.js";
import type { ManualGateType } from "./manual-gates.js";

export const providerApplyTransactionPhases = [
  "draft_created",
  "provider_apply_started",
  "provider_apply_succeeded",
  "provider_apply_failed",
  "mark_gate_used_attempted",
  "mark_gate_used_succeeded",
  "mark_gate_used_failed",
  "audit_append_succeeded",
  "transaction_committed",
  "transaction_rolled_back",
  "compensation_required"
] as const;

export type ProviderApplyTransactionPhase = typeof providerApplyTransactionPhases[number];

export type ProviderApplyTransactionFailurePhase =
  | "manual_gate_not_approved"
  | "manual_gate_mismatch"
  | "provider_job_transition_invalid"
  | "mark_used_failed_after_provider_apply"
  | "audit_append_failed"
  | "unsafe_summary_rejected"
  | "duplicate_transaction_id"
  | "raw_provider_response_rejected"
  | "metadata_limited_external_blocked";

export type ProviderApplyTransactionDraft = {
  transaction_id: string;
  job_id: string;
  manual_gate_id: string;
  operation: ManualGateType;
  target: string;
  target_environment: string;
  target_commit_sha: string;
  rollback_plan_ref: string;
  operator_runbook_ref: string;
  safe_summary: SafeAuditSummary;
  external_provider_apply_started: boolean;
  external_provider_apply_succeeded: boolean;
  manual_gate_mark_used_required: boolean;
  created_at: string;
};

export type ProviderApplyTransactionResult = {
  transaction_id: string;
  job_id: string;
  manual_gate_id: string;
  job_status: ProviderDeploymentJobStatus;
  manual_gate_status: "approved" | "used";
  audit_record_ids: string[];
  compensation_required: boolean;
  safe_summary: SafeAuditSummary;
  committed_at: string;
};

export type ProviderApplyTransactionFailure = {
  transaction_id: string;
  job_id: string;
  manual_gate_id: string;
  failed_phase: ProviderApplyTransactionFailurePhase;
  compensation_required: boolean;
  next_operator_action: string;
  safe_summary: SafeAuditSummary;
  failed_at: string;
};

export function createProviderApplyTransactionDraft(draft: ProviderApplyTransactionDraft): ProviderApplyTransactionDraft {
  assertProviderApplyTransactionDraft(draft);
  return {
    transaction_id: sanitizeTransactionText(draft.transaction_id),
    job_id: sanitizeTransactionText(draft.job_id),
    manual_gate_id: sanitizeTransactionText(draft.manual_gate_id),
    operation: draft.operation,
    target: sanitizeTransactionText(draft.target),
    target_environment: sanitizeTransactionText(draft.target_environment),
    target_commit_sha: draft.target_commit_sha,
    rollback_plan_ref: sanitizeTransactionText(draft.rollback_plan_ref),
    operator_runbook_ref: sanitizeTransactionText(draft.operator_runbook_ref),
    safe_summary: sanitizeProviderDeploymentSummary(draft.safe_summary),
    external_provider_apply_started: Boolean(draft.external_provider_apply_started),
    external_provider_apply_succeeded: Boolean(draft.external_provider_apply_succeeded),
    manual_gate_mark_used_required: Boolean(draft.manual_gate_mark_used_required),
    created_at: draft.created_at
  };
}

export function createProviderApplyTransactionFailure(failure: ProviderApplyTransactionFailure): ProviderApplyTransactionFailure {
  assertSafeTransactionText(failure.next_operator_action, "next_operator_action");
  return {
    transaction_id: sanitizeTransactionText(failure.transaction_id),
    job_id: sanitizeTransactionText(failure.job_id),
    manual_gate_id: sanitizeTransactionText(failure.manual_gate_id),
    failed_phase: failure.failed_phase,
    compensation_required: Boolean(failure.compensation_required),
    next_operator_action: sanitizeTransactionText(failure.next_operator_action),
    safe_summary: sanitizeProviderDeploymentSummary(failure.safe_summary),
    failed_at: failure.failed_at
  };
}

export function providerApplyJobFromDraft(draft: ProviderApplyTransactionDraft): ProviderDeploymentJob {
  const safeDraft = createProviderApplyTransactionDraft(draft);
  return {
    id: safeDraft.job_id,
    operation: safeDraft.operation,
    status: "planned",
    target: safeDraft.target,
    target_environment: safeDraft.target_environment,
    target_commit_sha: safeDraft.target_commit_sha,
    manual_gate_id: safeDraft.manual_gate_id,
    rollback_plan_ref: safeDraft.rollback_plan_ref,
    operator_runbook_ref: safeDraft.operator_runbook_ref,
    safe_summary: safeDraft.safe_summary,
    created_at: safeDraft.created_at,
    updated_at: safeDraft.created_at
  };
}

function assertProviderApplyTransactionDraft(draft: ProviderApplyTransactionDraft) {
  if (!draft.transaction_id) throw new Error("provider apply transaction id is required");
  if (!draft.job_id) throw new Error("provider apply transaction job id is required");
  if (draft.manual_gate_mark_used_required && !draft.manual_gate_id) {
    throw new Error("provider apply transaction manual gate id is required for production-like apply");
  }
  if (!draft.target) throw new Error("provider apply transaction target is required");
  if (!draft.target_environment) throw new Error("provider apply transaction target environment is required");
  if (!/^[0-9a-f]{40}$/i.test(draft.target_commit_sha)) throw new Error("provider apply transaction target_commit_sha is required");
  if (!draft.rollback_plan_ref) throw new Error("provider apply transaction rollback plan reference is required");
  if (!draft.operator_runbook_ref) throw new Error("provider apply transaction operator runbook reference is required");
  const serialized = JSON.stringify({
    transaction_id: draft.transaction_id,
    job_id: draft.job_id,
    manual_gate_id: draft.manual_gate_id,
    target: draft.target,
    target_environment: draft.target_environment,
    rollback_plan_ref: draft.rollback_plan_ref,
    operator_runbook_ref: draft.operator_runbook_ref,
    safe_summary: draft.safe_summary
  });
  if (unsafeTransactionPattern().test(serialized)) {
    throw new Error("provider apply transaction contains unsafe summary or target value");
  }
}

function assertSafeTransactionText(value: string, label: string) {
  if (unsafeTransactionPattern().test(String(value))) {
    throw new Error(`provider apply transaction ${label} contains unsafe value`);
  }
}

function sanitizeTransactionText(value: string) {
  return String(value).replace(/[\r\n]/g, " ").slice(0, 160);
}

function unsafeTransactionPattern() {
  return /Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|webhook|api[_-]?key|oauth|secret|token|private|raw[_-]?message|raw[_-]?payload|raw[_-]?provider|provider[_-]?response|display[_-]?name|youtube[_-]?(author|id)|stdout|stderr|stack[_-]?trace/i;
}
