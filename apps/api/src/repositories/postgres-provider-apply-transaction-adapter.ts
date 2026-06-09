import type { SafeAuditSummary } from "../manual-gate-audit.js";
import {
  assertSafePostgresProviderApplyIdempotency,
  assertSafePostgresProviderApplySummary,
  classifyPostgresProviderApplyTransactionError,
  postgresProviderApplyTransactionSql,
  type PostgresProviderApplyTransactionIdempotency,
  type PostgresTransactionRetryClassification
} from "../provider-apply-postgres-transaction.js";
import type {
  ProviderApplyTransactionFailure,
  ProviderApplyTransactionResult
} from "../provider-apply-transaction.js";
import type { ManualGateType } from "../manual-gates.js";
import type { PostgresTransactionClient, PostgresQueryResult } from "./postgres-transaction-client.js";

type ManualGateRow = {
  id: string;
  gate_type: ManualGateType;
  status: string;
  target_environment: string;
  target_commit_sha: string;
  expires_at: string;
  used_at?: string | null | undefined;
};

type ProviderJobRow = {
  id: string;
  operation: ManualGateType;
  status: string;
  manual_gate_id: string;
  target_environment: string;
  target_commit_sha: string;
  rollback_plan_ref: string;
  operator_runbook_ref: string;
};

export type PostgresAdapterInput = {
  transactionId: string;
  committedAt: string;
  providerApplySucceeded: boolean;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
};

export class PostgresProviderApplyTransactionAdapter {
  constructor(private readonly client: PostgresTransactionClient) {}

  async commitRecordedProviderApply(input: PostgresAdapterInput): Promise<ProviderApplyTransactionResult | ProviderApplyTransactionFailure> {
    this.assertInput(input.idempotency, input.safeSummary);
    let transactionOpen = false;
    let phase = "begin";
    try {
      await this.client.query(postgresProviderApplyTransactionSql.begin, []);
      transactionOpen = true;

      phase = "manual_gate_not_approved";
      const gate = await this.lockManualGate(input);
      this.validateManualGate(gate, input);

      phase = "job_transition_invalid";
      const job = await this.lockProviderJob(input);
      this.validateProviderJob(job, input);

      phase = "update_provider_job";
      await this.expectWrite("provider_job_transition_invalid", postgresProviderApplyTransactionSql.updateProviderJob, this.params(input, {
        status: input.providerApplySucceeded ? "applied" : "failed",
        externalProviderApplyStarted: input.providerApplySucceeded,
        manualGateMarkUsedAttempted: input.providerApplySucceeded,
        manualGateMarkUsedSucceeded: false,
        compensationRequired: false
      }), input.providerApplySucceeded);

      if (input.providerApplySucceeded) {
        phase = "mark_used_failed_after_provider_apply";
        await this.expectWrite("mark_used_failed_after_provider_apply", postgresProviderApplyTransactionSql.markManualGateUsed, this.params(input), true);
      }

      phase = "audit_append_failed";
      await this.expectWrite("audit_append_failed", postgresProviderApplyTransactionSql.insertProviderAudit, this.params(input, {
        providerAuditAction: input.providerApplySucceeded
          ? "provider_apply_transaction.provider_apply_succeeded"
          : "provider_apply_transaction.provider_apply_failed"
      }), input.providerApplySucceeded);

      if (input.providerApplySucceeded) {
        phase = "audit_append_failed";
        await this.expectWrite("audit_append_failed", postgresProviderApplyTransactionSql.insertManualGateAudit, this.params(input), true);
      }

      phase = "commit";
      await this.client.query(postgresProviderApplyTransactionSql.commit, []);
      transactionOpen = false;

      return {
        transaction_id: input.transactionId,
        job_id: input.idempotency.job_id,
        manual_gate_id: input.idempotency.manual_gate_id,
        job_status: input.providerApplySucceeded ? "applied" : "failed",
        manual_gate_status: input.providerApplySucceeded ? "used" : "approved",
        audit_record_ids: [`${input.transactionId}-provider-audit`, `${input.transactionId}-manual-gate-audit`],
        compensation_required: false,
        safe_summary: input.safeSummary,
        committed_at: input.committedAt
      };
    } catch (error) {
      if (transactionOpen) await this.rollbackSafely();
      return this.failure(input, phase, this.shouldCompensate(input.providerApplySucceeded, phase), error);
    }
  }

  async recordProviderApplyFailure(input: PostgresAdapterInput) {
    return this.commitRecordedProviderApply({ ...input, providerApplySucceeded: false });
  }

  async recordCompensationRequired(input: PostgresAdapterInput): Promise<ProviderApplyTransactionFailure> {
    this.assertInput(input.idempotency, input.safeSummary);
    return this.failure(input, "audit_append_failed", true);
  }

  async appendSafeAudit(input: Omit<PostgresAdapterInput, "providerApplySucceeded">) {
    this.assertInput(input.idempotency, input.safeSummary);
    await this.client.query(postgresProviderApplyTransactionSql.insertProviderAudit, this.params({
      ...input,
      providerApplySucceeded: false
    }));
  }

  classifyRetry(error: unknown, context: { providerApplySucceeded?: boolean | undefined; phase?: string | undefined } = {}): PostgresTransactionRetryClassification {
    return classifyPostgresProviderApplyTransactionError({
      sqlState: sqlStateFromError(error),
      providerApplySucceeded: context.providerApplySucceeded,
      phase: context.phase
    });
  }

  private async lockManualGate(input: PostgresAdapterInput) {
    const result = await this.client.query(postgresProviderApplyTransactionSql.lockManualGate, this.params(input));
    if (result.rowCount === 0) throw new Error("manual_gate_not_approved");
    return row<ManualGateRow>(result);
  }

  private async lockProviderJob(input: PostgresAdapterInput) {
    const result = await this.client.query(postgresProviderApplyTransactionSql.lockProviderJob, this.params(input));
    if (result.rowCount === 0) throw new Error("provider_job_transition_invalid");
    return row<ProviderJobRow>(result);
  }

  private async expectWrite(phase: ProviderApplyTransactionFailure["failed_phase"], sql: string, params: readonly unknown[], providerApplySucceeded: boolean) {
    const result = await this.client.query(sql, params);
    if (result.rowCount === 0) {
      throw new Error(providerApplySucceeded ? phase : "provider_job_transition_invalid");
    }
  }

  private validateManualGate(gate: ManualGateRow, input: PostgresAdapterInput) {
    if (gate.status !== "approved") throw new Error("manual_gate_not_approved");
    if (gate.gate_type !== input.idempotency.operation) throw new Error("manual_gate_mismatch");
    if (gate.target_commit_sha !== input.idempotency.target_commit_sha) throw new Error("manual_gate_mismatch");
    if (gate.target_environment !== input.idempotency.target_environment) throw new Error("manual_gate_mismatch");
    if (new Date(gate.expires_at).getTime() <= new Date(input.committedAt).getTime()) throw new Error("manual_gate_not_approved");
    if (gate.used_at) throw new Error("manual_gate_not_approved");
  }

  private validateProviderJob(job: ProviderJobRow, input: PostgresAdapterInput) {
    if (!["planned", "running"].includes(job.status)) throw new Error("provider_job_transition_invalid");
    if (job.manual_gate_id !== input.idempotency.manual_gate_id) throw new Error("provider_job_transition_invalid");
    if (job.target_commit_sha !== input.idempotency.target_commit_sha) throw new Error("provider_job_transition_invalid");
    if (job.target_environment !== input.idempotency.target_environment) throw new Error("provider_job_transition_invalid");
  }

  private params(input: PostgresAdapterInput, options: {
    status?: string;
    providerAuditAction?: string;
    externalProviderApplyStarted?: boolean;
    manualGateMarkUsedAttempted?: boolean;
    manualGateMarkUsedSucceeded?: boolean;
    compensationRequired?: boolean;
  } = {}) {
    return [
      input.idempotency.manual_gate_id,
      input.idempotency.job_id,
      options.status ?? "applied",
      input.safeSummary,
      input.committedAt,
      `${input.transactionId}-provider-audit`,
      input.idempotency.operation,
      options.providerAuditAction ?? "provider_apply_transaction.audit_append_succeeded",
      input.idempotency.target_environment,
      input.safeSummary,
      `${input.transactionId}-manual-gate-audit`,
      input.idempotency.target_environment,
      input.idempotency.target_commit_sha,
      input.safeSummary,
      Boolean(options.externalProviderApplyStarted),
      Boolean(options.manualGateMarkUsedAttempted),
      Boolean(options.manualGateMarkUsedSucceeded),
      Boolean(options.compensationRequired)
    ] as const;
  }

  private async rollbackSafely() {
    try {
      await this.client.query("ROLLBACK", []);
    } catch {
      // Rollback failure stays metadata-limited; raw DB diagnostics are not exposed.
    }
  }

  private failure(input: PostgresAdapterInput, phase: string, compensationRequired: boolean, error?: unknown): ProviderApplyTransactionFailure {
    const classified = this.classifyRetry(error, {
      providerApplySucceeded: input.providerApplySucceeded,
      phase: phaseForClassifier(phase)
    });
    return {
      transaction_id: input.transactionId,
      job_id: input.idempotency.job_id,
      manual_gate_id: input.idempotency.manual_gate_id,
      failed_phase: failurePhase(phase),
      compensation_required: compensationRequired || classified.compensationRequired,
      next_operator_action: compensationRequired
        ? "Follow provider apply compensation handoff; do not re-execute provider apply."
        : classified.nextOperatorAction,
      safe_summary: input.safeSummary,
      failed_at: input.committedAt
    };
  }

  private shouldCompensate(providerApplySucceeded: boolean, phase: string) {
    return providerApplySucceeded && [
      "mark_used_failed_after_provider_apply",
      "audit_append_failed",
      "commit"
    ].includes(phase);
  }

  private assertInput(idempotency: PostgresProviderApplyTransactionIdempotency, safeSummary: SafeAuditSummary) {
    assertSafePostgresProviderApplyIdempotency(idempotency);
    assertSafePostgresProviderApplySummary(safeSummary);
  }
}

function row<T>(result: PostgresQueryResult) {
  return result.rows[0] as T;
}

function sqlStateFromError(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}

function phaseForClassifier(phase: string) {
  if (phase === "mark_used_failed_after_provider_apply") return "audit_append_failed";
  if (phase === "update_provider_job") return "job_transition_invalid";
  return phase;
}

function failurePhase(phase: string): ProviderApplyTransactionFailure["failed_phase"] {
  if (phase === "mark_used_failed_after_provider_apply") return "mark_used_failed_after_provider_apply";
  if (phase === "audit_append_failed") return "audit_append_failed";
  if (phase === "manual_gate_not_approved") return "manual_gate_not_approved";
  if (phase === "manual_gate_mismatch") return "manual_gate_mismatch";
  if (phase === "commit") return "audit_append_failed";
  return "provider_job_transition_invalid";
}
