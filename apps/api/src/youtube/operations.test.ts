import { describe, expect, it } from "vitest";
import { MockYouTubeConnector, YouTubeApiError } from "./connector.js";
import {
  acquireLiveChatIdFromLiveSession,
  classifyYouTubeOperationalError,
  nextListFallbackDelayMillis,
  runDeterministicYouTubeConnectorSoak,
  shouldFallbackToList,
  shouldReconnectStreamList,
  youtubeMetricNames
} from "./operations.js";

const connectorOptions = { liveChatId: "live_chat", streamId: "stream_1", characterId: "char_mio" };

describe("YouTube operations hardening boundary", () => {
  it("defines the production metrics names without adding runtime exporters", () => {
    expect(youtubeMetricNames).toEqual([
      "youtube_connector_connected",
      "youtube_events_per_minute",
      "youtube_quota_errors_total",
      "youtube_rate_limit_errors_total",
      "youtube_stream_reconnect_total",
      "youtube_list_fallback_total",
      "youtube_verification_code_detected_total",
      "youtube_verification_code_failed_total"
    ]);
  });

  it("acquires liveChatId only from the live session boundary", () => {
    expect(acquireLiveChatIdFromLiveSession({ id: "live_1", youtube_live_chat_id: "chat_1" })).toBe("chat_1");
    expect(() => acquireLiveChatIdFromLiveSession({ id: "live_1" })).toThrow(/liveChatId/);
  });

  it.each(["quotaExceeded", "rateLimitExceeded", "userRateLimitExceeded"])("classifies %s for retry/backoff and quota metrics", (reason) => {
    const result = classifyYouTubeOperationalError(new YouTubeApiError(403, reason));
    expect(result.retryable).toBe(true);
    expect(result.operatorAction).toBe("monitor_quota_dashboard_and_backoff");
    expect(result.metric).toMatch(/youtube_(quota|rate_limit)_errors_total/);
  });

  it("keeps credential, ended-chat, and invalid-page-token errors non-retryable", () => {
    expect(classifyYouTubeOperationalError(new YouTubeApiError(401, "authError")).retryable).toBe(false);
    expect(classifyYouTubeOperationalError(new YouTubeApiError(403, "liveChatEnded")).retryable).toBe(false);
    expect(classifyYouTubeOperationalError(new YouTubeApiError(400, "pageTokenInvalid")).operatorAction).toBe("reset_page_token_or_operator_action");
  });

  it("reconnects streamList only while retryable attempts remain", () => {
    const quotaError = new YouTubeApiError(403, "quotaExceeded");
    expect(shouldReconnectStreamList(quotaError, 1, 5)).toBe(true);
    expect(shouldReconnectStreamList(quotaError, 5, 5)).toBe(false);
    expect(shouldReconnectStreamList(new YouTubeApiError(403, "forbidden"), 1, 5)).toBe(false);
  });

  it("keeps list fallback limited to streamList unavailable responses", () => {
    expect(shouldFallbackToList(new YouTubeApiError(404))).toBe(true);
    expect(shouldFallbackToList(new YouTubeApiError(501))).toBe(true);
    expect(shouldFallbackToList(new YouTubeApiError(403, "quotaExceeded"))).toBe(false);
  });

  it("respects list fallback pollingIntervalMillis while enforcing a local minimum", () => {
    expect(nextListFallbackDelayMillis({ pollingIntervalMillis: 2500 }, 1000)).toBe(2500);
    expect(nextListFallbackDelayMillis({ pollingIntervalMillis: 200 }, 1000)).toBe(1000);
    expect(nextListFallbackDelayMillis({}, 1000)).toBe(1000);
  });

  it("runs a deterministic connector soak without network, secrets, or sleeping", async () => {
    const connector = new MockYouTubeConnector({
      events: [{ kind: "chat", event: { event_type: "youtube.chat.message.received", event_id: "evt_1", stream_id: "stream_1", author_channel_id: "UC1", author_display_name: "Mio", message: "hello", published_at: "2026-06-04T00:00:00.000Z" } }],
      nextPageToken: "next",
      pollingIntervalMillis: 1500,
      usedFallback: true
    });
    const result = await runDeterministicYouTubeConnectorSoak({ connector, options: connectorOptions, iterations: 3 });
    expect(result.counters.youtube_connector_connected).toBe(1);
    expect(result.counters.youtube_events_per_minute).toBe(3);
    expect(result.counters.youtube_list_fallback_total).toBe(3);
    expect(result.lastResult?.pollingIntervalMillis).toBe(1500);
  });
});
