import type { ProviderApplyTransactionFailure } from "../provider-apply-transaction.js";
import type { PostgresQueryResult } from "./postgres-transaction-client.js";

export type PostgresQueryFailurePhase = ProviderApplyTransactionFailure["failed_phase"] | "metadata_limited_external_blocked";

export function expectSingleRow(result: PostgresQueryResult, phase: PostgresQueryFailurePhase) {
  if (result.rowCount !== 1) {
    throw new Error(result.rowCount > 1 ? metadataLimitedPhase(phase) : phase);
  }
  const row = result.rows[0];
  if (!row) throw new Error(phase);
  return row;
}

export function expectOneWrite(result: PostgresQueryResult, phase: ProviderApplyTransactionFailure["failed_phase"], _providerApplySucceeded = false) {
  if (result.rowCount !== 1) {
    throw new Error(result.rowCount > 1 ? metadataLimitedPhase(phase) : phase);
  }
}

export function expectNoRowsOrThrow(result: PostgresQueryResult, phase: PostgresQueryFailurePhase) {
  if (result.rowCount !== 0 || result.rows.length > 0) throw new Error(phase);
}

function metadataLimitedPhase(phase: string) {
  return `metadata_limited_external_blocked:${phase}`;
}
