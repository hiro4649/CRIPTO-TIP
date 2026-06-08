import { describe, expect, it } from "vitest";
import { targetCommitSha } from "../manual-gates.test-support.js";
import type { ProviderDeploymentJobStateRecord } from "../provider-deployment-job-state.js";
import { InMemoryProviderDeploymentJobRepository } from "./provider-deployment-job-repository.js";

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

describe("provider deployment job repository", () => {
  it("rejects duplicate job ids", () => {
    const repository = new InMemoryProviderDeploymentJobRepository();
    repository.createJob(job());
    expect(() => repository.createJob(job())).toThrow(/already exists/);
  });

  it("records transition audit safely", () => {
    const repository = new InMemoryProviderDeploymentJobRepository();
    repository.createJob(job());
    repository.transitionJob("provider-job-1", "running", {
      updatedAt: "2026-06-09T00:01:00.000Z",
      externalProviderApplyStarted: true,
      safeSummary: { step: "running" }
    });
    const audits = repository.listAudits();
    expect(audits.map((audit) => audit.action)).toEqual([
      "provider_deployment.job.planned",
      "provider_deployment.job.running"
    ]);
    expect(JSON.stringify(audits)).not.toMatch(/Bearer|https?:\/\/|0x[0-9a-fA-F]{40}|raw_message|display_name/i);
  });

  it("records compensation required audit without marking the job applied", () => {
    const repository = new InMemoryProviderDeploymentJobRepository();
    repository.createJob(job({ status: "planned" }));
    repository.transitionJob("provider-job-1", "running", {
      updatedAt: "2026-06-09T00:01:00.000Z",
      externalProviderApplyStarted: true
    });
    const failed = repository.transitionJob("provider-job-1", "failed", {
      updatedAt: "2026-06-09T00:02:00.000Z",
      manualGateMarkUsedAttempted: true,
      manualGateMarkUsedSucceeded: false,
      compensationRequired: true,
      safeSummary: { step: "failed", compensation: "required" }
    });
    expect(failed.status).toBe("failed");
    expect(failed.compensation_required).toBe(true);
    expect(repository.listAudits().map((audit) => audit.action)).toContain("provider_deployment.compensation.required");
  });

  it("rejects duplicate transition audit ids", () => {
    const repository = new InMemoryProviderDeploymentJobRepository();
    repository.createJob(job());
    const audit = repository.listAudits()[0];
    if (!audit) throw new Error("expected planned audit");
    expect(() => repository.appendAudit(audit)).toThrow(/already exists/);
  });
});
