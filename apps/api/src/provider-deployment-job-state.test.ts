import { describe, expect, it } from "vitest";
import { targetCommitSha } from "./manual-gates.test-support.js";
import {
  createProviderDeploymentJobAuditRecord,
  createProviderDeploymentJobStateRecord,
  deriveProviderDeploymentCompensationState,
  transitionProviderDeploymentJob,
  type ProviderDeploymentJobStateRecord
} from "./provider-deployment-job-state.js";

const createdAt = "2026-06-09T00:00:00.000Z";

function job(overrides: Partial<ProviderDeploymentJobStateRecord> = {}): ProviderDeploymentJobStateRecord {
  return {
    id: "provider-job-1",
    operation: "provider_specific_deployment_apply",
    status: "planned",
    target: "provider-safe-deployment",
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    manual_gate_id: "provider_specific_deployment_apply-gate-1",
    rollback_plan_ref: "docs/PROVIDER_DEPLOYMENT_COMPENSATION.md#rollback",
    operator_runbook_ref: "docs/RUNBOOK.md#provider-apply-job-state",
    safe_summary: { step: "planned" },
    external_provider_apply_started: false,
    manual_gate_mark_used_attempted: false,
    manual_gate_mark_used_succeeded: false,
    compensation_required: false,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides
  };
}

describe("provider deployment job state machine", () => {
  it("allows the intended provider apply lifecycle transitions", () => {
    const planned = createProviderDeploymentJobStateRecord(job());
    const running = transitionProviderDeploymentJob(planned, "running", {
      updatedAt: "2026-06-09T00:01:00.000Z",
      externalProviderApplyStarted: true,
      safeSummary: { step: "running" }
    });
    const applied = transitionProviderDeploymentJob(running, "applied", {
      updatedAt: "2026-06-09T00:02:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: true,
      safeSummary: { step: "applied" }
    });
    expect(applied.status).toBe("applied");
    expect(applied.manual_gate_mark_used_succeeded).toBe(true);

    const failed = transitionProviderDeploymentJob(job({ id: "provider-job-2", status: "running" }), "failed", {
      updatedAt: "2026-06-09T00:03:00.000Z",
      safeSummary: { step: "failed" }
    });
    const rollbackPlanned = transitionProviderDeploymentJob(failed, "rollback_planned", {
      updatedAt: "2026-06-09T00:04:00.000Z",
      safeSummary: { step: "rollback_planned" }
    });
    expect(transitionProviderDeploymentJob(rollbackPlanned, "rolled_back", {
      updatedAt: "2026-06-09T00:05:00.000Z",
      safeSummary: { step: "rolled_back" }
    }).status).toBe("rolled_back");

    expect(transitionProviderDeploymentJob(job({ id: "provider-job-3" }), "cancelled", {
      updatedAt: "2026-06-09T00:06:00.000Z"
    }).status).toBe("cancelled");
  });

  it.each([
    ["applied", "running"],
    ["applied", "failed"],
    ["failed", "applied"],
    ["rolled_back", "applied"],
    ["cancelled", "running"],
    ["cancelled", "applied"]
  ] as const)("rejects forbidden transition %s -> %s", (from, to) => {
    expect(() => transitionProviderDeploymentJob(job({
      status: from,
      manual_gate_mark_used_attempted: from === "applied",
      manual_gate_mark_used_succeeded: from === "applied"
    }), to, {
      updatedAt: "2026-06-09T00:07:00.000Z"
    })).toThrow(/not allowed/);
  });

  it("allows running cancellation only before external provider apply starts", () => {
    const running = job({ status: "running", external_provider_apply_started: false });
    expect(transitionProviderDeploymentJob(running, "cancelled", {
      updatedAt: "2026-06-09T00:08:00.000Z"
    }).status).toBe("cancelled");

    expect(() => transitionProviderDeploymentJob(job({
      status: "running",
      external_provider_apply_started: true
    }), "cancelled", {
      updatedAt: "2026-06-09T00:09:00.000Z"
    })).toThrow(/cannot be cancelled/);
  });

  it("requires compensation when provider apply succeeded but manual gate markUsed failed", () => {
    expect(deriveProviderDeploymentCompensationState({
      externalProviderApplySucceeded: true,
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: false
    })).toBe(true);

    const failed = transitionProviderDeploymentJob(job({
      status: "running",
      external_provider_apply_started: true
    }), "failed", {
      updatedAt: "2026-06-09T00:10:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: false,
      compensationRequired: true,
      safeSummary: { step: "failed", compensation: "required" }
    });
    expect(failed.compensation_required).toBe(true);
  });

  it("rejects applied jobs unless manual gate mark-used succeeded", () => {
    expect(() => transitionProviderDeploymentJob(job({
      status: "running",
      external_provider_apply_started: true
    }), "applied", {
      updatedAt: "2026-06-09T00:11:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: false
    })).toThrow(/mark-used success/);
  });

  it("rejects applied jobs without external provider apply started", () => {
    expect(() => transitionProviderDeploymentJob(job({ status: "running" }), "applied", {
      updatedAt: "2026-06-09T00:12:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: true
    })).toThrow(/external provider apply/);
  });

  it("rejects applied jobs without manual gate mark-used attempt", () => {
    expect(() => createProviderDeploymentJobStateRecord(job({
      status: "applied",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: false,
      manual_gate_mark_used_succeeded: true
    }))).toThrow(/attempted mark/);
  });

  it("rejects applied jobs when compensation is required", () => {
    expect(() => createProviderDeploymentJobStateRecord(job({
      status: "applied",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: true,
      compensation_required: true
    }))).toThrow(/compensation/);
  });

  it("requires running to applied transition to keep external provider apply started true", () => {
    const running = job({ status: "running", external_provider_apply_started: true });
    expect(transitionProviderDeploymentJob(running, "applied", {
      updatedAt: "2026-06-09T00:13:00.000Z",
      externalProviderApplyStarted: true,
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: true
    }).status).toBe("applied");

    expect(() => transitionProviderDeploymentJob(job({ status: "running" }), "applied", {
      updatedAt: "2026-06-09T00:14:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: true
    })).toThrow(/external provider apply/);
  });

  it("rejects invalid compensation-required combinations", () => {
    expect(() => createProviderDeploymentJobStateRecord(job({
      status: "running",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: false,
      compensation_required: true
    }))).toThrow(/failed status/);

    expect(() => createProviderDeploymentJobStateRecord(job({
      status: "failed",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: false,
      manual_gate_mark_used_succeeded: false,
      compensation_required: true
    }))).toThrow(/mark-used attempt/);

    expect(() => createProviderDeploymentJobStateRecord(job({
      status: "failed",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: true,
      compensation_required: true
    }))).toThrow(/mark-used failure/);
  });

  it("records normal failed and compensation failed states distinctly", () => {
    const normalFailed = transitionProviderDeploymentJob(job({ status: "running" }), "failed", {
      updatedAt: "2026-06-09T00:15:00.000Z",
      safeSummary: { failureClass: "normal" }
    });
    expect(normalFailed.compensation_required).toBe(false);
    expect(normalFailed.manual_gate_mark_used_attempted).toBe(false);

    const compensationFailed = transitionProviderDeploymentJob(job({
      status: "running",
      external_provider_apply_started: true
    }), "failed", {
      updatedAt: "2026-06-09T00:16:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: false,
      compensationRequired: true,
      safeSummary: { failureClass: "compensation" }
    });
    expect(compensationFailed.compensation_required).toBe(true);
    expect(compensationFailed.manual_gate_mark_used_attempted).toBe(true);
  });

  it("rejects unsafe audit summaries and raw target data", () => {
    expect(() => createProviderDeploymentJobAuditRecord({
      id: "provider-job-audit-1",
      job: job(),
      action: "provider_deployment.compensation.required",
      createdAt,
      safeSummary: { wallet: `0x${"1".repeat(40)}` }
    })).toThrow(/unsafe|safe_summary/);

    expect(() => createProviderDeploymentJobStateRecord(job({
      target: "https://private.example.test/deploy"
    }))).toThrow(/unsafe value/);
  });
});
