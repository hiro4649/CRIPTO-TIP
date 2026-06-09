import { describe, expect, it } from "vitest";
import { expectOneWrite, expectSingleRow } from "./postgres-query-result-guards.js";
import type { PostgresQueryResult } from "./postgres-transaction-client.js";

describe("postgres query result guards", () => {
  it("expectSingleRow rejects rowCount 0", () => {
    expect(() => expectSingleRow(result(0, []), "manual_gate_not_approved")).toThrow(/manual_gate_not_approved/);
  });

  it("expectSingleRow rejects rowCount 2", () => {
    expect(() => expectSingleRow(result(2, [{ id: "a" }, { id: "b" }]), "provider_job_transition_invalid")).toThrow(/metadata_limited_external_blocked/);
  });

  it("expectSingleRow rejects missing rows[0]", () => {
    expect(() => expectSingleRow(result(1, []), "provider_job_transition_invalid")).toThrow(/provider_job_transition_invalid/);
  });

  it("expectOneWrite rejects rowCount 0", () => {
    expect(() => expectOneWrite(result(0, []), "audit_append_failed")).toThrow(/audit_append_failed/);
  });

  it("expectOneWrite rejects rowCount 2", () => {
    expect(() => expectOneWrite(result(2, []), "provider_job_transition_invalid")).toThrow(/metadata_limited_external_blocked/);
  });

  it("expectOneWrite classifies audit append after provider success as compensation_required phase", () => {
    expect(() => expectOneWrite(result(0, []), "audit_append_failed", true)).toThrow(/audit_append_failed/);
  });

  it("expectOneWrite classifies update failure as provider_job_transition_invalid", () => {
    expect(() => expectOneWrite(result(0, []), "provider_job_transition_invalid")).toThrow(/provider_job_transition_invalid/);
  });
});

function result(rowCount: number, rows: readonly Record<string, unknown>[]): PostgresQueryResult {
  return { rowCount, rows };
}
