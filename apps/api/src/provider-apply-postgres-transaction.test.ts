import { describe, expect, it } from "vitest";
import {
  classifyPostgresProviderApplyTransactionError,
  createPostgresProviderApplyTransactionPlan,
  postgresProviderApplyTransactionSql
} from "./provider-apply-postgres-transaction.js";

const idempotency = {
  transaction_id: "tx-postgres-1",
  job_id: "job-postgres-1",
  manual_gate_id: "gate-postgres-1",
  provider_result_id: "provider-result-safe-ref",
  operation: "provider_specific_deployment_apply" as const,
  target_commit_sha: "1234567890abcdef1234567890abcdef12345678",
  target_environment: "staging"
};

describe("postgres provider apply transaction SQL design", () => {
  it("locks manual gate before provider job", () => {
    const plan = createPostgresProviderApplyTransactionPlan(idempotency);

    expect(plan.lockOrder).toEqual([
      "manual_gates",
      "provider_deployment_jobs",
      "provider_deployment_audit_logs",
      "manual_gate_audit_logs"
    ]);
  });

  it("uses SELECT FOR UPDATE for manual gate", () => {
    expect(postgresProviderApplyTransactionSql.lockManualGate).toContain("FROM manual_gates");
    expect(postgresProviderApplyTransactionSql.lockManualGate).toContain("FOR UPDATE");
  });

  it("uses SELECT FOR UPDATE for provider job", () => {
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("FROM provider_deployment_jobs");
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("FOR UPDATE");
  });

  it("locks provider job with operation", () => {
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toMatch(/SELECT[\s\S]*operation/i);
  });

  it("locks provider job with state flags", () => {
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("external_provider_apply_started");
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("manual_gate_mark_used_attempted");
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("manual_gate_mark_used_succeeded");
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("compensation_required");
  });

  it("locks provider job with rollback and runbook refs", () => {
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("rollback_plan_ref");
    expect(postgresProviderApplyTransactionSql.lockProviderJob).toContain("operator_runbook_ref");
  });

  it("updates manual gate used after provider job state check", () => {
    const sqlOrder = [
      postgresProviderApplyTransactionSql.lockManualGate,
      postgresProviderApplyTransactionSql.lockProviderJob,
      postgresProviderApplyTransactionSql.updateProviderJob,
      postgresProviderApplyTransactionSql.markManualGateUsed
    ].join("\n-- next\n");

    expect(sqlOrder.indexOf("UPDATE provider_deployment_jobs")).toBeLessThan(sqlOrder.indexOf("UPDATE manual_gates"));
  });

  it("inserts provider audit and manual gate audit before commit", () => {
    const sqlOrder = [
      postgresProviderApplyTransactionSql.insertProviderAudit,
      postgresProviderApplyTransactionSql.insertManualGateAudit,
      postgresProviderApplyTransactionSql.commit
    ].join("\n-- next\n");

    expect(sqlOrder.indexOf("INSERT INTO provider_deployment_audit_logs")).toBeLessThan(sqlOrder.indexOf("INSERT INTO manual_gate_audit_logs"));
    expect(sqlOrder.indexOf("INSERT INTO manual_gate_audit_logs")).toBeLessThan(sqlOrder.indexOf("COMMIT"));
  });

  it("updates external provider apply started flag", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("external_provider_apply_started");
  });

  it("updates manual gate mark used attempted flag", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("manual_gate_mark_used_attempted");
  });

  it("updates manual gate mark used succeeded flag", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("manual_gate_mark_used_succeeded");
  });

  it("updates compensation required flag", () => {
    expect(postgresProviderApplyTransactionSql.updateProviderJob).toContain("compensation_required");
  });

  it("mark manual gate used requires approved status", () => {
    expect(postgresProviderApplyTransactionSql.markManualGateUsed).toContain("status = 'approved'");
  });

  it("mark manual gate used checks target commit", () => {
    expect(postgresProviderApplyTransactionSql.markManualGateUsed).toContain("target_commit_sha = $13");
  });

  it("mark manual gate used checks target environment", () => {
    expect(postgresProviderApplyTransactionSql.markManualGateUsed).toContain("target_environment = $12");
  });

  it("mark manual gate used checks expiry after commit time", () => {
    expect(postgresProviderApplyTransactionSql.markManualGateUsed).toContain("expires_at > $5");
  });

  it("mark manual gate used checks used_at is null", () => {
    expect(postgresProviderApplyTransactionSql.markManualGateUsed).toContain("used_at IS NULL");
  });

  it("does not include raw provider response or secret value columns", () => {
    const sql = Object.values(postgresProviderApplyTransactionSql).join("\n");

    expect(sql).not.toMatch(/raw_provider_response|provider_response|secret_value|webhook_url|api_key|oauth_token/i);
  });

  it("marks provider apply as outside DB transaction and retry does not re-execute it", () => {
    const plan = createPostgresProviderApplyTransactionPlan(idempotency);

    expect(plan.providerApplyOutsideDbTransaction).toBe(true);
    expect(plan.retryMustNotReexecuteProviderApply).toBe(true);
  });
});

describe("postgres provider apply retry classifier", () => {
  it("marks deadlock retryable", () => {
    expect(classifyPostgresProviderApplyTransactionError({ sqlState: "40P01" })).toMatchObject({
      reasonCode: "postgres_transaction_deadlock_retryable",
      retryable: true
    });
  });

  it("marks serialization retryable", () => {
    expect(classifyPostgresProviderApplyTransactionError({ sqlState: "40001" })).toMatchObject({
      reasonCode: "postgres_transaction_serialization_retryable",
      retryable: true
    });
  });

  it("marks lock timeout retryable", () => {
    expect(classifyPostgresProviderApplyTransactionError({ sqlState: "55P03" })).toMatchObject({
      reasonCode: "postgres_transaction_lock_timeout_retryable",
      retryable: true
    });
  });

  it("lock timeout after provider success says do not re-execute provider apply", () => {
    expect(classifyPostgresProviderApplyTransactionError({ sqlState: "55P03", providerApplySucceeded: true }).nextOperatorAction).toContain("do not re-execute provider apply");
  });

  it("lock timeout before provider success does not imply provider apply happened", () => {
    const action = classifyPostgresProviderApplyTransactionError({ sqlState: "55P03", providerApplySucceeded: false }).nextOperatorAction;

    expect(action).toContain("before provider apply");
    expect(action).not.toContain("provider apply result is safely identified");
  });

  it("marks unique violation terminal", () => {
    expect(classifyPostgresProviderApplyTransactionError({ sqlState: "23505" })).toMatchObject({
      reasonCode: "postgres_transaction_unique_violation_terminal",
      terminal: true
    });
  });

  it("marks manual gate mismatch terminal", () => {
    expect(classifyPostgresProviderApplyTransactionError({ phase: "manual_gate_mismatch" })).toMatchObject({
      reasonCode: "postgres_transaction_manual_gate_mismatch_terminal",
      terminal: true
    });
  });

  it("marks unsafe summary terminal", () => {
    expect(classifyPostgresProviderApplyTransactionError({ unsafeSummaryRejected: true })).toMatchObject({
      reasonCode: "postgres_transaction_unsafe_summary_terminal",
      terminal: true
    });
  });

  it("marks audit append after provider success compensation_required", () => {
    expect(classifyPostgresProviderApplyTransactionError({ phase: "audit_append_failed", providerApplySucceeded: true })).toMatchObject({
      reasonCode: "postgres_transaction_audit_append_failed_compensation_required",
      compensationRequired: true,
      retryable: false,
      terminal: false
    });
  });
});

describe("postgres provider apply idempotency safety", () => {
  it("rejects raw provider response", () => {
    expect(() => createPostgresProviderApplyTransactionPlan({ ...idempotency, provider_result_id: "raw_provider_response" })).toThrow(/unsafe/);
  });

  it("rejects wallet address", () => {
    expect(() => createPostgresProviderApplyTransactionPlan({ ...idempotency, provider_result_id: "0x1234567890abcdef1234567890abcdef12345678" })).toThrow(/unsafe/);
  });

  it("rejects private URL", () => {
    expect(() => createPostgresProviderApplyTransactionPlan({ ...idempotency, provider_result_id: "https://private.example.invalid" })).toThrow(/unsafe/);
  });

  it("rejects token-like values", () => {
    expect(() => createPostgresProviderApplyTransactionPlan({ ...idempotency, provider_result_id: "Bearer value" })).toThrow(/unsafe/);
  });
});
