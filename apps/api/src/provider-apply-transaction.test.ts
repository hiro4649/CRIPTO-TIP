import { describe, expect, it } from "vitest";
import { targetCommitSha } from "./manual-gates.test-support.js";
import {
  createProviderApplyTransactionDraft,
  createProviderApplyTransactionFailure,
  providerApplyJobFromDraft,
  type ProviderApplyTransactionDraft
} from "./provider-apply-transaction.js";

const createdAt = "2026-06-09T02:10:00.000Z";

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

describe("provider apply transaction draft", () => {
  it("rejects missing job id", () => {
    expect(() => createProviderApplyTransactionDraft(draft({ job_id: "" }))).toThrow(/job id/);
  });

  it("rejects missing manual gate id for production-like apply", () => {
    expect(() => createProviderApplyTransactionDraft(draft({ manual_gate_id: "" }))).toThrow(/manual gate id/);
  });

  it("rejects unsafe target", () => {
    expect(() => createProviderApplyTransactionDraft(draft({ target: "https://private.example.test/apply" }))).toThrow(/unsafe/);
  });

  it("rejects private URL in safe summary", () => {
    expect(() => createProviderApplyTransactionDraft(draft({
      safe_summary: { note: "https://private.example.test/provider" }
    }))).toThrow(/unsafe/);
  });

  it("rejects wallet address in safe summary", () => {
    expect(() => createProviderApplyTransactionDraft(draft({
      safe_summary: { wallet: `0x${"1".repeat(40)}` }
    }))).toThrow(/unsafe/);
  });

  it("rejects provider raw response in safe summary", () => {
    expect(() => createProviderApplyTransactionDraft(draft({
      safe_summary: {
        kept: "yes",
        raw_provider_response: "provider payload",
        stdout: "full stdout"
      }
    }))).toThrow(/unsafe/);
  });

  it("creates a planned provider job from a transaction draft", () => {
    const job = providerApplyJobFromDraft(draft());
    expect(job.status).toBe("planned");
    expect(job.manual_gate_id).toBe("provider_specific_deployment_apply-gate-1");
    expect(job.rollback_plan_ref).toContain("PROVIDER_APPLY_COMPENSATION_HANDOFF");
  });

  it("failure result sanitizes unsafe fields", () => {
    const failure = createProviderApplyTransactionFailure({
      transaction_id: "provider-apply-tx-1",
      job_id: "provider-job-1",
      manual_gate_id: "provider_specific_deployment_apply-gate-1",
      failed_phase: "metadata_limited_external_blocked",
      compensation_required: false,
      next_operator_action: "Use safe artifact only",
      safe_summary: {
        kept: "safe",
        raw_provider_response: "remove",
        tokenValue: "Bearer value"
      },
      failed_at: createdAt
    });
    expect(failure.safe_summary).toEqual({ kept: "safe" });
  });

  it("transaction failure rejects unsafe next_operator_action private URL", () => {
    expect(() => createProviderApplyTransactionFailure({
      transaction_id: "provider-apply-tx-1",
      job_id: "provider-job-1",
      manual_gate_id: "provider_specific_deployment_apply-gate-1",
      failed_phase: "metadata_limited_external_blocked",
      compensation_required: false,
      next_operator_action: "Open https://private.example.test/apply",
      safe_summary: { phase: "metadata_limited_external_blocked" },
      failed_at: createdAt
    })).toThrow(/next_operator_action/);
  });

  it("transaction failure rejects unsafe next_operator_action token-like value", () => {
    expect(() => createProviderApplyTransactionFailure({
      transaction_id: "provider-apply-tx-1",
      job_id: "provider-job-1",
      manual_gate_id: "provider_specific_deployment_apply-gate-1",
      failed_phase: "metadata_limited_external_blocked",
      compensation_required: false,
      next_operator_action: "Use Bearer value",
      safe_summary: { phase: "metadata_limited_external_blocked" },
      failed_at: createdAt
    })).toThrow(/next_operator_action/);
  });

  it("transaction failure accepts safe operator handoff text", () => {
    const failure = createProviderApplyTransactionFailure({
      transaction_id: "provider-apply-tx-1",
      job_id: "provider-job-1",
      manual_gate_id: "provider_specific_deployment_apply-gate-1",
      failed_phase: "metadata_limited_external_blocked",
      compensation_required: false,
      next_operator_action: "Follow provider apply compensation handoff and verify safe status evidence.",
      safe_summary: { phase: "metadata_limited_external_blocked" },
      failed_at: createdAt
    });
    expect(failure.next_operator_action).toMatch(/compensation handoff/);
  });
});
