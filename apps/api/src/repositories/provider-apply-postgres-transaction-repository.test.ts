import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PostgresProviderApplyTransactionRepositoryContract } from "./provider-apply-postgres-transaction-repository.js";

const idempotency = {
  transaction_id: "tx-repository-1",
  job_id: "job-repository-1",
  manual_gate_id: "gate-repository-1",
  provider_result_id: "safe-provider-result-ref",
  operation: "provider_specific_deployment_apply" as const,
  target_commit_sha: "abcdefabcdefabcdefabcdefabcdefabcdefabcd",
  target_environment: "staging"
};

describe("PostgresProviderApplyTransactionRepositoryContract", () => {
  it("plans transaction without opening a real DB connection", () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();
    const plan = repo.planTransaction(idempotency);

    expect(plan.sql.lockManualGate).toContain("FOR UPDATE");
    expect(plan.providerApplyOutsideDbTransaction).toBe(true);
  });

  it("commit contract rejects unsafe idempotency key fields before DB adapter work", async () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    await expect(repo.commitRecordedProviderApply({
      transactionId: "tx-repository-1",
      committedAt: new Date().toISOString(),
      providerApplySucceeded: true,
      idempotency: { ...idempotency, provider_result_id: "raw_provider_response" },
      safeSummary: { phase: "transaction_committed" }
    })).rejects.toThrow(/unsafe/);
  });

  it("commit contract rejects raw provider response in safe summary", async () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    await expect(repo.commitRecordedProviderApply({
      transactionId: "tx-repository-1",
      committedAt: new Date().toISOString(),
      providerApplySucceeded: true,
      idempotency,
      safeSummary: { phase: "transaction_committed", source: "raw_provider_response" }
    })).rejects.toThrow(/unsafe/);
  });

  it("commit contract rejects wallet address in safe summary", async () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    await expect(repo.commitRecordedProviderApply({
      transactionId: "tx-repository-1",
      committedAt: new Date().toISOString(),
      providerApplySucceeded: true,
      idempotency,
      safeSummary: { phase: "transaction_committed", source: "0x1234567890abcdef1234567890abcdef12345678" }
    })).rejects.toThrow(/unsafe/);
  });

  it("commit contract rejects private URL in safe summary", async () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    await expect(repo.commitRecordedProviderApply({
      transactionId: "tx-repository-1",
      committedAt: new Date().toISOString(),
      providerApplySucceeded: true,
      idempotency,
      safeSummary: { phase: "transaction_committed", source: "https://private.example.invalid" }
    })).rejects.toThrow(/unsafe/);
  });

  it("commit contract rejects token-like values in safe summary", async () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    await expect(repo.commitRecordedProviderApply({
      transactionId: "tx-repository-1",
      committedAt: new Date().toISOString(),
      providerApplySucceeded: true,
      idempotency,
      safeSummary: { phase: "transaction_committed", source: "Bearer value" }
    })).rejects.toThrow(/unsafe/);
  });

  it("classifies SQL states through the repository boundary", () => {
    const repo = new PostgresProviderApplyTransactionRepositoryContract();

    expect(repo.classifyRetry({ code: "40P01" })).toMatchObject({
      reasonCode: "postgres_transaction_deadlock_retryable",
      retryable: true
    });
  });
});

describe("provider apply transaction migration indexes", () => {
  const migration = fs.readFileSync("migrations/0004_provider_apply_transaction_indexes.sql", "utf8");

  it("contains required indexes", () => {
    expect(migration).toContain("provider_deployment_jobs_transaction_unique");
    expect(migration).toContain("provider_deployment_jobs_manual_gate_id");
    expect(migration).toContain("provider_deployment_jobs_status");
    expect(migration).toContain("provider_deployment_jobs_target_commit");
    expect(migration).toContain("provider_deployment_audit_logs_id_unique");
    expect(migration).toContain("provider_deployment_audit_logs_job_id");
    expect(migration).toContain("manual_gate_audit_logs_gate_id");
    expect(migration).toContain("manual_gates_status_environment_commit");
  });

  it("contains safe_summary object checks", () => {
    expect(migration.match(/jsonb_typeof\(safe_summary\) = 'object'/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("adds rollback_planned provider deployment job status", () => {
    expect(migration).toContain("'rollback_planned'");
  });

  it("provider deployment jobs status check matches TypeScript state machine", () => {
    for (const status of ["planned", "running", "applied", "failed", "rollback_planned", "rolled_back", "cancelled"]) {
      expect(migration).toContain(`'${status}'`);
    }
  });

  it("action check includes provider apply transaction draft created", () => {
    expect(migration).toContain("'provider_apply_transaction.draft_created'");
  });

  it("action check includes provider apply transaction compensation required", () => {
    expect(migration).toContain("'provider_apply_transaction.compensation_required'");
  });

  it("action check includes provider deployment job rollback planned", () => {
    expect(migration).toContain("'provider_deployment.job.rollback_planned'");
  });

  it("adds external provider apply started column", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS external_provider_apply_started boolean NOT NULL DEFAULT false/i);
  });

  it("adds manual gate mark used attempted column", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS manual_gate_mark_used_attempted boolean NOT NULL DEFAULT false/i);
  });

  it("adds manual gate mark used succeeded column", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS manual_gate_mark_used_succeeded boolean NOT NULL DEFAULT false/i);
  });

  it("adds compensation required column", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS compensation_required boolean NOT NULL DEFAULT false/i);
  });

  it("applied consistency check requires provider apply started and manual gate used success", () => {
    expect(migration).toContain("provider_deployment_jobs_applied_consistency");
    expect(migration).toContain("status <> 'applied'");
    expect(migration).toContain("external_provider_apply_started = true");
    expect(migration).toContain("manual_gate_mark_used_attempted = true");
    expect(migration).toContain("manual_gate_mark_used_succeeded = true");
    expect(migration).toContain("compensation_required = false");
  });

  it("compensation consistency check requires failed job and mark-used failure", () => {
    expect(migration).toContain("provider_deployment_jobs_compensation_consistency");
    expect(migration).toContain("status = 'failed'");
    expect(migration).toContain("external_provider_apply_started = true");
    expect(migration).toContain("manual_gate_mark_used_attempted = true");
    expect(migration).toContain("manual_gate_mark_used_succeeded = false");
  });

  it("contains no secret defaults or unsafe URL/token/default values", () => {
    expect(migration).not.toMatch(/DEFAULT\s+'.*(Bearer|https?:\/\/|ghp_|xoxb_|AKIA|webhook|api[_-]?key|oauth|secret|token|private)/i);
    expect(migration).not.toMatch(/raw_provider_response|provider_response|webhook_url|secret_value|oauth_token|api_key/i);
  });
});
