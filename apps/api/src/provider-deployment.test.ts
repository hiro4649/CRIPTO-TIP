import { describe, expect, it } from "vitest";
import { InMemoryManualGateRegistry } from "./manual-gates.js";
import { makeManualGate, targetCommitSha } from "./manual-gates.test-support.js";
import {
  MockProviderDeploymentApply,
  ProviderSpecificDeploymentApply,
  assertProviderDeploymentPlanSafety,
  executeProviderDeploymentApply,
  type ProviderDeploymentApplyPlan
} from "./provider-deployment.js";

const plan: ProviderDeploymentApplyPlan = {
  operation: "provider_specific_deployment_apply",
  target: "provider-safe-deployment",
  dryRun: true,
  credentialSource: "secret_manager",
  credentialRef: "projects/example/secrets/provider-credential",
  rollbackPlanRef: "docs/PROVIDER_SAFE_DEPLOYMENT.md#rollback",
  operatorRunbookRef: "docs/RUNBOOK.md#provider-safe-deployment",
  safeSummary: { target: "provider-safe-deployment", changedRoutes: 1 }
};

describe("provider-safe deployment apply boundary", () => {
  it("runs dry-run without a manual gate", async () => {
    const provider = new MockProviderDeploymentApply();
    await expect(executeProviderDeploymentApply({ provider, plan })).resolves.toMatchObject({
      status: "planned",
      dryRun: true,
      operation: "provider_specific_deployment_apply"
    });
    expect(provider.applications).toHaveLength(1);
  });

  it("requires approved manual gate and registry for production apply", async () => {
    const provider = new MockProviderDeploymentApply();
    const applyPlan = { ...plan, dryRun: false };
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    const gate = registry.approveGate("provider_specific_deployment_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");

    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualApproval: true, targetCommitSha })).rejects.toThrow(/manual gate registry/);
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGate: gate, targetCommitSha })).rejects.toThrow(/manual gate registry/);
    await expect(executeProviderDeploymentApply({
      provider,
      plan: applyPlan,
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: gate,
      targetCommitSha,
      targetEnvironment: "production"
    })).resolves.toMatchObject({ status: "applied", dryRun: false });
    expect(registry.getGate("provider_specific_deployment_apply-gate-1")?.status).toBe("used");
  });

  it("rejects wrong gate type, commit, environment, expired gate, and used gate", async () => {
    const provider = new MockProviderDeploymentApply();
    const applyPlan = { ...plan, dryRun: false };
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("dashboard_apply"));
    const wrongType = registry.approveGate("dashboard_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: registry, manualGate: wrongType, targetCommitSha, targetEnvironment: "production" })).rejects.toThrow(/type/);

    const wrongCommitRegistry = new InMemoryManualGateRegistry();
    wrongCommitRegistry.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    const gate = wrongCommitRegistry.approveGate("provider_specific_deployment_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: wrongCommitRegistry, manualGate: gate, targetCommitSha: "0".repeat(40), targetEnvironment: "production" })).rejects.toThrow(/target commit/);
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: wrongCommitRegistry, manualGate: gate, targetCommitSha, targetEnvironment: "staging" })).rejects.toThrow(/target environment/);
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: wrongCommitRegistry, manualGate: gate, targetCommitSha, targetEnvironment: "production", now: new Date("2099-01-01T00:00:00.000Z") })).rejects.toThrow(/expired/);

    await executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: wrongCommitRegistry, manualGate: gate, targetCommitSha, targetEnvironment: "production" });
    await expect(executeProviderDeploymentApply({ provider, plan: applyPlan, productionLike: true, manualGateRegistry: wrongCommitRegistry, manualGate: wrongCommitRegistry.getGate("provider_specific_deployment_apply-gate-1"), targetCommitSha, targetEnvironment: "production" })).rejects.toThrow(/not approved|already been used/);
  });

  it("does not mark gate used when provider apply fails", async () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    const gate = registry.approveGate("provider_specific_deployment_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    const failingProvider = { apply: async () => { throw new Error("provider unavailable"); } };
    await expect(executeProviderDeploymentApply({
      provider: failingProvider,
      plan: { ...plan, dryRun: false },
      productionLike: true,
      manualGateRegistry: registry,
      manualGate: gate,
      targetCommitSha,
      targetEnvironment: "production"
    })).rejects.toThrow(/provider unavailable/);
    expect(registry.getGate("provider_specific_deployment_apply-gate-1")?.status).toBe("approved");
  });

  it("fails closed on unsafe evidence and returns safe summaries only", async () => {
    expect(() => assertProviderDeploymentPlanSafety({ ...plan, credentialRef: "https://private.example.test/hook" })).toThrow(/reference/);
    expect(() => assertProviderDeploymentPlanSafety({ ...plan, safeSummary: { wallet: `0x${"1".repeat(40)}` } })).toThrow(/unsafe/);

    const provider = new ProviderSpecificDeploymentApply(new MockProviderDeploymentApply(), "example-provider");
    const result = await executeProviderDeploymentApply({ provider, plan });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/projects\/example\/secrets|https?:\/\/|0x[0-9a-fA-F]{40}|webhook|raw_message|display_name/i);
    expect(result.rollbackPlanRef).toContain("PROVIDER_SAFE_DEPLOYMENT");
    expect(result.operatorRunbookRef).toContain("RUNBOOK");
  });
});
