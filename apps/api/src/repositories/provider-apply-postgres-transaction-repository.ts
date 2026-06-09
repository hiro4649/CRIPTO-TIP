import type { SafeAuditSummary } from "../manual-gate-audit.js";
import {
  assertSafePostgresProviderApplyIdempotency,
  assertSafePostgresProviderApplySummary,
  createPostgresProviderApplyTransactionPlan,
  type PostgresProviderApplyTransactionIdempotency,
  type PostgresProviderApplyTransactionPlan,
  type PostgresTransactionRetryClassification
} from "../provider-apply-postgres-transaction.js";
import {
  classifyPostgresProviderApplyTransactionError
} from "../provider-apply-postgres-transaction.js";
import type {
  ProviderApplyTransactionFailure,
  ProviderApplyTransactionResult
} from "../provider-apply-transaction.js";

export type CommitRecordedProviderApplyInput = {
  transactionId: string;
  committedAt: string;
  providerApplySucceeded: boolean;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
};

export type RecordProviderApplyFailureInput = {
  transactionId: string;
  failedAt: string;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
};

export type RecordCompensationRequiredInput = {
  transactionId: string;
  failedAt: string;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
};

export type AppendSafeAuditInput = {
  transactionId: string;
  idempotency: PostgresProviderApplyTransactionIdempotency;
  safeSummary: SafeAuditSummary;
  createdAt: string;
};

export interface PostgresProviderApplyTransactionRepository {
  planTransaction(input: PostgresProviderApplyTransactionIdempotency): PostgresProviderApplyTransactionPlan;
  commitRecordedProviderApply(input: CommitRecordedProviderApplyInput): Promise<ProviderApplyTransactionResult>;
  recordProviderApplyFailure(input: RecordProviderApplyFailureInput): Promise<ProviderApplyTransactionFailure>;
  recordCompensationRequired(input: RecordCompensationRequiredInput): Promise<ProviderApplyTransactionFailure>;
  appendSafeAudit(input: AppendSafeAuditInput): Promise<void>;
  classifyRetry(error: unknown, context?: { providerApplySucceeded?: boolean | undefined; phase?: string | undefined }): PostgresTransactionRetryClassification;
}

export class PostgresProviderApplyTransactionRepositoryContract implements PostgresProviderApplyTransactionRepository {
  planTransaction(input: PostgresProviderApplyTransactionIdempotency) {
    return createPostgresProviderApplyTransactionPlan(input);
  }

  async commitRecordedProviderApply(input: CommitRecordedProviderApplyInput): Promise<ProviderApplyTransactionResult> {
    this.assertInput(input.idempotency, input.safeSummary);
    throw new Error("postgres provider apply repository requires a future DB adapter; no real DB connection is implemented");
  }

  async recordProviderApplyFailure(input: RecordProviderApplyFailureInput): Promise<ProviderApplyTransactionFailure> {
    this.assertInput(input.idempotency, input.safeSummary);
    throw new Error("postgres provider apply failure recording requires a future DB adapter; no real DB connection is implemented");
  }

  async recordCompensationRequired(input: RecordCompensationRequiredInput): Promise<ProviderApplyTransactionFailure> {
    this.assertInput(input.idempotency, input.safeSummary);
    throw new Error("postgres compensation recording requires a future DB adapter; no real DB connection is implemented");
  }

  async appendSafeAudit(input: AppendSafeAuditInput): Promise<void> {
    this.assertInput(input.idempotency, input.safeSummary);
    throw new Error("postgres safe audit append requires a future DB adapter; no real DB connection is implemented");
  }

  classifyRetry(error: unknown, context: { providerApplySucceeded?: boolean | undefined; phase?: string | undefined } = {}) {
    return classifyPostgresProviderApplyTransactionError({
      sqlState: sqlStateFromError(error),
      providerApplySucceeded: context.providerApplySucceeded,
      phase: context.phase
    });
  }

  private assertInput(idempotency: PostgresProviderApplyTransactionIdempotency, safeSummary: SafeAuditSummary) {
    assertSafePostgresProviderApplyIdempotency(idempotency);
    assertSafePostgresProviderApplySummary(safeSummary);
  }
}

function sqlStateFromError(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}
