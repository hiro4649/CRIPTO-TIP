import { describe, expect, it } from "vitest";
import { postgresProviderApplyTransactionSql } from "../provider-apply-postgres-transaction.js";
import { PostgresProviderApplyTransactionAdapter } from "./postgres-provider-apply-transaction-adapter.js";
import type { PostgresQueryResult, PostgresTransactionClient } from "./postgres-transaction-client.js";
import type { ProviderApplyTransactionFailure, ProviderApplyTransactionResult } from "../provider-apply-transaction.js";

const idempotency = {
  transaction_id: "tx-postgres-adapter-1",
  job_id: "job-postgres-adapter-1",
  manual_gate_id: "gate-postgres-adapter-1",
  provider_result_id: "provider-result-safe-ref",
  operation: "provider_specific_deployment_apply" as const,
  target_commit_sha: "1234567890abcdef1234567890abcdef12345678",
  target_environment: "staging"
};

const input = {
  transactionId: "tx-postgres-adapter-1",
  committedAt: "2026-06-09T00:00:00.000Z",
  providerApplySucceeded: true,
  idempotency,
  safeSummary: { status: "provider_apply_recorded", source: "postgres_adapter_skeleton" }
};

class FakePostgresTransactionClient implements PostgresTransactionClient {
  readonly queries: { sql: string; params: readonly unknown[] }[] = [];
  private readonly results: (PostgresQueryResult | Error)[];

  constructor(results: (PostgresQueryResult | Error)[] = successResults()) {
    this.results = [...results];
  }

  async query(sql: string, params: readonly unknown[] = []) {
    this.queries.push({ sql, params });
    const result = this.results.shift() ?? ok();
    if (result instanceof Error) throw result;
    return result;
  }
}

describe("PostgresProviderApplyTransactionAdapter", () => {
  it("begins transaction before locking manual gate", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(sqlAt(fake, 0)).toBe("BEGIN");
    expect(sqlAt(fake, 1)).toContain("FROM manual_gates");
    expect(sqlAt(fake, 1)).toContain("FOR UPDATE");
  });

  it("locks manual gate before provider job", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(indexOf(fake, "FROM manual_gates")).toBeLessThan(indexOf(fake, "FROM provider_deployment_jobs"));
  });

  it("locks provider job before update", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(indexOf(fake, "FROM provider_deployment_jobs")).toBeLessThan(indexOf(fake, "UPDATE provider_deployment_jobs"));
  });

  it("updates provider job before manual gate used update", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(indexOf(fake, "UPDATE provider_deployment_jobs")).toBeLessThan(indexOf(fake, "UPDATE manual_gates"));
  });

  it("inserts provider audit before manual gate audit", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(indexOf(fake, "INSERT INTO provider_deployment_audit_logs")).toBeLessThan(indexOf(fake, "INSERT INTO manual_gate_audit_logs"));
  });

  it("commits after all writes", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(sqlAt(fake, fake.queries.length - 1)).toBe("COMMIT");
  });

  it("rolls back on manual gate lock failure", async () => {
    const fake = new FakePostgresTransactionClient([ok(), empty()]);
    const result = await adapter(fake).commitRecordedProviderApply(input);

    expect(result.compensation_required).toBe(false);
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it("rolls back on provider job lock failure", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), empty()]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("provider_job_transition_invalid");
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it("rolls back on provider job update rowCount zero", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), empty()]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("provider_job_transition_invalid");
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it("rolls back on mark manual gate used rowCount zero", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), empty()]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("mark_used_failed_after_provider_apply");
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it("mark manual gate used rowCount zero after provider success returns compensation_required true", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), empty()]);
    const result = await adapter(fake).commitRecordedProviderApply(input);

    expect(result.compensation_required).toBe(true);
  });

  it("provider audit insert rowCount zero after provider success returns compensation_required true", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), ok(), empty()]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("audit_append_failed");
    expect(result.compensation_required).toBe(true);
  });

  it("manual gate audit insert rowCount zero after provider success returns compensation_required true", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), ok(), ok(), empty()]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("audit_append_failed");
    expect(result.compensation_required).toBe(true);
  });

  it("audit append failure before provider success does not require compensation", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), empty()]);
    const result = await adapter(fake).recordProviderApplyFailure({ ...input, providerApplySucceeded: false });

    expect(result.compensation_required).toBe(false);
  });

  it("returns compensation_required when COMMIT fails after provider success", async () => {
    const fake = new FakePostgresTransactionClient([...successResults().slice(0, -1), sqlError("40001")]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.compensation_required).toBe(true);
    expect(result.next_operator_action).toContain("do not re-execute provider apply");
  });

  it("returns no compensation_required when COMMIT fails before provider success", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(), ok(), sqlError("40001")]);
    const result = await adapter(fake).recordProviderApplyFailure({ ...input, providerApplySucceeded: false });

    expect(result.compensation_required).toBe(false);
  });

  it("rollback failure is metadata-limited and does not expose raw diagnostics", async () => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow({ status: "requested" }), sqlError("XX000")]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.next_operator_action).not.toMatch(/stdout|stderr|stack/i);
  });

  it.each([
    ["requested", { status: "requested" }],
    ["used", { status: "used" }],
    ["wrong gate_type", { gate_type: "dashboard_apply" }],
    ["wrong target_commit_sha", { target_commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
    ["wrong target_environment", { target_environment: "production" }],
    ["expired", { expires_at: "2026-06-08T00:00:00.000Z" }],
    ["used_at already set", { used_at: "2026-06-08T00:00:00.000Z" }]
  ])("rejects manual gate row with %s", async (_label, override) => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(override)]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toMatch(/manual_gate/);
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it.each([
    ["wrong manual_gate_id", { manual_gate_id: "other-gate" }],
    ["wrong target_commit_sha", { target_commit_sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }],
    ["wrong target_environment", { target_environment: "production" }],
    ["applied status", { status: "applied" }],
    ["cancelled status", { status: "cancelled" }]
  ])("rejects provider job row with %s", async (_label, override) => {
    const fake = new FakePostgresTransactionClient([ok(), manualGateRow(), providerJobRow(override)]);
    const result = failure(await adapter(fake).commitRecordedProviderApply(input));

    expect(result.failed_phase).toBe("provider_job_transition_invalid");
    expect(sqlAt(fake, fake.queries.length - 1)).toBe("ROLLBACK");
  });

  it("never calls provider SDK", async () => {
    const fake = new FakePostgresTransactionClient();
    await adapter(fake).commitRecordedProviderApply(input);

    expect(fake.queries.map((query) => query.sql).join("\n")).not.toMatch(/provider sdk|provider_apply\(/i);
  });

  it("exposes retry classification without executing provider apply", () => {
    const classification = adapter(new FakePostgresTransactionClient()).classifyRetry(sqlError("55P03"), {
      providerApplySucceeded: true
    });

    expect(classification.retryable).toBe(true);
    expect(classification.nextOperatorAction).toContain("do not re-execute provider apply");
  });

  it.each([
    ["private URL", { target_environment: "https://private.example" }],
    ["wallet address", { target_environment: "0x1234567890abcdef1234567890abcdef12345678" }],
    ["token-like value", { provider_result_id: "sk-test-token" }]
  ])("rejects unsafe idempotency %s", async (_label, idempotencyOverride) => {
    await expect(adapter(new FakePostgresTransactionClient()).commitRecordedProviderApply({
      ...input,
      idempotency: { ...input.idempotency, ...idempotencyOverride }
    })).rejects.toThrow(/unsafe|target_environment/i);
  });

  it.each([
    ["raw provider response", { raw_provider_response: "forbidden" }],
    ["private URL", { detail: "https://private.example" }],
    ["wallet address", { detail: "0x1234567890abcdef1234567890abcdef12345678" }]
  ])("rejects unsafe summary %s", async (_label, safeSummary) => {
    await expect(adapter(new FakePostgresTransactionClient()).commitRecordedProviderApply({
      ...input,
      safeSummary
    })).rejects.toThrow(/safe summary contains unsafe value/i);
  });

  it("maps deadlock to retryable", () => {
    expect(adapter(new FakePostgresTransactionClient()).classifyRetry(sqlError("40P01")).retryable).toBe(true);
  });

  it("maps serialization to retryable", () => {
    expect(adapter(new FakePostgresTransactionClient()).classifyRetry(sqlError("40001")).retryable).toBe(true);
  });

  it("maps unique violation to terminal", () => {
    const classification = adapter(new FakePostgresTransactionClient()).classifyRetry(sqlError("23505"));
    expect(classification.terminal).toBe(true);
  });

  it("maps manual gate mismatch to terminal", () => {
    const classification = adapter(new FakePostgresTransactionClient()).classifyRetry(new Error("manual_gate_mismatch"), {
      phase: "manual_gate_mismatch"
    });
    expect(classification.terminal).toBe(true);
  });

  it("preserves no real DB connection invariant", () => {
    expect(String(PostgresProviderApplyTransactionAdapter)).not.toMatch(/from ['"]pg['"]|postgres\(/);
  });
});

function adapter(client: PostgresTransactionClient) {
  return new PostgresProviderApplyTransactionAdapter(client);
}

function successResults() {
  return [ok(), manualGateRow(), providerJobRow(), ok(), ok(), ok(), ok(), ok()];
}

function ok(): PostgresQueryResult {
  return { rowCount: 1, rows: [] };
}

function empty(): PostgresQueryResult {
  return { rowCount: 0, rows: [] };
}

function manualGateRow(overrides: Record<string, unknown> = {}): PostgresQueryResult {
  return {
    rowCount: 1,
    rows: [{
      id: idempotency.manual_gate_id,
      gate_type: idempotency.operation,
      status: "approved",
      target_environment: idempotency.target_environment,
      target_commit_sha: idempotency.target_commit_sha,
      expires_at: "2026-06-10T00:00:00.000Z",
      used_at: null,
      ...overrides
    }]
  };
}

function providerJobRow(overrides: Record<string, unknown> = {}): PostgresQueryResult {
  return {
    rowCount: 1,
    rows: [{
      id: idempotency.job_id,
      operation: idempotency.operation,
      status: "running",
      manual_gate_id: idempotency.manual_gate_id,
      target_environment: idempotency.target_environment,
      target_commit_sha: idempotency.target_commit_sha,
      external_provider_apply_started: false,
      manual_gate_mark_used_attempted: false,
      manual_gate_mark_used_succeeded: false,
      compensation_required: false,
      rollback_plan_ref: "docs/RUNBOOK.md#rollback",
      operator_runbook_ref: "docs/RUNBOOK.md#provider-apply",
      ...overrides
    }]
  };
}

function sqlError(code: string) {
  return Object.assign(new Error("safe postgres test error"), { code });
}

function sqlAt(fake: FakePostgresTransactionClient, index: number) {
  return fake.queries[index]?.sql ?? "";
}

function indexOf(fake: FakePostgresTransactionClient, fragment: string) {
  return fake.queries.findIndex((query) => query.sql.includes(fragment));
}

function failure(result: ProviderApplyTransactionResult | ProviderApplyTransactionFailure) {
  if (!("failed_phase" in result)) throw new Error("expected provider apply transaction failure");
  return result;
}
