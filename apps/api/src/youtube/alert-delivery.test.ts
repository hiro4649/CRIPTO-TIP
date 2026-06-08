import { describe, expect, it } from "vitest";
import dashboardContract from "../../../../docs/youtube-dashboard-contract.json" with { type: "json" };
import {
  MockExternalAlertProvider,
  ProviderSpecificAlertProvider,
  assertAlertCredentialBoundary,
  buildAlertDeliveryPlan,
  buildAlertDeliveryRollbackPlan,
  deliverExternalAlerts,
  mapAlertProviderErrorToOperatorAction
} from "./alert-delivery.js";
import { youtubeAlertConfigs } from "./deployment-observability.js";
import { youtubeMetricNames } from "./operations.js";
import { InMemoryManualGateRegistry } from "../manual-gates.js";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";

const credentials = { source: "secret_manager" as const, secretName: "projects/example/secrets/alert-provider" };

describe("external alert delivery integration boundary", () => {
  it("creates an alert delivery plan from alert routing config", () => {
    const plan = buildAlertDeliveryPlan({ credentials, labels: { stream_id: "stream_1" } });
    expect(plan.dryRun).toBe(true);
    expect(plan.payloads.map((payload) => payload.alertId).sort()).toEqual(youtubeAlertConfigs.map((alert) => alert.id).sort());
    expect(plan.payloads.every((payload) => payload.labels.stream_id === "stream_1")).toBe(true);
  });

  it("keeps alert delivery plan in parity with dashboard alert contract", () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    expect(plan.payloads.map((payload) => payload.alertId).sort()).toEqual([...dashboardContract.alerts].sort());
  });

  it("keeps alert payload metrics declared", () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    expect(plan.payloads.every((payload) => youtubeMetricNames.includes(payload.metric))).toBe(true);
  });

  it("runs alert delivery dry-run without manual approval", async () => {
    const provider = new MockExternalAlertProvider();
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: true });
    await expect(deliverExternalAlerts({ provider, plan })).resolves.toEqual({
      status: "planned",
      dryRun: true,
      deliveredCount: plan.payloads.length
    });
    expect(provider.deliveries).toHaveLength(1);
  });

  it("requires manual gate for alert apply", async () => {
    const provider = new MockExternalAlertProvider();
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    await expect(deliverExternalAlerts({ provider, plan })).rejects.toThrow(/manual approval/);
    await expect(deliverExternalAlerts({ provider, plan, manualApproval: true })).resolves.toMatchObject({ status: "delivered", dryRun: false });
  });

  it("requires an approved external_alert_apply gate for production apply", async () => {
    const provider = new MockExternalAlertProvider();
    const registry = new InMemoryManualGateRegistry();
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    registry.createRequestedGate(makeManualGate("external_alert_apply"));
    const gate = registry.approveGate("external_alert_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(deliverExternalAlerts({ provider, plan, productionLike: true, targetCommitSha })).rejects.toThrow(/manual gate registry/);
    await expect(deliverExternalAlerts({ provider, plan, productionLike: true, targetCommitSha, targetEnvironment: "production", manualGate: gate })).rejects.toThrow(/manual gate registry/);
    await expect(deliverExternalAlerts({ provider, plan, productionLike: true, targetCommitSha, targetEnvironment: "production", manualApproval: true })).rejects.toThrow(/manual gate registry/);
    await expect(deliverExternalAlerts({
      provider,
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).resolves.toMatchObject({ status: "delivered", dryRun: false });
    expect(registry.getGate("external_alert_apply-gate-1")?.status).toBe("used");
    await expect(deliverExternalAlerts({
      provider,
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: registry.getGate("external_alert_apply-gate-1")!
    })).rejects.toThrow(/not approved|already been used/);
  });

  it("does not mark external alert gate used for dry-run or failed provider apply", async () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("external_alert_apply"));
    const gate = registry.approveGate("external_alert_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    const dryRunPlan = buildAlertDeliveryPlan({ credentials, dryRun: true });
    await expect(deliverExternalAlerts({
      provider: new MockExternalAlertProvider(),
      plan: dryRunPlan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).resolves.toMatchObject({ status: "planned" });
    expect(registry.getGate("external_alert_apply-gate-1")?.status).toBe("approved");

    const failingProvider = { deliver: async () => { throw new Error("provider unavailable"); } };
    const applyPlan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    await expect(deliverExternalAlerts({
      provider: failingProvider,
      plan: applyPlan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "production",
      manualGateRegistry: registry,
      manualGate: gate
    })).rejects.toThrow(/provider unavailable/);
    expect(registry.getGate("external_alert_apply-gate-1")?.status).toBe("approved");
  });

  it("rejects external alert production gate with wrong target environment", async () => {
    const registry = new InMemoryManualGateRegistry();
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    registry.createRequestedGate(makeManualGate("external_alert_apply"));
    const gate = registry.approveGate("external_alert_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    await expect(deliverExternalAlerts({
      provider: new MockExternalAlertProvider(),
      plan,
      productionLike: true,
      targetCommitSha,
      targetEnvironment: "staging",
      manualGateRegistry: registry,
      manualGate: gate
    })).rejects.toThrow(/target environment/);
  });

  it("fails closed when alert provider credential is missing", () => {
    expect(() => assertAlertCredentialBoundary({ source: "secret_manager" })).toThrow(/secret name/);
    expect(() => buildAlertDeliveryPlan({ credentials: { source: "provider_specific", providerName: "example" }, productionLike: true })).toThrow(/secret name/);
  });

  it("supports provider-specific alert provider boundary without provider SDK dependency", async () => {
    const inner = new MockExternalAlertProvider();
    const provider = new ProviderSpecificAlertProvider(inner, "example-alert-provider");
    const plan = buildAlertDeliveryPlan({ credentials: { source: "provider_specific", secretName: "projects/example/secrets/alert-provider", providerName: "example" } });
    await expect(deliverExternalAlerts({ provider, plan })).resolves.toMatchObject({ status: "planned" });
    expect(inner.deliveries).toHaveLength(1);
  });

  it("excludes secrets and raw user data from alert payload labels", () => {
    const plan = buildAlertDeliveryPlan({
      credentials,
      labels: {
        stream_id: "stream_1",
        wallet_address: "0x1111111111111111111111111111111111111111",
        oauth_token: "redacted-token-placeholder",
        api_key: "redacted-api-key-placeholder",
        raw_message: "hello",
        display_name_raw: "viewer",
        private_url: "https://private.example.test"
      }
    });
    const serialized = JSON.stringify(plan.payloads);
    expect(serialized).toContain("stream_1");
    expect(serialized).not.toMatch(/0x1111111111111111111111111111111111111111|oauth|api_key|raw_message|display_name|private\.example/i);
  });

  it("redacts unsafe values while keeping safe stream and environment labels", () => {
    const wallet = `0x${"2".repeat(40)}`;
    const githubLikeToken = ["ghp", "example"].join("_");
    const openAiLikeToken = ["sk", "example"].join("-");
    const slackLikeToken = ["xoxb", "1", "example"].join("-");
    const awsLikeToken = ["AKIA", "1234567890ABCDEF"].join("");
    const bearerToken = ["Bearer", "abc.def"].join(" ");
    const privateUrl = ["https://", "private.example.test/path"].join("");
    const plan = buildAlertDeliveryPlan({
      credentials,
      labels: {
        stream_id: "stream_1",
        environment: "production",
        alert_context: [wallet, githubLikeToken, openAiLikeToken, slackLikeToken, awsLikeToken, bearerToken, "oauth", "api_key", "secret", "token", "private", privateUrl].join(" ")
      }
    });
    const labels = plan.payloads[0]?.labels ?? {};
    expect(labels.stream_id).toBe("stream_1");
    expect(labels.environment).toBe("production");
    expect(JSON.stringify(labels)).not.toContain(wallet);
    expect(JSON.stringify(labels)).not.toContain(githubLikeToken);
    expect(JSON.stringify(labels)).not.toContain(openAiLikeToken);
    expect(JSON.stringify(labels)).not.toContain(slackLikeToken);
    expect(JSON.stringify(labels)).not.toContain(awsLikeToken);
    expect(JSON.stringify(labels)).not.toContain("abc.def");
    expect(JSON.stringify(labels)).not.toMatch(/oauth|api_key|secret|token|private|https:\/\/private/i);
    expect(labels.alert_context).toContain("[redacted]");
  });

  it("maps alert severity for critical operator targets", () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    expect(plan.payloads.find((payload) => payload.alertId === "auth_failure")?.severity).toBe("critical");
    expect(plan.payloads.find((payload) => payload.alertId === "quota_exceeded")?.severity).toBe("critical");
    expect(plan.payloads.find((payload) => payload.alertId === "list_fallback_spike")?.severity).toBe("warning");
  });

  it("maps provider errors to operator actions", () => {
    expect(mapAlertProviderErrorToOperatorAction(new Error("credential missing"))).toBe("verify_alert_provider_credentials");
    expect(mapAlertProviderErrorToOperatorAction(new Error("manual approval required"))).toBe("obtain_manual_alert_delivery_approval");
    expect(mapAlertProviderErrorToOperatorAction(new Error("rate limit"))).toBe("inspect_alert_provider_rate_limits");
    expect(mapAlertProviderErrorToOperatorAction(new Error("provider unavailable"))).toBe("inspect_alert_provider_error");
  });

  it("builds an alert delivery rollback and disable plan", () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    expect(buildAlertDeliveryRollbackPlan(plan)).toMatchObject({
      status: "ready",
      provider: "secret_manager",
      alertCount: plan.payloads.length
    });
  });

  it("keeps real external alert delivery disabled without manual gate", async () => {
    const provider = new ProviderSpecificAlertProvider(new MockExternalAlertProvider(), "example-alert-provider");
    const plan = buildAlertDeliveryPlan({ credentials: { source: "provider_specific", secretName: "projects/example/secrets/alert-provider", providerName: "example" }, dryRun: false });
    await expect(deliverExternalAlerts({ provider, plan })).rejects.toThrow(/manual approval/);
  });

  it.each([
    ["webhookUrl", "https://private.example.test/hook"],
    ["credentialRef", "projects/example/secrets/alert-provider"],
    ["walletAddress", `0x${"1".repeat(40)}`],
    ["rawMessage", "viewer raw message"]
  ])("strips external alert provider result extra %s", async (field, value) => {
    const plan = buildAlertDeliveryPlan({ credentials });
    const provider = {
      deliver: async () => ({
        status: "planned" as const,
        dryRun: true,
        deliveredCount: plan.payloads.length,
        [field]: value
      })
    };
    const result = await deliverExternalAlerts({ provider, plan });
    expect(Object.keys(result).sort()).toEqual(["deliveredCount", "dryRun", "status"]);
    expect(JSON.stringify(result)).not.toContain(String(value));
  });

  it("rejects external alert provider result with non-finite deliveredCount", async () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    const provider = {
      deliver: async () => ({
        status: "planned" as const,
        dryRun: true,
        deliveredCount: Number.NaN
      })
    };
    await expect(deliverExternalAlerts({ provider, plan })).rejects.toThrow(/deliveredCount/);
  });

  it("rejects external alert provider result with negative deliveredCount", async () => {
    const plan = buildAlertDeliveryPlan({ credentials });
    const provider = {
      deliver: async () => ({
        status: "planned" as const,
        dryRun: true,
        deliveredCount: -1
      })
    };
    await expect(deliverExternalAlerts({ provider, plan })).rejects.toThrow(/deliveredCount/);
  });

  it("does not expose credential secret names in rollback plans", () => {
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    const rollbackPlan = buildAlertDeliveryRollbackPlan(plan);
    expect(JSON.stringify(rollbackPlan)).not.toContain(credentials.secretName);
  });
});
