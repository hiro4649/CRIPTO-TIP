import { describe, expect, it } from "vitest";
import { buildYouTubeDashboardContract, buildYouTubeMetricsSnapshot } from "./deployment-observability.js";
import {
  MockObservabilityExporter,
  buildAlertMetricLabels,
  buildOpenTelemetryCompatibleMetrics,
  buildYouTubeMetricPoints,
  formatPrometheusMetricPoint,
  ingestManualLiveYouTubeSoakResult,
  mapYouTubeAlertsToExporterLabels,
  publishYouTubeMetricsSnapshot
} from "./observability-exporter.js";
import { youtubeMetricNames, type YouTubeMetricName } from "./operations.js";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";

describe("YouTube observability exporter integration boundary", () => {
  const snapshot = buildYouTubeMetricsSnapshot({
    youtube_connector_connected: 1,
    youtube_events_per_minute: 12,
    youtube_quota_errors_total: 1,
    youtube_rate_limit_errors_total: 1,
    youtube_auth_errors_total: 1,
    youtube_invalid_page_token_total: 1,
    youtube_live_chat_id_missing_total: 1,
    youtube_stream_reconnect_total: 5,
    youtube_list_fallback_total: 3,
    youtube_verification_code_failed_total: 5
  });

  it("publishes every YouTube metric to the mock exporter", async () => {
    const exporter = new MockObservabilityExporter();
    const result = await publishYouTubeMetricsSnapshot({
      exporter,
      snapshot,
      labels: { stream_id: "stream_1", env: "test" }
    });
    expect(result).toEqual({ status: "published", count: youtubeMetricNames.length });
    expect(exporter.published).toHaveLength(1);
    const published = exporter.published[0] ?? [];
    expect(published.map((point) => point.name).sort()).toEqual([...youtubeMetricNames].sort());
    expect(published[0]?.labels).toMatchObject({ stream_id: "stream_1", env: "test" });
  });

  it("formats Prometheus-compatible metric output", () => {
    const point = buildYouTubeMetricPoints(snapshot, { "stream-id": "stream_1", env: "prod" })[0];
    expect(point).toBeDefined();
    if (!point) throw new Error("expected metric point");
    expect(formatPrometheusMetricPoint(point)).toBe('youtube_connector_connected{env="prod",stream_id="stream_1"} 1');
  });

  it("builds OpenTelemetry-compatible metric output", () => {
    const output = buildOpenTelemetryCompatibleMetrics(buildYouTubeMetricPoints(snapshot, { stream_id: "stream_1" }, "opentelemetry"));
    expect(output).toHaveLength(youtubeMetricNames.length);
    expect(output.find((metric) => metric.name === "youtube_events_per_minute")).toEqual({
      name: "youtube_events_per_minute",
      value: 12,
      attributes: { stream_id: "stream_1" }
    });
  });

  it("keeps dashboard contract metrics in parity with exporter output", () => {
    const dashboard = buildYouTubeDashboardContract();
    const exported = buildYouTubeMetricPoints(snapshot).map((point) => point.name);
    expect(dashboard.metrics.sort()).toEqual(exported.sort());
    for (const panel of dashboard.panels) {
      expect(panel.metrics.every((metric) => exported.includes(metric as YouTubeMetricName))).toBe(true);
    }
  });

  it("keeps alert routing labels in parity with alert configs", () => {
    const labels = mapYouTubeAlertsToExporterLabels(snapshot, true, { stream_id: "stream_1" });
    expect(labels.map((entry) => entry.alert.id).sort()).toEqual(
      [
        "auth_failure",
        "invalid_page_token",
        "list_fallback_spike",
        "live_chat_id_missing",
        "quota_exceeded",
        "rate_limit_exceeded",
        "stream_reconnect_storm",
        "verification_failure_spike"
      ].sort()
    );
    expect(labels.every((entry) => entry.labels.stream_id === "stream_1")).toBe(true);
    expect(labels.every((entry) => entry.labels.source_metric === entry.alert.metric)).toBe(true);
  });

  it.each([
    ["quota_exceeded", "youtube_quota_errors_total"],
    ["rate_limit_exceeded", "youtube_rate_limit_errors_total"],
    ["auth_failure", "youtube_auth_errors_total"],
    ["invalid_page_token", "youtube_invalid_page_token_total"],
    ["live_chat_id_missing", "youtube_live_chat_id_missing_total"],
    ["stream_reconnect_storm", "youtube_stream_reconnect_total"],
    ["list_fallback_spike", "youtube_list_fallback_total"],
    ["zero_events_while_live", "youtube_events_per_minute"],
    ["verification_failure_spike", "youtube_verification_code_failed_total"]
  ] as const)("exports labels for %s alert", (alertId, metricName) => {
    const labels = buildAlertMetricLabels({
      id: alertId,
      metric: metricName,
      threshold: alertId === "zero_events_while_live" ? 0 : 1,
      windowMinutes: 5,
      operatorAction: "operator_action"
    });
    expect(labels).toMatchObject({
      alert_id: alertId,
      source_metric: metricName,
      operator_action: "operator_action"
    });
  });

  it("exports zero-events-while-live alert only for live streams", () => {
    const zeroEvents = buildYouTubeMetricsSnapshot({ youtube_events_per_minute: 0 });
    expect(mapYouTubeAlertsToExporterLabels(zeroEvents, true).some((entry) => entry.alert.id === "zero_events_while_live")).toBe(true);
    expect(mapYouTubeAlertsToExporterLabels(zeroEvents, false).some((entry) => entry.alert.id === "zero_events_while_live")).toBe(false);
  });

  it("ingests manual live soak results only through the explicit managed credential gate", () => {
    expect(ingestManualLiveYouTubeSoakResult({ env: {} })).toEqual({
      status: "skipped",
      reason: "manual_live_youtube_soak_disabled",
      safeSummary: "manual live YouTube soak skipped"
    });
    expect(ingestManualLiveYouTubeSoakResult({ env: { RUN_LIVE_YOUTUBE_SOAK_TESTS: "true", YOUTUBE_CREDENTIAL_SOURCE: "local_env" } }).status).toBe("skipped");
    expect(
      ingestManualLiveYouTubeSoakResult({
        env: {
          RUN_LIVE_YOUTUBE_SOAK_TESTS: "true",
          YOUTUBE_CREDENTIAL_SOURCE: "secret_manager",
          YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key",
          targetCommitSha,
          targetEnvironment: "production",
          manualGate: makeManualGate("youtube_live_soak")
        },
        observedEvents: 7,
        durationSeconds: 60
      })
    ).toMatchObject({
      status: "pass",
      reason: "manual_live_youtube_soak_result_ingested",
      observedEvents: 7,
      durationSeconds: 60
    });
  });
});
