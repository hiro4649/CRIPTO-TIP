import { describe, expect, it } from "vitest";
import { InMemoryManualGateRegistry } from "./manual-gates.js";
import { makeManualGate, targetCommitSha } from "./manual-gates.test-support.js";
import {
  buildProviderDeploymentAuditEvidence,
  executeProviderDeploymentApply
} from "./provider-deployment.js";

const operation = {
  gateType: "provider_specific_deployment_apply" as const,
  dryRun: false,
  targetCommitSha,
  targetEnvironment: "production",
  rollbackPlanRef: "docs/RUNBOOK.md#provider-rollback",
  operatorRunbookRef: "docs/RUNBOOK.md#provider-apply",
  safeSummary: { provider: "provider_specific", changedResources: 2 }
};

describe("provider safe deployment apply boundary", () => {
  it("allows dry-run without manual gate", async () => {
    await expect(executeProviderDeploymentApply({
      operation: { ...operation, dryRun: true },
      productionLike: true,
      apply: async () => ({ status: "planned" as const, dryRun: true })
    })).resolves.toMatchObject({
      result: { status: "planned", dryRun: true },
      auditEvidence: { status: "planned", dryRun: true }
    });
  });

  it("requires approved manual gate and registry for production apply", async () => {
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualApproval: true,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/manual gate registry/);

    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    const gate = registry.approveGate("provider_specific_deployment_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: gate,
      apply: async () => ({ status: "applied" as const })
    })).resolves.toMatchObject({ result: { status: "applied" } });
    expect(registry.getGate(gate.gate_id)?.status).toBe("used");
  });

  it("rejects wrong gate type, commit, environment, expired gate, and used gate", async () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("dashboard_apply"));
    const wrongType = registry.approveGate("dashboard_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: wrongType,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/type/);

    const wrongCommit = makeManualGate("provider_specific_deployment_apply", { target_commit_sha: "1".repeat(40) });
    registry.createRequestedGate(wrongCommit);
    const wrongCommitApproved = registry.approveGate(wrongCommit.gate_id, "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: wrongCommitApproved,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/commit/);

    const wrongEnvironment = makeManualGate("provider_specific_deployment_apply", { target_environment: "staging" });
    registry.createRequestedGate(wrongEnvironment);
    const wrongEnvironmentApproved = registry.approveGate(wrongEnvironment.gate_id, "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: wrongEnvironmentApproved,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/environment/);

    const expired = makeManualGate("provider_specific_deployment_apply", { expires_at: "2026-01-01T00:00:00.000Z" });
    registry.createRequestedGate(expired);
    const expiredApproved = registry.approveGate(expired.gate_id, "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: expiredApproved,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/expired/);

    const reusable = makeManualGate("provider_specific_deployment_apply", { gate_id: "provider_specific_deployment_apply-gate-2" });
    registry.createRequestedGate(reusable);
    const approved = registry.approveGate(reusable.gate_id, "project-owner", "2026-06-05T01:00:00.000Z");
    registry.markUsed(approved.gate_id);
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: registry.getGate(approved.gate_id)!,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/not approved|used/);
  });

  it("does not mark gate used after provider failure", async () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    const gate = registry.approveGate("provider_specific_deployment_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({
      operation,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: gate,
      apply: async () => { throw new Error("provider unavailable"); }
    })).rejects.toThrow(/provider unavailable/);
    expect(registry.getGate(gate.gate_id)?.status).toBe("approved");
  });

  it("rejects unsafe apply result and requires rollback evidence", async () => {
    await expect(executeProviderDeploymentApply({
      operation,
      manualApproval: true,
      apply: async () => ({ status: "applied" as const, webhook_url: "redacted-url-placeholder" })
    })).rejects.toThrow(/unsafe field/);
    await expect(executeProviderDeploymentApply({
      operation: { ...operation, rollbackPlanRef: "" },
      manualApproval: true,
      apply: async () => ({ status: "applied" as const })
    })).rejects.toThrow(/rollback/);
  });

  it("builds secret-free audit evidence", () => {
    expect(buildProviderDeploymentAuditEvidence(operation)).toEqual({
      status: "applied",
      dryRun: false,
      gateType: "provider_specific_deployment_apply",
      targetEnvironment: "production",
      targetCommitSha,
      rollbackPlanRef: operation.rollbackPlanRef,
      operatorRunbookRef: operation.operatorRunbookRef,
      safeSummary: operation.safeSummary
    });
  });
});
