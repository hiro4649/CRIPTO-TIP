import { describe, expect, it } from "vitest";
import { buildYouTubeDashboardContract, buildYouTubeMetricsSnapshot, evaluateYouTubeAlerts, youtubeAlertConfigs } from "./deployment-observability.js";
import { youtubeMetricNames, type YouTubeMetricName } from "./operations.js";

describe("YouTube deployment observability boundary", () => {
  it("builds a metrics snapshot with every contract metric", () => {
    const snapshot = buildYouTubeMetricsSnapshot({
      youtube_connector_connected: 1,
      youtube_events_per_minute: 42
    });
    expect(Object.keys(snapshot).sort()).toEqual([...youtubeMetricNames].sort());
    expect(snapshot.youtube_connector_connected).toBe(1);
    expect(snapshot.youtube_events_per_minute).toBe(42);
    expect(snapshot.youtube_quota_errors_total).toBe(0);
  });

  it("builds a dashboard contract that references only declared metrics", () => {
    const dashboard = buildYouTubeDashboardContract();
    expect(dashboard.metrics.sort()).toEqual([...youtubeMetricNames].sort());
    expect(dashboard.panels.length).toBeGreaterThanOrEqual(6);
    for (const panel of dashboard.panels) {
      expect(panel.metrics.every((metric) => youtubeMetricNames.includes(metric as YouTubeMetricName))).toBe(true);
    }
  });

  it("defines alert routing for every production operator target", () => {
    expect(youtubeAlertConfigs.map((alert) => alert.id).sort()).toEqual(
      [
        "auth_failure",
        "invalid_page_token",
        "list_fallback_spike",
        "live_chat_id_missing",
        "quota_exceeded",
        "rate_limit_exceeded",
        "stream_reconnect_storm",
        "verification_failure_spike",
        "zero_events_while_live"
      ].sort()
    );
  });

  it.each([
    ["quota_exceeded", "youtube_quota_errors_total"],
    ["rate_limit_exceeded", "youtube_rate_limit_errors_total"],
    ["auth_failure", "youtube_auth_errors_total"],
    ["invalid_page_token", "youtube_invalid_page_token_total"],
    ["live_chat_id_missing", "youtube_live_chat_id_missing_total"],
    ["stream_reconnect_storm", "youtube_stream_reconnect_total"],
    ["list_fallback_spike", "youtube_list_fallback_total"],
    ["verification_failure_spike", "youtube_verification_code_failed_total"]
  ] as const)("maps %s alert to its metric", (alertId, metricName) => {
    const config = youtubeAlertConfigs.find((alert) => alert.id === alertId);
    expect(config?.metric).toBe(metricName);
  });

  it("evaluates quota, rate-limit, auth, page-token, reconnect, fallback, and verification alerts", () => {
    const alerts = evaluateYouTubeAlerts(
      buildYouTubeMetricsSnapshot({
        youtube_quota_errors_total: 1,
        youtube_rate_limit_errors_total: 1,
        youtube_auth_errors_total: 1,
        youtube_invalid_page_token_total: 1,
        youtube_live_chat_id_missing_total: 1,
        youtube_stream_reconnect_total: 5,
        youtube_list_fallback_total: 3,
        youtube_verification_code_failed_total: 5,
        youtube_events_per_minute: 1
      })
    );
    expect(alerts.map((alert) => alert.id).sort()).toEqual(
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
  });

  it("alerts on zero YouTube events only while the stream is live", () => {
    const snapshot = buildYouTubeMetricsSnapshot({ youtube_events_per_minute: 0 });
    expect(evaluateYouTubeAlerts(snapshot, true).some((alert) => alert.id === "zero_events_while_live")).toBe(true);
    expect(evaluateYouTubeAlerts(snapshot, false).some((alert) => alert.id === "zero_events_while_live")).toBe(false);
  });

  it("keeps live YouTube soak as a manual gated boundary", () => {
    const manualLiveSoakEnabled = process.env.YOUTUBE_LIVE_SOAK_ENABLED === "true" && process.env.YOUTUBE_CREDENTIAL_SOURCE === "secret_manager";
    expect(manualLiveSoakEnabled).toBe(false);
  });
});
