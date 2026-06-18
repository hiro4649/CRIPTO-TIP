import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseYouTubeLiveChatPageFixture } from "./youtube-live-chat-page-fixture-parser.js";
import { YouTubeLiveChatFakeClient } from "./youtube-live-chat-fake-client.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function superChat(id: string) {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T06:30:00.000Z",
      superChatDetails: {
        amountMicros: "1000000",
        currency: "JPY",
        amountDisplayString: "JPY 1,000",
        userComment: "Great stream",
        tier: 2
      }
    },
    authorDetails: {
      channelId: `channel_${id}`,
      displayName: `Viewer ${id}`
    }
  };
}

function page(id: string, nextPageToken: string | null = null) {
  return nextPageToken === null
    ? { pollingIntervalMillis: 5000, items: [superChat(id)] }
    : { nextPageToken, pollingIntervalMillis: 5000, items: [superChat(id)] };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("oauth");
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("client_secret");
}

describe("P1 YouTube Live Chat client contract", () => {
  it("keeps fake client fixture-only and deterministic for stream and list reads", async () => {
    const client = new YouTubeLiveChatFakeClient({
      stream_pages: [
        { page_token: null, page: page("msg_stream_1", "page_2"), next_page_token: "page_2", polling_interval_ms: 5000 },
        { page_token: "page_2", page: page("msg_stream_2"), next_page_token: null, polling_interval_ms: 5000 }
      ],
      list_pages: [
        { page_token: null, page: page("msg_list_1"), next_page_token: null, polling_interval_ms: 5000 }
      ]
    });
    const capability = client.getCapability();
    expect(capability).toEqual({
      client_kind: "fake_fixture",
      network_enabled: false,
      oauth_configured: false,
      real_api_execution: false,
      supports_stream_list: false,
      supports_list_fallback: false,
      supports_fixture_pages: true,
      supports_cursor_handoff: true
    });
    const streamFirst = await client.readStreamPage({ live_chat_id: "live_chat_contract", page_token: null });
    const streamReplay = await client.readStreamPage({ live_chat_id: "live_chat_contract", page_token: null });
    const streamSecond = await client.readStreamPage({ live_chat_id: "live_chat_contract", page_token: "page_2" });
    const listFirst = await client.readListPage({ live_chat_id: "live_chat_contract", page_token: null });
    const missing = await client.readStreamPage({ live_chat_id: "live_chat_contract", page_token: "missing" });

    expect(streamFirst).toEqual(streamReplay);
    expect(streamFirst.source_mode).toBe("stream");
    expect(streamFirst.next_page_token).toBe("page_2");
    expect(streamSecond.next_page_token).toBeNull();
    expect(listFirst.source_mode).toBe("list");
    expect(missing.safe_failure?.failure_class).toBe("page_token_invalid");
    expect(parseYouTubeLiveChatPageFixture({
      context: {
        stream_id: "stream_contract",
        character_id: "char_contract",
        youtube_video_id: "yt_video_contract",
        live_chat_id: "live_chat_contract",
        page_token: ""
      },
      page: streamFirst.page
    }).page_summary.normalized_count).toBe(1);
    expectSafeOutput(missing);
  });

  it("committed client contract evidence preserves fake-only boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-client-contract.json");

    expect(evidence.youtubeLiveChatClientContractStatus).toBe("implemented");
    expect(evidence.fakeClientStatus).toBe("implemented");
    expect(evidence.capabilityBoundaryStatus).toBe("pass");
    expect(evidence.streamReadContractStatus).toBe("pass");
    expect(evidence.listFallbackContractStatus).toBe("pass");
    expect(evidence.cursorHandoffStatus).toBe("pass");
    expect(evidence.safeFailureStatus).toBe("pass");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.oauthConfigured).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.fixtureOnly).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
