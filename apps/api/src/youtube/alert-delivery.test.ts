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

  it("does not expose credential secret names in rollback plans", () => {
    const plan = buildAlertDeliveryPlan({ credentials, dryRun: false });
    const rollbackPlan = buildAlertDeliveryRollbackPlan(plan);
    expect(JSON.stringify(rollbackPlan)).not.toContain(credentials.secretName);
  });
});
