import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";
import type { ProviderApplyTransactionDraft } from "../provider-apply-transaction.js";
import { InMemoryTransactionalProviderDeploymentRepository } from "./provider-apply-transaction-repository.js";

const createdAt = "2026-06-09T02:20:00.000Z";
const committedAt = "2026-06-09T02:21:00.000Z";

function draft(overrides: Partial<ProviderApplyTransactionDraft> = {}): ProviderApplyTransactionDraft {
  return {
    transaction_id: "provider-apply-tx-1",
    job_id: "provider-job-1",
    manual_gate_id: "provider_specific_deployment_apply-gate-1",
    operation: "provider_specific_deployment_apply",
    target: "provider-safe-deployment",
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    rollback_plan_ref: "docs/PROVIDER_APPLY_COMPENSATION_HANDOFF.md#rollback",
    operator_runbook_ref: "docs/RUNBOOK.md#provider-apply-transaction",
    safe_summary: { phase: "draft_created" },
    external_provider_apply_started: false,
    external_provider_apply_succeeded: false,
    manual_gate_mark_used_required: true,
    created_at: createdAt,
    ...overrides
  };
}

function repositoryWithApprovedGate(options: ConstructorParameters<typeof InMemoryTransactionalProviderDeploymentRepository>[0] = {}) {
  const repository = new InMemoryTransactionalProviderDeploymentRepository(options);
  repository.createManualGate(makeManualGate("provider_specific_deployment_apply"));
  return repository;
}

describe("transactional provider deployment repository", () => {
  it("rejects duplicate transaction id", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    expect(() => repository.beginApplyTransaction(draft({ job_id: "provider-job-2" }))).toThrow(/duplicate_transaction_id/);
  });

  it("commit records job running then applied when provider succeeded and manual gate mark used succeeded", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt,
      safeSummary: { phase: "transaction_committed" }
    });
    expect(result).toMatchObject({
      transaction_id: "provider-apply-tx-1",
      job_status: "applied",
      manual_gate_status: "used",
      compensation_required: false
    });
    expect(repository.getJob("provider-job-1")).toMatchObject({
      status: "applied",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: true,
      compensation_required: false
    });
    expect(repository.getManualGate("provider_specific_deployment_apply-gate-1")?.status).toBe("used");
    expect(repository.listProviderAudits().map((audit) => audit.action)).toEqual([
      "provider_apply_transaction.draft_created",
      "provider_apply_transaction.provider_apply_started",
      "provider_apply_transaction.provider_apply_succeeded",
      "provider_apply_transaction.mark_gate_used_attempted",
      "provider_apply_transaction.mark_gate_used_succeeded",
      "provider_apply_transaction.audit_append_succeeded",
      "provider_apply_transaction.committed"
    ]);
    expect(repository.listManualGateAudits().map((audit) => audit.action)).toEqual(["manual_gate.used"]);
  });

  it("commit rejects if manual gate is not approved", () => {
    const repository = new InMemoryTransactionalProviderDeploymentRepository();
    repository.createManualGate(makeManualGate("provider_specific_deployment_apply", { status: "requested" }));
    repository.beginApplyTransaction(draft());
    expect(() => repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    })).toThrow(/manual_gate_not_approved/);
  });

  it("commit rejects if manual gate target commit mismatches", () => {
    const repository = new InMemoryTransactionalProviderDeploymentRepository();
    repository.createManualGate(makeManualGate("provider_specific_deployment_apply", {
      target_commit_sha: "abcdefabcdefabcdefabcdefabcdefabcdefabcd"
    }));
    repository.beginApplyTransaction(draft());
    expect(() => repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    })).toThrow(/manual_gate_mismatch/);
  });

  it("commit rejects if manual gate target environment mismatches", () => {
    const repository = new InMemoryTransactionalProviderDeploymentRepository();
    repository.createManualGate(makeManualGate("provider_specific_deployment_apply", { target_environment: "staging" }));
    repository.beginApplyTransaction(draft());
    expect(() => repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    })).toThrow(/manual_gate_mismatch/);
  });

  it("commit rejects if provider job transition is invalid", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    expect(() => repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: false,
      providerApplySucceeded: true,
      committedAt
    })).toThrow(/provider_job_transition_invalid/);
  });

  it("audit append failure after provider success returns compensation_required true", () => {
    const repository = repositoryWithApprovedGate({ failAuditAppend: true });
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    });
    expect(result).toMatchObject({
      failed_phase: "audit_append_failed",
      compensation_required: true,
      safe_summary: {
        phase: "audit_append_failed_after_provider_success",
        providerApplySucceeded: true,
        durableStateRolledBack: true
      }
    });
    expect(JSON.stringify(result)).toContain("compensation handoff");
  });

  it("audit append failure after provider success does not mark job applied or gate used", () => {
    const repository = repositoryWithApprovedGate({ failAuditAppend: true });
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    });
    expect(result).toMatchObject({
      failed_phase: "audit_append_failed",
      compensation_required: true
    });
    expect(repository.getJob("provider-job-1")?.status).toBe("planned");
    expect(repository.getManualGate("provider_specific_deployment_apply-gate-1")?.status).toBe("approved");
    expect(JSON.stringify(result)).not.toContain("transaction_committed");
  });

  it("audit append failure before provider success returns compensation_required false", () => {
    const repository = repositoryWithApprovedGate({ failAuditAppend: true });
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: false,
      committedAt
    });
    expect(result).toMatchObject({
      failed_phase: "audit_append_failed",
      compensation_required: false,
      safe_summary: { phase: "audit_append_failed" }
    });
  });

  it("markUsed failure after provider success produces compensation_required true", () => {
    const repository = repositoryWithApprovedGate({ failMarkUsedAfterProviderSuccess: true });
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    });
    expect(result).toMatchObject({
      failed_phase: "mark_used_failed_after_provider_apply",
      compensation_required: true
    });
    expect(repository.getJob("provider-job-1")).toMatchObject({
      status: "failed",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: false,
      compensation_required: true
    });
    expect(repository.getManualGate("provider_specific_deployment_apply-gate-1")?.status).toBe("approved");
    expect(JSON.stringify(result)).toContain("compensation handoff");
  });

  it("compensation_required result does not mark job applied", () => {
    const repository = repositoryWithApprovedGate({ failMarkUsedAfterProviderSuccess: true });
    repository.beginApplyTransaction(draft());
    repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    });
    expect(repository.getJob("provider-job-1")?.status).toBe("failed");
  });

  it("rollback transaction does not execute provider rollback and records safe operator handoff only", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    const result = repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      action: "operator_handoff",
      rollbackPlanRef: "docs/PROVIDER_APPLY_COMPENSATION_HANDOFF.md"
    });
    expect(result).toMatchObject({
      failed_phase: "metadata_limited_external_blocked",
      compensation_required: false
    });
    expect(result.next_operator_action).toMatch(/operator handoff/);
    expect(repository.listProviderAudits().map((audit) => audit.action)).toContain("provider_apply_transaction.rolled_back");
  });

  it("rollback transaction audit action is provider_apply_transaction.rolled_back", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      phase: "transaction_rolled_back"
    });
    const rollbackAudit = repository.listProviderAudits().find((audit) => audit.action === "provider_apply_transaction.rolled_back");
    expect(rollbackAudit).toMatchObject({
      action: "provider_apply_transaction.rolled_back",
      safe_summary: { phase: "transaction_rolled_back" }
    });
  });

  it("rollback transaction failure phase remains metadata_limited_external_blocked", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    const result = repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      phase: "transaction_rolled_back"
    });
    expect(result.failed_phase).toBe("metadata_limited_external_blocked");
  });

  it("rollback docs mention phase/action mapping", () => {
    const boundaryDoc = fs.readFileSync(new URL("../../../../docs/PROVIDER_APPLY_TRANSACTION_BOUNDARY.md", import.meta.url), "utf8");
    const handoffDoc = fs.readFileSync(new URL("../../../../docs/PROVIDER_APPLY_COMPENSATION_HANDOFF.md", import.meta.url), "utf8");
    expect(`${boundaryDoc}\n${handoffDoc}`).toContain("transaction phase: `transaction_rolled_back`");
    expect(`${boundaryDoc}\n${handoffDoc}`).toContain("audit action: `provider_apply_transaction.rolled_back`");
  });

  it("transaction rollback rejects unsafe summary", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    expect(() => repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      note: "https://private.example.test/rollback"
    })).toThrow(/unsafe/);
  });

  it("repository rejects duplicate audit ids", () => {
    const repository = repositoryWithApprovedGate();
    repository.beginApplyTransaction(draft());
    repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      phase: "first_rollback"
    });
    expect(() => repository.rollbackApplyTransaction("provider-apply-tx-1", committedAt, {
      phase: "same_timestamp"
    })).toThrow(/already exists/);
  });

  it("rejects provider raw response in transaction summaries", () => {
    const repository = repositoryWithApprovedGate();
    expect(() => repository.beginApplyTransaction(draft({
      safe_summary: {
        kept: "safe",
        raw_provider_response: "remove"
      }
    }))).toThrow(/unsafe/);
  });

  it("commit rejects manual gate expired at committedAt even if valid at draft createdAt", () => {
    const repository = new InMemoryTransactionalProviderDeploymentRepository();
    repository.createManualGate(makeManualGate("provider_specific_deployment_apply", {
      expires_at: "2026-06-09T02:20:30.000Z"
    }));
    repository.beginApplyTransaction(draft());
    expect(() => repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    })).toThrow(/manual_gate_not_approved/);
  });

  it("commit accepts manual gate valid at committedAt", () => {
    const repository = new InMemoryTransactionalProviderDeploymentRepository();
    repository.createManualGate(makeManualGate("provider_specific_deployment_apply", {
      expires_at: "2026-06-09T02:22:00.000Z"
    }));
    repository.beginApplyTransaction(draft());
    const result = repository.commitApplyTransaction({
      transactionId: "provider-apply-tx-1",
      providerApplyStarted: true,
      providerApplySucceeded: true,
      committedAt
    });
    expect(result).toMatchObject({
      job_status: "applied",
      manual_gate_status: "used"
    });
  });
});
