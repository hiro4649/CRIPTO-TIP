import { describe, expect, it } from "vitest";
import { postgresProviderApplyTransactionSql } from "../provider-apply-postgres-transaction.js";
import {
  createManualGateAuditInsertParams,
  createManualGateLockParams,
  createManualGateUsedParams,
  createProviderAuditInsertParams,
  createProviderJobLockParams,
  createProviderJobUpdateParams
} from "./postgres-provider-apply-params.js";

const sha = "1234567890abcdef1234567890abcdef12345678";

describe("postgres provider apply params", () => {
  it("manual gate lock params order matches SQL $1 usage", () => {
    expect(postgresProviderApplyTransactionSql.lockManualGate).toContain("id = $1");
    expect(createManualGateLockParams(input())[0]).toBe("gate-param-1");
  });

  it("provider job lock params order matches SQL $2 usage", () => {
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("id = $2");
    expect(createProviderJobLockParams(input())[1]).toBe("job-param-1");
  });

  it("provider job update params include status at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("status = $3");
    expect(updateParams()[2]).toBe("applied");
  });

  it("provider job update params include safe_summary at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("safe_summary = $4");
    expect(updateParams()[3]).toEqual(input().safeSummary);
  });

  it("provider job update params include external_provider_apply_started at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("external_provider_apply_started = $15");
    expect(updateParams()[14]).toBe(true);
  });

  it("provider job update params include manual_gate_mark_used_attempted at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("manual_gate_mark_used_attempted = $16");
    expect(updateParams()[15]).toBe(true);
  });

  it("provider job update params include manual_gate_mark_used_succeeded at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("manual_gate_mark_used_succeeded = $17");
    expect(updateParams()[16]).toBe(true);
  });

  it("provider job update params include compensation_required at expected index", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("compensation_required = $18");
    expect(updateParams()[17]).toBe(false);
  });

  it("manual gate used params include target_environment and target_commit_sha", () => {
    const params = createManualGateUsedParams(input());
    expect(params[11]).toBe("staging");
    expect(params[12]).toBe(sha);
  });

  it("provider audit params include safe summary only", () => {
    const params = createProviderAuditInsertParams(input(), "provider_apply_transaction.provider_apply_succeeded");
    expect(params[9]).toEqual({ status: "safe" });
    expect(JSON.stringify(params)).not.toMatch(/raw_provider_response|stdout|stderr/);
  });

  it("createProviderAuditInsertParams accepts provider apply failed action", () => {
    expect(createProviderAuditInsertParams(input(), "provider_apply_transaction.provider_apply_failed")[7]).toBe("provider_apply_transaction.provider_apply_failed");
  });

  it("createProviderAuditInsertParams rejects unknown audit action", () => {
    expect(() => createProviderAuditInsertParams(input(), "provider_apply_transaction.unknown")).toThrow(/provider audit action is invalid/);
  });

  it("createProviderAuditInsertParams rejects safe-looking but unknown action", () => {
    expect(() => createProviderAuditInsertParams(input(), "provider_apply_transaction.safe_summary_recorded")).toThrow(/provider audit action is invalid/);
  });

  it("manual gate audit params include safe summary only", () => {
    const params = createManualGateAuditInsertParams(input());
    expect(params[13]).toEqual({ status: "safe" });
    expect(JSON.stringify(params)).not.toMatch(/raw_provider_response|stdout|stderr/);
  });

  it("params reject unsafe transaction id", () => {
    expect(() => createManualGateLockParams(input({ transactionId: "sk-test-token" }))).toThrow(/unsafe|contains/);
  });

  it("params reject unsafe job id", () => {
    expect(() => createProviderJobLockParams(input({ idempotency: { ...idempotency(), job_id: "0x1234567890abcdef1234567890abcdef12345678" } }))).toThrow(/unsafe/);
  });

  it("params reject unsafe manual gate id", () => {
    expect(() => createManualGateUsedParams(input({ idempotency: { ...idempotency(), manual_gate_id: "https://private.example.invalid" } }))).toThrow(/unsafe/);
  });

  it("params reject unsafe safe summary", () => {
    expect(() => createProviderAuditInsertParams(input({ safeSummary: { detail: "Bearer token" } }))).toThrow(/unsafe/);
  });
});

function updateParams() {
  return createProviderJobUpdateParams(input(), {
    status: "applied",
    externalProviderApplyStarted: true,
    manualGateMarkUsedAttempted: true,
    manualGateMarkUsedSucceeded: true,
    compensationRequired: false
  });
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: "tx-param-1",
    committedAt: "2026-06-10T00:00:00.000Z",
    idempotency: idempotency(),
    safeSummary: { status: "safe" },
    ...overrides
  };
}

function idempotency() {
  return {
    transaction_id: "tx-param-1",
    job_id: "job-param-1",
    manual_gate_id: "gate-param-1",
    operation: "provider_specific_deployment_apply" as const,
    target_environment: "staging",
    target_commit_sha: sha
  };
}
