import type { SafeAuditSummary } from "../manual-gate-audit.js";
import {
  assertSafePostgresProviderApplyIdempotency,
  assertSafePostgresProviderApplySummary,
  type PostgresProviderApplyTransactionIdempotency,
  unsafePostgresTransactionPattern
} from "../provider-apply-postgres-transaction.js";

export type PostgresProviderApplyParamInput = {
  transactionId: string;
  committedAt: string;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
};

export type ProviderJobUpdateState = {
  status: "running" | "applied" | "failed";
  externalProviderApplyStarted: boolean;
  manualGateMarkUsedAttempted: boolean;
  manualGateMarkUsedSucceeded: boolean;
  compensationRequired: boolean;
};

export function createManualGateLockParams(input: PostgresProviderApplyParamInput) {
  return baseParams(input);
}

export function createProviderJobLockParams(input: PostgresProviderApplyParamInput) {
  return baseParams(input);
}

export function createProviderJobUpdateParams(input: PostgresProviderApplyParamInput, state: ProviderJobUpdateState) {
  if (state.status === "applied" && (
    !state.externalProviderApplyStarted ||
    !state.manualGateMarkUsedAttempted ||
    !state.manualGateMarkUsedSucceeded ||
    state.compensationRequired
  )) {
    throw new Error("applied provider job params require manual gate used success");
  }
  if (state.compensationRequired && (
    state.status !== "failed" ||
    !state.externalProviderApplyStarted ||
    !state.manualGateMarkUsedAttempted ||
    state.manualGateMarkUsedSucceeded
  )) {
    throw new Error("compensation provider job params require failed compensation state");
  }
  return baseParams(input, state);
}

export function createManualGateUsedParams(input: PostgresProviderApplyParamInput) {
  return baseParams(input);
}

export function createProviderAuditInsertParams(input: PostgresProviderApplyParamInput, action = "provider_apply_transaction.audit_append_succeeded") {
  assertSafeText(action, "provider audit action");
  return baseParams(input, { providerAuditAction: action });
}

export function createManualGateAuditInsertParams(input: PostgresProviderApplyParamInput) {
  return baseParams(input);
}

function baseParams(input: PostgresProviderApplyParamInput, options: Partial<ProviderJobUpdateState> & { providerAuditAction?: string } = {}) {
  assertSafeParamInput(input);
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

function assertSafeParamInput(input: PostgresProviderApplyParamInput) {
  assertSafeText(input.transactionId, "transaction id");
  assertSafeText(input.committedAt, "committed at");
  if (Number.isNaN(new Date(input.committedAt).getTime())) throw new Error("committed at must be an ISO datetime");
  assertSafePostgresProviderApplyIdempotency(input.idempotency);
  assertSafePostgresProviderApplySummary(input.safeSummary);
}

function assertSafeText(value: string, label: string) {
  if (!value) throw new Error(`${label} is required`);
  if (unsafePostgresTransactionPattern().test(value)) throw new Error(`${label} contains unsafe value`);
}
