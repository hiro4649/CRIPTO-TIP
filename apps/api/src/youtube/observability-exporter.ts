import { evaluateYouTubeAlerts, type YouTubeAlertConfig, type YouTubeMetricsSnapshot } from "./deployment-observability.js";
import { createManualLiveYouTubeSoakPlan, youtubeMetricNames, type YouTubeMetricName } from "./operations.js";

export type ObservabilityMetricFormat = "prometheus" | "opentelemetry";

export type ObservabilityMetricPoint = {
  name: YouTubeMetricName;
  value: number;
  labels: Record<string, string>;
  format: ObservabilityMetricFormat;
};

export type ObservabilityPublishResult = {
  status: "published";
  count: number;
};

export interface ObservabilityExporter {
  publish(points: ObservabilityMetricPoint[]): Promise<ObservabilityPublishResult>;
}

export class MockObservabilityExporter implements ObservabilityExporter {
  readonly published: ObservabilityMetricPoint[][] = [];

  async publish(points: ObservabilityMetricPoint[]) {
    this.published.push(points.map((point) => ({ ...point, labels: { ...point.labels } })));
    return { status: "published" as const, count: points.length };
  }
}

export function buildYouTubeMetricPoints(snapshot: YouTubeMetricsSnapshot, labels: Record<string, string> = {}, format: ObservabilityMetricFormat = "prometheus"): ObservabilityMetricPoint[] {
  return youtubeMetricNames.map((name) => ({
    name,
    value: snapshot[name],
    labels: sanitizeMetricLabels(labels),
    format
  }));
}

export async function publishYouTubeMetricsSnapshot(args: {
  exporter: ObservabilityExporter;
  snapshot: YouTubeMetricsSnapshot;
  labels?: Record<string, string>;
  format?: ObservabilityMetricFormat;
}) {
  return args.exporter.publish(buildYouTubeMetricPoints(args.snapshot, args.labels, args.format));
}

export function formatPrometheusMetricPoint(point: ObservabilityMetricPoint) {
  const labels = Object.entries(point.labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${sanitizePrometheusLabelName(key)}="${escapePrometheusLabelValue(value)}"`)
    .join(",");
  return labels ? `${point.name}{${labels}} ${point.value}` : `${point.name} ${point.value}`;
}

export function buildOpenTelemetryCompatibleMetrics(points: ObservabilityMetricPoint[]) {
  return points.map((point) => ({
    name: point.name,
    value: point.value,
    attributes: { ...point.labels }
  }));
}

export function buildAlertMetricLabels(alert: YouTubeAlertConfig, baseLabels: Record<string, string> = {}) {
  return sanitizeMetricLabels({
    ...baseLabels,
    alert_id: alert.id,
    operator_action: alert.operatorAction,
    source_metric: alert.metric
  });
}

export function mapYouTubeAlertsToExporterLabels(snapshot: YouTubeMetricsSnapshot, live: boolean, baseLabels: Record<string, string> = {}) {
  return evaluateYouTubeAlerts(snapshot, live).map((alert) => ({
    alert,
    labels: buildAlertMetricLabels(alert, baseLabels)
  }));
}

export function ingestManualLiveYouTubeSoakResult(args: {
  env: {
    RUN_LIVE_YOUTUBE_SOAK_TESTS?: string;
    YOUTUBE_CREDENTIAL_SOURCE?: string;
    YOUTUBE_API_KEY_SECRET_NAME?: string;
    YOUTUBE_OAUTH_TOKEN_SECRET_NAME?: string;
  };
  observedEvents?: number;
  durationSeconds?: number;
  status?: "pass" | "fail";
}) {
  const plan = createManualLiveYouTubeSoakPlan(args.env);
  if (plan.status !== "ready") {
    return {
      status: "skipped" as const,
      reason: plan.reason,
      safeSummary: "manual live YouTube soak skipped"
    };
  }
  return {
    status: args.status ?? "pass",
    reason: "manual_live_youtube_soak_result_ingested",
    observedEvents: args.observedEvents ?? 0,
    durationSeconds: args.durationSeconds ?? 0,
    safeSummary: "manual live YouTube soak result ingested without credential values"
  };
}

function sanitizeMetricLabels(labels: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [
      sanitizePrometheusLabelName(key),
      String(value).replace(/[\r\n]/g, " ").slice(0, 120)
    ])
  );
}

function sanitizePrometheusLabelName(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[a-zA-Z_]/.test(sanitized) ? sanitized : `label_${sanitized}`;
}

function escapePrometheusLabelValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
