import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseYouTubeLiveChatPageFixture } from "./youtube-live-chat-page-fixture-parser.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    stream_id: "stream_page_fixture",
    character_id: "char_mio",
    youtube_video_id: "yt_video_page_fixture",
    live_chat_id: "live_chat_fixture",
    page_token: "fixture_page_1",
    ...overrides
  };
}

function superChat(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T04:00:00.000Z",
      superChatDetails: {
        amountMicros: "1200000",
        currency: "JPY",
        amountDisplayString: "JPY 1,200",
        userComment: "Nice stream",
        tier: 2
      }
    },
    authorDetails: {
      channelId: `channel_${id}`,
      displayName: `Viewer ${id}`
    },
    ...overrides
  };
}

function page(items: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    nextPageToken: "fixture_page_2",
    pollingIntervalMillis: 5000,
    items,
    ...overrides
  };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("raw_item");
}

describe("P0 YouTube live chat page fixture parser", () => {
  it("parses valid superChatEvent items and skips unsupported items safely", () => {
    const result = parseYouTubeLiveChatPageFixture({
      context: context(),
      page: page([
        superChat("msg_1"),
        superChat("msg_2", { snippet: { type: "superChatEvent", publishedAt: "2026-06-18T04:00:01.000Z", superChatDetails: { amountMicros: "2200000", currency: "JPY", amountDisplayString: "JPY 2,200", userComment: "https://private.example/hook", tier: 3 } } }),
        { id: "msg_text", snippet: { type: "textMessageEvent", publishedAt: "2026-06-18T04:00:02.000Z" }, authorDetails: { channelId: "channel_text", displayName: "Text Viewer" } },
        { id: "msg_sticker", snippet: { type: "superStickerEvent", publishedAt: "2026-06-18T04:00:03.000Z" }, authorDetails: { channelId: "channel_sticker", displayName: "Sticker Viewer" } },
        { id: "msg_unknown", snippet: { type: "unknownEvent" } }
      ])
    });

    expect(result.page_token).toBe("fixture_page_1");
    expect(result.next_page_token).toBe("fixture_page_2");
    expect(result.youtube_page_token).toBe("fixture_page_2");
    expect(result.polling_interval_ms).toBe(5000);
    expect(result.normalized_events).toHaveLength(2);
    const first = result.normalized_events[0];
    const second = result.normalized_events[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) throw new Error("expected normalized events");
    expect(first.source).toBe("youtube_super_chat");
    expect(first.source_event_id).toBe("msg_1");
    expect(first.support.amount_raw).toBe("1200000");
    expect(second.support.message_moderation_status).toBe("hold");
    expect(second.support.message).toBe("");
    expect(result.skipped_items).toHaveLength(3);
    expect(result.skipped_items.map((item) => item.safe_reason_codes.join(","))).toEqual([
      "unsupported_message_type",
      "unsupported_message_type",
      "unsupported_message_type"
    ]);
    expect(result.page_summary).toEqual({
      total_items: 5,
      super_chat_items: 2,
      normalized_count: 2,
      held_count: 1,
      skipped_count: 3,
      duplicate_count: 0
    });
    expectSafeOutput(result);
  });

  it("skips malformed super chats and duplicate message ids without failing the whole page", () => {
    const result = parseYouTubeLiveChatPageFixture({
      context: context(),
      page: page([
        superChat("dup_msg"),
        superChat("dup_msg"),
        superChat("missing_details", { snippet: { type: "superChatEvent", publishedAt: "2026-06-18T04:01:00.000Z" } }),
        superChat("bad_author", { authorDetails: { channelId: "", displayName: "" } }),
        superChat("bad_amount", { snippet: { type: "superChatEvent", publishedAt: "2026-06-18T04:02:00.000Z", superChatDetails: { amountMicros: "1.5", currency: "JPY", amountDisplayString: "JPY 1.5", userComment: "bad", tier: 2 } } }),
        superChat("bad_currency", { snippet: { type: "superChatEvent", publishedAt: "2026-06-18T04:02:01.000Z", superChatDetails: { amountMicros: "1000", currency: "jpy", amountDisplayString: "jpy 1000", userComment: "bad", tier: 2 } } }),
        superChat("bad_tier", { snippet: { type: "superChatEvent", publishedAt: "2026-06-18T04:02:02.000Z", superChatDetails: { amountMicros: "1000", currency: "JPY", amountDisplayString: "JPY 1000", userComment: "bad", tier: 8 } } }),
        superChat("bad_time", { snippet: { type: "superChatEvent", publishedAt: "not-a-date", superChatDetails: { amountMicros: "1000", currency: "JPY", amountDisplayString: "JPY 1000", userComment: "bad", tier: 2 } } })
      ])
    });

    expect(result.normalized_events).toHaveLength(1);
    expect(result.skipped_items).toHaveLength(7);
    expect(result.skipped_items.map((item) => item.safe_reason_codes.join(","))).toEqual([
      "duplicate_message_id",
      "missing_super_chat_details",
      "invalid_author_details",
      "invalid_amount",
      "invalid_currency",
      "invalid_tier",
      "invalid_published_at"
    ]);
    expect(result.page_summary.duplicate_count).toBe(1);
    expectSafeOutput(result);
  });

  it("validates page root and polling interval safely", () => {
    expect(() => parseYouTubeLiveChatPageFixture({
      context: context(),
      page: page([], { pollingIntervalMillis: -1 })
    })).toThrow();
    expect(() => parseYouTubeLiveChatPageFixture({
      context: context(),
      page: { items: [], unknown: "field" }
    })).toThrow();
    expect(parseYouTubeLiveChatPageFixture({
      context: context({ page_token: "" }),
      page: page([], { nextPageToken: "" })
    }).next_page_token).toBe("");
  });

  it("is deterministic and mutation-free for repeated parsing", () => {
    const input = {
      context: context(),
      page: page([superChat("deterministic_msg")])
    };
    expect(parseYouTubeLiveChatPageFixture(input)).toEqual(parseYouTubeLiveChatPageFixture(input));
  });

  it("committed youtube live chat page fixture parser evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-youtube-live-chat-page-fixture-parser.json");

    expect(evidence.youtubeLiveChatPageFixtureParserStatus).toBe("implemented");
    expect(evidence.superChatExtractionStatus).toBe("pass");
    expect(evidence.unsupportedTypeSkipStatus).toBe("pass");
    expect(evidence.malformedItemSkipStatus).toBe("pass");
    expect(evidence.duplicateMessageSkipStatus).toBe("pass");
    expect(evidence.safeSkippedOutputStatus).toBe("pass");
    expect(evidence.normalizerReuseStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.noSideEffectsStatus).toBe("pass");
    expect(evidence.rawPageExcluded).toBe(true);
    expect(evidence.rawCommentExcludedFromSkippedOutput).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
