import { youtubeAlertConfigs, type YouTubeAlertConfig, type YouTubeAlertId } from "./deployment-observability.js";
import type { YouTubeMetricName } from "./operations.js";

export type AlertCredentialSource = "secret_manager" | "provider_specific";

export type AlertCredentialReference = {
  source: AlertCredentialSource;
  secretName?: string;
  providerName?: string;
};

export type AlertDeliveryPayload = {
  alertId: YouTubeAlertId;
  metric: YouTubeMetricName;
  severity: "warning" | "critical";
  operatorAction: string;
  labels: Record<string, string>;
};

export type AlertDeliveryPlan = {
  provider: string;
  credentialSource: AlertCredentialSource;
  dryRun: boolean;
  payloads: AlertDeliveryPayload[];
};

export type AlertDeliveryResult = {
  status: "planned" | "delivered";
  dryRun: boolean;
  deliveredCount: number;
};

export interface ExternalAlertProvider {
  deliver(plan: AlertDeliveryPlan, options: { dryRun: boolean; manualApproval: boolean }): Promise<AlertDeliveryResult>;
}

export class MockExternalAlertProvider implements ExternalAlertProvider {
  readonly deliveries: AlertDeliveryPlan[] = [];

  async deliver(plan: AlertDeliveryPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!options.dryRun && !options.manualApproval) throw new Error("manual approval is required for external alert delivery apply");
    this.deliveries.push({
      ...plan,
      payloads: plan.payloads.map((payload) => ({ ...payload, labels: { ...payload.labels } }))
    });
    return {
      status: options.dryRun ? "planned" as const : "delivered" as const,
      dryRun: options.dryRun,
      deliveredCount: plan.payloads.length
    };
  }
}

export class ProviderSpecificAlertProvider implements ExternalAlertProvider {
  constructor(private readonly provider: ExternalAlertProvider, private readonly providerName: string) {}

  async deliver(plan: AlertDeliveryPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!this.providerName) throw new Error("alert provider name is required");
    return this.provider.deliver(plan, options);
  }
}

export function assertAlertCredentialBoundary(credentials: AlertCredentialReference, productionLike = false) {
  if (productionLike && credentials.source !== "secret_manager" && credentials.source !== "provider_specific") {
    throw new Error("production alert provider credentials must use secret_manager or provider_specific source");
  }
  if (!credentials.secretName) throw new Error("alert provider credential secret name is required");
  return credentials;
}

export function buildAlertDeliveryPlan(args: {
  credentials: AlertCredentialReference;
  alertConfigs?: YouTubeAlertConfig[];
  dryRun?: boolean;
  labels?: Record<string, string>;
  productionLike?: boolean;
}): AlertDeliveryPlan {
  const credentials = assertAlertCredentialBoundary(args.credentials, args.productionLike);
  const alertConfigs = args.alertConfigs ?? youtubeAlertConfigs;
  return {
    provider: credentials.providerName ?? credentials.source,
    credentialSource: credentials.source,
    dryRun: args.dryRun ?? true,
    payloads: alertConfigs.map((alert) => buildSafeAlertPayload(alert, args.labels))
  };
}

export async function deliverExternalAlerts(args: {
  provider: ExternalAlertProvider;
  plan: AlertDeliveryPlan;
  manualApproval?: boolean;
}) {
  return args.provider.deliver(args.plan, { dryRun: args.plan.dryRun, manualApproval: args.manualApproval === true });
}

export function buildAlertDeliveryRollbackPlan(plan: AlertDeliveryPlan) {
  return {
    status: "ready" as const,
    steps: [
      "disable_external_alert_route",
      "verify_dashboard_alerts_still_visible",
      "rotate_alert_provider_credential_if_needed",
      "record_operator_review"
    ],
    provider: plan.provider,
    alertCount: plan.payloads.length
  };
}

export function mapAlertProviderErrorToOperatorAction(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/credential|secret|auth|token|webhook/i.test(message)) return "verify_alert_provider_credentials";
  if (/manual approval/i.test(message)) return "obtain_manual_alert_delivery_approval";
  if (/rate|quota|limit/i.test(message)) return "inspect_alert_provider_rate_limits";
  return "inspect_alert_provider_error";
}

function buildSafeAlertPayload(alert: YouTubeAlertConfig, labels: Record<string, string> = {}): AlertDeliveryPayload {
  return {
    alertId: alert.id,
    metric: alert.metric,
    severity: alert.id === "auth_failure" || alert.id === "quota_exceeded" ? "critical" : "warning",
    operatorAction: alert.operatorAction,
    labels: sanitizeAlertLabels(labels)
  };
}

function sanitizeAlertLabels(labels: Record<string, string>) {
  const unsafeKeys = /wallet|address|token|secret|api[_-]?key|oauth|message|display[_-]?name|youtube[_-]?id|url/i;
  return Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => !unsafeKeys.test(key))
      .map(([key, value]) => [
        key.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
        String(value).replace(/[\r\n]/g, " ").slice(0, 120)
      ])
  );
}
