import { youtubeMetricNames, type YouTubeMetricName } from "./operations.js";

export type YouTubeMetricsSnapshot = Record<YouTubeMetricName, number>;

export type YouTubeAlertId =
  | "quota_exceeded"
  | "rate_limit_exceeded"
  | "auth_failure"
  | "invalid_page_token"
  | "live_chat_id_missing"
  | "stream_reconnect_storm"
  | "list_fallback_spike"
  | "zero_events_while_live"
  | "verification_failure_spike";

export type YouTubeAlertConfig = {
  id: YouTubeAlertId;
  metric: YouTubeMetricName;
  threshold: number;
  windowMinutes: number;
  operatorAction: string;
};

export const youtubeAlertConfigs: YouTubeAlertConfig[] = [
  { id: "quota_exceeded", metric: "youtube_quota_errors_total", threshold: 1, windowMinutes: 5, operatorAction: "inspect_youtube_quota_dashboard" },
  { id: "rate_limit_exceeded", metric: "youtube_rate_limit_errors_total", threshold: 1, windowMinutes: 5, operatorAction: "reduce_polling_pressure_and_backoff" },
  { id: "auth_failure", metric: "youtube_auth_errors_total", threshold: 1, windowMinutes: 5, operatorAction: "rotate_or_reauthorize_youtube_credentials" },
  { id: "invalid_page_token", metric: "youtube_invalid_page_token_total", threshold: 1, windowMinutes: 5, operatorAction: "reset_page_token" },
  { id: "live_chat_id_missing", metric: "youtube_live_chat_id_missing_total", threshold: 1, windowMinutes: 5, operatorAction: "fix_live_session_live_chat_id" },
  { id: "stream_reconnect_storm", metric: "youtube_stream_reconnect_total", threshold: 5, windowMinutes: 10, operatorAction: "inspect_streamlist_connectivity" },
  { id: "list_fallback_spike", metric: "youtube_list_fallback_total", threshold: 3, windowMinutes: 10, operatorAction: "inspect_streamlist_availability" },
  { id: "zero_events_while_live", metric: "youtube_events_per_minute", threshold: 0, windowMinutes: 5, operatorAction: "confirm_live_chat_activity_and_connector_health" },
  { id: "verification_failure_spike", metric: "youtube_verification_code_failed_total", threshold: 5, windowMinutes: 10, operatorAction: "inspect_verification_code_failures" }
];

export function buildYouTubeMetricsSnapshot(values: Partial<Record<YouTubeMetricName, number>>): YouTubeMetricsSnapshot {
  return Object.fromEntries(youtubeMetricNames.map((name) => [name, values[name] ?? 0])) as YouTubeMetricsSnapshot;
}

export function buildYouTubeDashboardContract() {
  return {
    title: "CRIPTO-TIP YouTube Connector Operations",
    metrics: [...youtubeMetricNames],
    panels: [
      { title: "Connector Health", metrics: ["youtube_connector_connected"] },
      { title: "Events", metrics: ["youtube_events_per_minute"] },
      { title: "Quota And Rate Limits", metrics: ["youtube_quota_errors_total", "youtube_rate_limit_errors_total"] },
      { title: "Reconnect And Fallback", metrics: ["youtube_stream_reconnect_total", "youtube_list_fallback_total"] },
      { title: "Operator Actions", metrics: ["youtube_auth_errors_total", "youtube_invalid_page_token_total", "youtube_live_chat_id_missing_total"] },
      { title: "Verification", metrics: ["youtube_verification_code_detected_total", "youtube_verification_code_failed_total"] }
    ]
  };
}

export function evaluateYouTubeAlerts(snapshot: YouTubeMetricsSnapshot, live = true) {
  return youtubeAlertConfigs.filter((alert) => {
    const value = snapshot[alert.metric];
    if (alert.id === "zero_events_while_live") return live && value <= alert.threshold;
    return value >= alert.threshold;
  });
}
