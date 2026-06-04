import { YouTubeApiError, isRetryableYouTubeError, type YouTubeConnector, type YouTubeConnectorOptions, type YouTubePollResult } from "./connector.js";

export const youtubeMetricNames = [
  "youtube_connector_connected",
  "youtube_events_per_minute",
  "youtube_quota_errors_total",
  "youtube_rate_limit_errors_total",
  "youtube_stream_reconnect_total",
  "youtube_list_fallback_total",
  "youtube_verification_code_detected_total",
  "youtube_verification_code_failed_total"
] as const;

export type YouTubeMetricName = typeof youtubeMetricNames[number];

export type YouTubeLiveSessionBoundary = {
  id: string;
  youtube_live_chat_id?: string | null;
};

export function acquireLiveChatIdFromLiveSession(session: YouTubeLiveSessionBoundary) {
  if (!session.youtube_live_chat_id) throw new Error(`Live session ${session.id} does not have a YouTube liveChatId boundary`);
  return session.youtube_live_chat_id;
}

export function isQuotaOrRateLimitReason(reason?: string) {
  return reason === "quotaExceeded" || reason === "rateLimitExceeded" || reason === "userRateLimitExceeded";
}

export function classifyYouTubeOperationalError(error: unknown) {
  if (!(error instanceof YouTubeApiError)) return { retryable: false, operatorAction: "inspect_connector_error", metric: undefined as YouTubeMetricName | undefined };
  if (isQuotaOrRateLimitReason(error.reason)) {
    return {
      retryable: true,
      operatorAction: "monitor_quota_dashboard_and_backoff",
      metric: error.reason === "quotaExceeded" ? "youtube_quota_errors_total" as const : "youtube_rate_limit_errors_total" as const
    };
  }
  if (isRetryableYouTubeError(error)) return { retryable: true, operatorAction: "retry_with_backoff", metric: undefined as YouTubeMetricName | undefined };
  if (error.statusCode === 401) return { retryable: false, operatorAction: "check_youtube_credentials", metric: undefined as YouTubeMetricName | undefined };
  if (error.statusCode === 400 && error.reason === "pageTokenInvalid") return { retryable: false, operatorAction: "reset_page_token_or_operator_action", metric: undefined as YouTubeMetricName | undefined };
  return { retryable: false, operatorAction: "operator_review", metric: undefined as YouTubeMetricName | undefined };
}

export function shouldReconnectStreamList(error: unknown, attempt: number, maxAttempts: number) {
  return classifyYouTubeOperationalError(error).retryable && attempt < maxAttempts;
}

export function shouldFallbackToList(error: unknown) {
  return error instanceof YouTubeApiError && (error.statusCode === 404 || error.statusCode === 501);
}

export function nextListFallbackDelayMillis(result: Pick<YouTubePollResult, "pollingIntervalMillis">, fallbackMinimumMs: number) {
  return Math.max(result.pollingIntervalMillis ?? fallbackMinimumMs, fallbackMinimumMs);
}

export async function runDeterministicYouTubeConnectorSoak(args: {
  connector: YouTubeConnector;
  options: YouTubeConnectorOptions;
  iterations: number;
}) {
  const counters: Partial<Record<YouTubeMetricName, number>> = {
    youtube_connector_connected: 1,
    youtube_events_per_minute: 0,
    youtube_list_fallback_total: 0
  };
  let lastResult: YouTubePollResult | undefined;
  let pageToken = args.options.pageToken;
  for (let index = 0; index < args.iterations; index += 1) {
    const pollOptions = pageToken ? { ...args.options, pageToken } : args.options;
    lastResult = await args.connector.pollLiveChat(pollOptions);
    counters.youtube_events_per_minute = (counters.youtube_events_per_minute ?? 0) + lastResult.events.length;
    if (lastResult.usedFallback) counters.youtube_list_fallback_total = (counters.youtube_list_fallback_total ?? 0) + 1;
    pageToken = lastResult.nextPageToken;
  }
  return { counters, lastResult };
}
