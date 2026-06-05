import { describe, expect, it } from "vitest";
import { MockYouTubeConnector, YouTubeApiError } from "./connector.js";
import {
  acquireLiveChatIdFromLiveSession,
  classifyYouTubeOperationalError,
  nextListFallbackDelayMillis,
  InMemoryYouTubeMetricsSink,
  createManualLiveYouTubeSoakPlan,
  recordLiveChatIdMissingMetric,
  recordYouTubeOperationalErrorMetric,
  runDeterministicYouTubeConnectorSoak,
  shouldFallbackToList,
  shouldReconnectStreamList,
  youtubeMetricNames
} from "./operations.js";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";

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
      "youtube_verification_code_failed_total",
      "youtube_live_chat_id_missing_total",
      "youtube_auth_errors_total",
      "youtube_invalid_page_token_total"
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
    const auth = classifyYouTubeOperationalError(new YouTubeApiError(401, "authError"));
    expect(auth.retryable).toBe(false);
    expect(auth.metric).toBe("youtube_auth_errors_total");
    expect(classifyYouTubeOperationalError(new YouTubeApiError(403, "liveChatEnded")).retryable).toBe(false);
    const invalidPageToken = classifyYouTubeOperationalError(new YouTubeApiError(400, "pageTokenInvalid"));
    expect(invalidPageToken.operatorAction).toBe("reset_page_token_or_operator_action");
    expect(invalidPageToken.metric).toBe("youtube_invalid_page_token_total");
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

  it("records quota, auth, invalid page token, and missing liveChatId metrics", () => {
    const sink = new InMemoryYouTubeMetricsSink();
    recordYouTubeOperationalErrorMetric(new YouTubeApiError(403, "quotaExceeded"), sink);
    recordYouTubeOperationalErrorMetric(new YouTubeApiError(403, "rateLimitExceeded"), sink);
    recordYouTubeOperationalErrorMetric(new YouTubeApiError(401, "authError"), sink);
    recordYouTubeOperationalErrorMetric(new YouTubeApiError(400, "pageTokenInvalid"), sink);
    recordLiveChatIdMissingMetric(sink);
    expect(sink.snapshot()).toMatchObject({
      youtube_quota_errors_total: 1,
      youtube_rate_limit_errors_total: 1,
      youtube_auth_errors_total: 1,
      youtube_invalid_page_token_total: 1,
      youtube_live_chat_id_missing_total: 1
    });
  });

  it("keeps manual live YouTube soak skipped unless explicitly gated with a managed credential boundary", () => {
    expect(createManualLiveYouTubeSoakPlan({}).status).toBe("skipped");
    expect(createManualLiveYouTubeSoakPlan({ RUN_LIVE_YOUTUBE_SOAK_TESTS: "true", YOUTUBE_CREDENTIAL_SOURCE: "local_env" })).toEqual({
      status: "skipped",
      reason: "managed_credential_boundary_missing"
    });
    expect(() => createManualLiveYouTubeSoakPlan({ RUN_LIVE_YOUTUBE_SOAK_TESTS: "true", YOUTUBE_CREDENTIAL_SOURCE: "secret_manager", YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key", targetCommitSha })).toThrow(/approved manual gate/);
    expect(createManualLiveYouTubeSoakPlan({ RUN_LIVE_YOUTUBE_SOAK_TESTS: "true", YOUTUBE_CREDENTIAL_SOURCE: "secret_manager", YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key", targetCommitSha, targetEnvironment: "production", manualGate: makeManualGate("youtube_live_soak") })).toEqual({
      status: "ready",
      reason: "manual_gate_and_secret_boundary_present"
    });
    expect(createManualLiveYouTubeSoakPlan({ RUN_LIVE_YOUTUBE_SOAK_TESTS: "true", YOUTUBE_CREDENTIAL_SOURCE: "provider_specific", YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key", targetCommitSha, targetEnvironment: "production", manualGate: makeManualGate("youtube_live_soak") })).toEqual({
      status: "ready",
      reason: "manual_gate_and_secret_boundary_present"
    });
  });
});
