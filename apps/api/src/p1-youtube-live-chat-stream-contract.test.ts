import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { YouTubeLiveChatFakeStreamTransport, streamPage, streamStatus } from "./youtube-live-chat-fake-stream.js";
import { consumeYouTubeLiveChatStream } from "./youtube-live-chat-stream-contract.js";
import { parseYouTubeLiveChatPageFixture } from "./youtube-live-chat-page-fixture-parser.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

const request = {
  live_chat_id: "live_chat_stream_contract",
  max_results: 200,
  timeout_budget_ms: 1000,
  execution_mode: "fake_stream" as const
};

describe("P1 YouTube Live Chat stream contract", () => {
  it("consumes initial history and ordered chunks without network, timers, or raw frames", async () => {
    const transport = new YouTubeLiveChatFakeStreamTransport({
      chunks: [
        streamPage({ next_page_token: "page_2", polling_interval_ms: 5000, items: [{ id: "msg_1" }] }),
        streamPage({ polling_interval_ms: 7000, items: [{ id: "msg_2" }] })
      ]
    });
    const result = await consumeYouTubeLiveChatStream({ transport, request });

    expect(result).toMatchObject({
      stream_status: "completed",
      chunks_read: 3,
      pages_read: 2,
      last_chunk_status: "fixture_exhausted",
      network_call_used: false,
      global_fetch_used: false,
      timer_started: false,
      sleep_used: false,
      grpc_used: false,
      http_streaming_used: false,
      google_sdk_used: false,
      real_api_execution: false,
      raw_frame_stored: false
    });
    expect(JSON.stringify(result)).not.toContain("live_chat_stream_contract");
    expect(JSON.stringify(result)).not.toContain("raw frame");
  });

  it("supports resume token validation and blocks wrong resume token safely", async () => {
    const accepted = await consumeYouTubeLiveChatStream({
      transport: new YouTubeLiveChatFakeStreamTransport({ expected_resume_token: "page_2", chunks: [streamPage({ items: [{ id: "msg_resume" }] })] }),
      request: { ...request, page_token: "page_2" }
    });
    const rejected = await consumeYouTubeLiveChatStream({
      transport: new YouTubeLiveChatFakeStreamTransport({ expected_resume_token: "page_2", chunks: [streamPage({ items: [{ id: "msg_resume" }] })] }),
      request: { ...request, page_token: "wrong_page" }
    });

    expect(accepted.stream_status).toBe("completed");
    expect(rejected).toMatchObject({ stream_status: "blocked", safe_reason_codes: ["resume_token_mismatch"] });
  });

  it("maps disconnect, terminal, disabled, not found, rate limit, and fixture exhaustion safely", async () => {
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("stream_disconnected", ["stream_disconnected"])] }), request })).resolves.toMatchObject({ stream_status: "backoff_required" });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("live_chat_ended", ["live_chat_ended"])] }), request })).resolves.toMatchObject({ stream_status: "completed" });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("live_chat_disabled", ["live_chat_disabled"])] }), request })).resolves.toMatchObject({ stream_status: "blocked" });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("live_chat_not_found", ["live_chat_not_found"])] }), request })).resolves.toMatchObject({ stream_status: "blocked" });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("rate_limit_exceeded", ["rate_limit_exceeded"])] }), request })).resolves.toMatchObject({ stream_status: "backoff_required" });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [] }), request })).resolves.toMatchObject({ stream_status: "completed", safe_reason_codes: ["fixture_exhausted"] });
  });

  it("bounds request, chunk consumption, same failure repeats, and abort", async () => {
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [] }), request: { ...request, max_results: 199 } })).resolves.toMatchObject({ stream_status: "blocked", safe_reason_codes: ["max_results_out_of_bounds"] });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: Array.from({ length: 6 }, () => streamPage({ items: [] })) }), request, max_chunks: 5 })).resolves.toMatchObject({ stream_status: "chunk_budget_exhausted", chunks_read: 5 });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamStatus("response_invalid", ["response_invalid"]), streamStatus("response_invalid", ["response_invalid"])] }), request, same_failure_repeat_limit: 2 })).resolves.toMatchObject({ stream_status: "same_failure_repeated", chunks_read: 2 });
    const controller = new AbortController();
    controller.abort();
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [streamPage({ items: [] })] }), request, abort_signal: controller.signal })).resolves.toMatchObject({ stream_status: "aborted", safe_reason_codes: ["stream_aborted"] });
    await expect(consumeYouTubeLiveChatStream({ transport: new YouTubeLiveChatFakeStreamTransport({ chunks: [] }), request, max_chunks: 6 })).rejects.toThrow("max_chunks_out_of_bounds");
  });

  it("keeps projected stream pages compatible with the existing page parser", () => {
    const page = streamPage({
      items: [
        {
          id: "msg_stream_parser",
          snippet: {
            type: "superChatEvent",
            publishedAt: "2026-06-18T00:00:00.000Z",
            superChatDetails: { amountMicros: "1000000", currency: "JPY", amountDisplayString: "JPY 1,000", userComment: "hello", tier: 1 }
          },
          authorDetails: { channelId: "channel_stream", displayName: "Viewer" }
        }
      ]
    });
    const parsed = parseYouTubeLiveChatPageFixture({
      context: {
        stream_id: "stream_stream_contract",
        youtube_video_id: "yt_stream_contract",
        live_chat_id: "live_chat_stream_contract",
        character_id: "char_stream_contract"
      },
      page: page.page
    });

    expect(parsed.normalized_events).toHaveLength(1);
    expect(parsed.normalized_events[0]?.event_type).toBe("support.received");
  });

  it("committed stream contract evidence preserves network-free boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-stream-contract.json");

    expect(evidence.streamContractStatus).toBe("implemented");
    expect(evidence.fakeAsyncIterableStatus).toBe("pass");
    expect(evidence.resumeTokenStatus).toBe("pass");
    expect(evidence.boundedConsumptionStatus).toBe("pass");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.timerUsed).toBe(false);
    expect(evidence.sleepUsed).toBe(false);
    expect(evidence.grpcUsed).toBe(false);
    expect(evidence.httpStreamingUsed).toBe(false);
    expect(evidence.googleSdkUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
