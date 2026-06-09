import type { SafeAuditSummary } from "../manual-gate-audit.js";
import {
  assertSafePostgresProviderApplyIdempotency,
  assertSafePostgresProviderApplySummary,
  classifyPostgresProviderApplyTransactionError,
  postgresProviderApplyTransactionSql,
  type PostgresProviderApplyTransactionIdempotency,
  type PostgresTransactionRetryClassification,
  unsafePostgresTransactionPattern
} from "../provider-apply-postgres-transaction.js";
import type {
  ProviderApplyTransactionFailure,
  ProviderApplyTransactionResult
} from "../provider-apply-transaction.js";
import type { ManualGateType } from "../manual-gates.js";
import type { PostgresTransactionClient } from "./postgres-transaction-client.js";
import {
  createManualGateAuditInsertParams,
  createManualGateLockParams,
  createManualGateUsedParams,
  createProviderAuditInsertParams,
  createProviderJobLockParams,
  createProviderJobUpdateParams
} from "./postgres-provider-apply-params.js";
import { parseManualGateRow, parseProviderJobRow, type ManualGateRow, type ProviderJobRow } from "./postgres-provider-apply-row-parsers.js";
import { expectOneWrite, expectSingleRow } from "./postgres-query-result-guards.js";

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
    this.assertInput(input);
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

      if (input.providerApplySucceeded) {
        phase = "update_provider_job_after_provider_success_before_gate_used";
        await this.expectWrite("provider_job_transition_invalid", postgresProviderApplyTransactionSql.updateProviderJob, createProviderJobUpdateParams(input, {
          status: "running",
          externalProviderApplyStarted: true,
          manualGateMarkUsedAttempted: true,
          manualGateMarkUsedSucceeded: false,
          compensationRequired: false
        }), true);

        phase = "mark_used_failed_after_provider_apply";
        await this.expectWrite("mark_used_failed_after_provider_apply", postgresProviderApplyTransactionSql.markManualGateUsed, createManualGateUsedParams(input), true);

        phase = "update_provider_job_applied_after_gate_used";
        await this.expectWrite("provider_job_transition_invalid", postgresProviderApplyTransactionSql.updateProviderJob, createProviderJobUpdateParams(input, {
          status: "applied",
          externalProviderApplyStarted: true,
          manualGateMarkUsedAttempted: true,
          manualGateMarkUsedSucceeded: true,
          compensationRequired: false
        }), true);
      } else {
        phase = "update_provider_job";
        await this.expectWrite("provider_job_transition_invalid", postgresProviderApplyTransactionSql.updateProviderJob, createProviderJobUpdateParams(input, {
          status: "failed",
          externalProviderApplyStarted: false,
          manualGateMarkUsedAttempted: false,
          manualGateMarkUsedSucceeded: false,
          compensationRequired: false
        }), false);
      }

      phase = "audit_append_failed";
      await this.expectWrite("audit_append_failed", postgresProviderApplyTransactionSql.insertProviderAudit, createProviderAuditInsertParams(input, input.providerApplySucceeded
          ? "provider_apply_transaction.provider_apply_succeeded"
          : "provider_apply_transaction.provider_apply_failed"
      ), input.providerApplySucceeded);

      if (input.providerApplySucceeded) {
        phase = "audit_append_failed";
        await this.expectWrite("audit_append_failed", postgresProviderApplyTransactionSql.insertManualGateAudit, createManualGateAuditInsertParams(input), true);
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
        audit_record_ids: input.providerApplySucceeded
          ? [`${input.transactionId}-provider-audit`, `${input.transactionId}-manual-gate-audit`]
          : [`${input.transactionId}-provider-audit`],
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
    this.assertInput(input);
    return this.failure(input, "audit_append_failed", true);
  }

  async appendSafeAudit(input: Omit<PostgresAdapterInput, "providerApplySucceeded">) {
    this.assertInput(input);
    await this.expectWrite("audit_append_failed", postgresProviderApplyTransactionSql.insertProviderAudit, createProviderAuditInsertParams(input), false);
  }

  classifyRetry(error: unknown, context: { providerApplySucceeded?: boolean | undefined; phase?: string | undefined } = {}): PostgresTransactionRetryClassification {
    return classifyPostgresProviderApplyTransactionError({
      sqlState: sqlStateFromError(error),
      providerApplySucceeded: context.providerApplySucceeded,
      phase: context.phase
    });
  }

  private async lockManualGate(input: PostgresAdapterInput) {
    const result = await this.client.query(postgresProviderApplyTransactionSql.lockManualGate, createManualGateLockParams(input));
    return parseManualGateRow(expectSingleRow(result, "manual_gate_not_approved"));
  }

  private async lockProviderJob(input: PostgresAdapterInput) {
    const result = await this.client.query(postgresProviderApplyTransactionSql.lockProviderJob, createProviderJobLockParams(input));
    return parseProviderJobRow(expectSingleRow(result, "provider_job_transition_invalid"));
  }

  private async expectWrite(phase: ProviderApplyTransactionFailure["failed_phase"], sql: string, params: readonly unknown[], providerApplySucceeded: boolean) {
    const result = await this.client.query(sql, params);
    expectOneWrite(result, phase, providerApplySucceeded);
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
    if (job.operation !== input.idempotency.operation) throw new Error("provider_job_transition_invalid");
    if (job.manual_gate_id !== input.idempotency.manual_gate_id) throw new Error("provider_job_transition_invalid");
    if (job.target_commit_sha !== input.idempotency.target_commit_sha) throw new Error("provider_job_transition_invalid");
    if (job.target_environment !== input.idempotency.target_environment) throw new Error("provider_job_transition_invalid");
    this.assertSafeRequiredRef(job.rollback_plan_ref, "rollback_plan_ref");
    this.assertSafeRequiredRef(job.operator_runbook_ref, "operator_runbook_ref");
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
      next_operator_action: isMetadataLimitedError(error)
        ? "Review metadata-limited safe evidence for the adapter phase; do not expose row contents or raw DB diagnostics."
        : isTypedRowParserRejection(error)
        ? "Typed row parser rejected safe row shape; review adapter column contract without exposing row contents."
        : phase === "commit" && input.providerApplySucceeded
        ? "Inspect durable safe evidence before retrying; COMMIT outcome is metadata-limited and provider apply must not be re-executed."
        : compensationRequired
        ? "Follow provider apply compensation handoff; do not re-execute provider apply."
        : classified.nextOperatorAction,
      safe_summary: input.safeSummary,
      failed_at: input.committedAt
    };
  }

  private shouldCompensate(providerApplySucceeded: boolean, phase: string) {
    return providerApplySucceeded && [
      "update_provider_job_applied_after_gate_used",
      "mark_used_failed_after_provider_apply",
      "audit_append_failed",
      "commit"
    ].includes(phase);
  }

  private assertInput(input: Pick<PostgresAdapterInput, "transactionId" | "committedAt" | "idempotency" | "safeSummary">) {
    this.assertSafeAdapterText(input.transactionId, "transaction id");
    this.assertSafeAdapterText(input.committedAt, "committed at");
    if (Number.isNaN(new Date(input.committedAt).getTime())) throw new Error("committed at must be an ISO datetime");
    assertSafePostgresProviderApplyIdempotency(input.idempotency);
    assertSafePostgresProviderApplySummary(input.safeSummary);
  }

  private assertSafeAdapterText(value: string, label: string) {
    if (!value) throw new Error(`${label} is required`);
    if (unsafePostgresTransactionPattern().test(value)) throw new Error(`${label} contains unsafe value`);
  }

  private assertSafeRequiredRef(value: string | undefined, field: "rollback_plan_ref" | "operator_runbook_ref") {
    if (!value) throw new Error("provider_job_transition_invalid");
    if (unsafePostgresTransactionPattern().test(value)) throw new Error("provider_job_transition_invalid");
  }
}

function sqlStateFromError(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}

function phaseForClassifier(phase: string) {
  if (phase.startsWith("metadata_limited_external_blocked:")) return "metadata_limited_external_blocked";
  if (phase === "mark_used_failed_after_provider_apply") return "audit_append_failed";
  if (phase === "update_provider_job_applied_after_gate_used") return "job_transition_invalid";
  if (phase === "update_provider_job") return "job_transition_invalid";
  if (phase === "update_provider_job_after_provider_success_before_gate_used") return "job_transition_invalid";
  return phase;
}

function failurePhase(phase: string): ProviderApplyTransactionFailure["failed_phase"] {
  if (phase.startsWith("metadata_limited_external_blocked:")) return "provider_job_transition_invalid";
  if (phase === "mark_used_failed_after_provider_apply") return "mark_used_failed_after_provider_apply";
  if (phase === "audit_append_failed") return "audit_append_failed";
  if (phase === "manual_gate_not_approved") return "manual_gate_not_approved";
  if (phase === "manual_gate_mismatch") return "manual_gate_mismatch";
  if (phase === "commit") return "audit_append_failed";
  return "provider_job_transition_invalid";
}

function isTypedRowParserRejection(error: unknown) {
  return error instanceof Error && /typed_row_parser_rejected|is required|is invalid|must be an ISO|must be boolean|invariant is invalid/.test(error.message);
}

function isMetadataLimitedError(error: unknown) {
  return error instanceof Error && error.message.startsWith("metadata_limited_external_blocked:");
}
