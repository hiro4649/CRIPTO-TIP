import { describe, expect, it } from "vitest";
import dashboardContract from "../../../../docs/youtube-dashboard-contract.json" with { type: "json" };
import {
  MockDashboardProvider,
  ProviderSpecificDashboardProvider,
  StubAlertRoutingProvider,
  assertDashboardCredentialBoundary,
  buildDashboardDeploymentPlan,
  buildDashboardRollbackPlan,
  deployDashboard,
  mapDashboardProviderErrorToOperatorAction
} from "./dashboard-deployment.js";
import { youtubeAlertConfigs } from "./deployment-observability.js";
import { youtubeMetricNames } from "./operations.js";
import { InMemoryManualGateRegistry } from "../manual-gates.js";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";

const credentials = { source: "secret_manager" as const, secretName: "projects/example/secrets/dashboard-provider" };

describe("dashboard exporter deployment boundary", () => {
  it("creates a dashboard deployment plan from the dashboard contract", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    expect(plan.title).toBe(dashboardContract.title);
    expect(plan.panels.map((panel) => panel.title)).toEqual(dashboardContract.panels.map((panel) => panel.title));
    expect(plan.panels.flatMap((panel) => panel.metrics).sort()).toEqual([...new Set(dashboardContract.panels.flatMap((panel) => panel.metrics))].sort());
    expect(plan.dryRun).toBe(true);
  });

  it("keeps dashboard panels referencing declared metrics only", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    for (const panel of plan.panels) {
      expect(panel.metrics.every((metric) => youtubeMetricNames.includes(metric))).toBe(true);
    }
  });

  it("keeps deployment plan metrics in parity with dashboard contract", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    expect([...new Set(plan.panels.flatMap((panel) => panel.metrics))].sort()).toEqual([...dashboardContract.metrics].sort());
  });

  it("keeps dashboard alert labels in parity with alert configs", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    expect(plan.alerts.map((alert) => alert.id).sort()).toEqual(youtubeAlertConfigs.map((alert) => alert.id).sort());
    expect(plan.alerts.every((alert) => alert.operatorAction.length > 0)).toBe(true);
  });

  it("runs dashboard export dry-run without manual approval", async () => {
    const provider = new MockDashboardProvider();
    const plan = buildDashboardDeploymentPlan({ credentials, dryRun: true });
    await expect(deployDashboard({ provider, plan })).resolves.toEqual({
      status: "planned",
      dryRun: true,
      panelCount: plan.panels.length,
      alertCount: plan.alerts.length
    });
    expect(provider.deployments).toHaveLength(1);
  });

  it("requires manual gate for apply", async () => {
    const provider = new MockDashboardProvider();
    const plan = buildDashboardDeploymentPlan({ credentials, dryRun: false });
    await expect(deployDashboard({ provider, plan })).rejects.toThrow(/manual approval/);
    await expect(deployDashboard({ provider, plan, manualApproval: true })).resolves.toMatchObject({ status: "applied", dryRun: false });
  });

  it("requires an approved dashboard_apply gate for production apply", async () => {
    const provider = new MockDashboardProvider();
    const registry = new InMemoryManualGateRegistry();
    const plan = buildDashboardDeploymentPlan({ credentials, dryRun: false });
    registry.createRequestedGate(makeManualGate("dashboard_apply"));
    const gate = registry.approveGate("dashboard_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(deployDashboard({ provider, plan, productionLike: true, targetCommitSha })).rejects.toThrow(/manual gate registry/);
    await expect(deployDashboard({ provider, plan, productionLike: true, targetCommitSha, targetEnvironment: "production", manualGate: gate })).rejects.toThrow(/manual gate registry/);
    await expect(deployDashboard({ provider, plan, productionLike: true, targetCommitSha, targetEnvironment: "production", manualApproval: true })).rejects.toThrow(/manual gate registry/);
    await expect(deployDashboard({
      provider,
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).resolves.toMatchObject({ status: "applied", dryRun: false });
    expect(registry.getGate("dashboard_apply-gate-1")?.status).toBe("used");
    await expect(deployDashboard({
      provider,
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: registry.getGate("dashboard_apply-gate-1")!
    })).rejects.toThrow(/not approved|already been used/);
  });

  it("does not mark dashboard gate used for dry-run or failed provider apply", async () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("dashboard_apply"));
    const gate = registry.approveGate("dashboard_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    const dryRunPlan = buildDashboardDeploymentPlan({ credentials, dryRun: true });
    await expect(deployDashboard({
      provider: new MockDashboardProvider(),
      plan: dryRunPlan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).resolves.toMatchObject({ status: "planned" });
    expect(registry.getGate("dashboard_apply-gate-1")?.status).toBe("approved");

    const failingProvider = { deploy: async () => { throw new Error("provider unavailable"); } };
    const applyPlan = buildDashboardDeploymentPlan({ credentials, dryRun: false });
    await expect(deployDashboard({
      provider: failingProvider,
      plan: applyPlan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).rejects.toThrow(/provider unavailable/);
    expect(registry.getGate("dashboard_apply-gate-1")?.status).toBe("approved");
  });

  it("rejects dashboard production gate with wrong target environment", async () => {
    const registry = new InMemoryManualGateRegistry();
    const plan = buildDashboardDeploymentPlan({ credentials, dryRun: false });
    registry.createRequestedGate(makeManualGate("dashboard_apply"));
    const gate = registry.approveGate("dashboard_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(deployDashboard({
      provider: new MockDashboardProvider(),
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "staging",
      manualGateRegistry: registry,
      manualGate: gate
    })).rejects.toThrow(/target environment/);
  });

  it("fails closed when dashboard provider credential is missing", () => {
    expect(() => assertDashboardCredentialBoundary({ source: "secret_manager" })).toThrow(/secret name/);
    expect(() => buildDashboardDeploymentPlan({ credentials: { source: "provider_specific", providerName: "example" }, productionLike: true })).toThrow(/secret name/);
  });

  it("supports provider-specific dashboard provider boundary without provider SDK dependency", async () => {
    const inner = new MockDashboardProvider();
    const provider = new ProviderSpecificDashboardProvider(inner, "example-dashboard-provider");
    const plan = buildDashboardDeploymentPlan({ credentials: { source: "provider_specific", secretName: "projects/example/secrets/dashboard-provider", providerName: "example" } });
    await expect(deployDashboard({ provider, plan })).resolves.toMatchObject({ status: "planned" });
    expect(inner.deployments).toHaveLength(1);
  });

  it.each([
    ["webhookUrl", "https://private.example.test/hook"],
    ["credentialRef", "projects/example/secrets/dashboard-provider"],
    ["walletAddress", `0x${"1".repeat(40)}`],
    ["rawMessage", "viewer raw message"]
  ])("strips dashboard provider result extra %s", async (field, value) => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    const provider = {
      deploy: async () => ({
        status: "planned" as const,
        dryRun: true,
        panelCount: plan.panels.length,
        alertCount: plan.alerts.length,
        [field]: value
      })
    };
    const result = await deployDashboard({ provider, plan });
    expect(Object.keys(result).sort()).toEqual(["alertCount", "dryRun", "panelCount", "status"]);
    expect(JSON.stringify(result)).not.toContain(String(value));
  });

  it("rejects dashboard provider result with non-finite panelCount", async () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    const provider = {
      deploy: async () => ({
        status: "planned" as const,
        dryRun: true,
        panelCount: Number.POSITIVE_INFINITY,
        alertCount: plan.alerts.length
      })
    };
    await expect(deployDashboard({ provider, plan })).rejects.toThrow(/panelCount/);
  });

  it("rejects dashboard provider result with negative alertCount", async () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    const provider = {
      deploy: async () => ({
        status: "planned" as const,
        dryRun: true,
        panelCount: plan.panels.length,
        alertCount: -1
      })
    };
    await expect(deployDashboard({ provider, plan })).rejects.toThrow(/alertCount/);
  });

  it("maps provider errors to operator actions", () => {
    expect(mapDashboardProviderErrorToOperatorAction(new Error("credential missing"))).toBe("verify_dashboard_provider_credentials");
    expect(mapDashboardProviderErrorToOperatorAction(new Error("manual approval is required"))).toBe("obtain_manual_deployment_approval");
    expect(mapDashboardProviderErrorToOperatorAction(new Error("provider unavailable"))).toBe("inspect_dashboard_provider_error");
  });

  it("builds a dashboard rollback plan", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    expect(buildDashboardRollbackPlan(plan)).toMatchObject({
      status: "ready",
      title: plan.title
    });
  });

  it("keeps alert routing provider as a stub and disables real external alert delivery", () => {
    const plan = buildDashboardDeploymentPlan({ credentials });
    const provider = new StubAlertRoutingProvider();
    expect(provider.planRoutes(plan.alerts)).toEqual({ status: "planned", routeCount: plan.alerts.length });
  });
});
