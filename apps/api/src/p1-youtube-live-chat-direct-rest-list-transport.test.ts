import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { YouTubeLiveChatDirectRestListTransport, type YouTubeDirectRestFetch } from "./youtube-live-chat-direct-rest-transport.js";
import { FakeOpaqueYouTubeCredentialProvider } from "./youtube-credential-provider.js";
import { armYouTubeConnectorKillSwitchForFakeTransport, defaultYouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function page() {
  return JSON.stringify({
    nextPageToken: "next_page",
    pollingIntervalMillis: 5000,
    items: [
      {
        id: "msg_1",
        snippet: {
          type: "superChatEvent",
          publishedAt: "2026-06-18T00:00:00.000Z",
          superChatDetails: { amountMicros: "1000000", currency: "JPY", amountDisplayString: "JPY 1,000", userComment: "hello", tier: 1 }
        },
        authorDetails: { channelId: "channel_1", displayName: "Viewer" }
      }
    ]
  });
}

function transport(fetchFn: YouTubeDirectRestFetch, armed = true) {
  return new YouTubeLiveChatDirectRestListTransport({
    fetch_fn: fetchFn,
    credential_provider: new FakeOpaqueYouTubeCredentialProvider(),
    kill_switch: armed
      ? armYouTubeConnectorKillSwitchForFakeTransport({ now: new Date("2026-06-18T00:00:00.000Z"), expires_at: "2026-06-18T00:10:00.000Z", head_binding: "head", config_hash_binding: "config" })
      : defaultYouTubeConnectorKillSwitch({ now: new Date("2026-06-18T00:00:00.000Z"), head_binding: "head", config_hash_binding: "config" }),
    head_binding: "head",
    config_hash_binding: "config"
  });
}

describe("P1 YouTube Live Chat direct REST list transport", () => {
  it("blocked kill switch never calls fake fetch", async () => {
    const fakeFetch = vi.fn<YouTubeDirectRestFetch>();
    const result = await transport(fakeFetch, false).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });

    expect(fakeFetch).not.toHaveBeenCalled();
    expect(result.status).toBe("blocked");
    expect(result.fetch_called).toBe(false);
  });

  it("armed fake mode calls injected fake fetch once with fixed host/path and safe query", async () => {
    const fakeFetch = vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: page() }));
    const result = await transport(fakeFetch).executeList({ live_chat_id: "live_chat", page_token: "page_2", max_results: 200, hl: "ja", timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(fakeFetch.mock.calls[0]?.[0]).toMatchObject({
      method: "GET",
      host: "www.googleapis.com",
      path: "/youtube/v3/liveChat/messages",
      query: { liveChatId: "live_chat", part: "id,snippet,authorDetails", maxResults: "200", pageToken: "page_2", hl: "ja" },
      redirect: "manual"
    });
    expect(result.status).toBe("success_page");
    expect(result.next_page_token).toBe("next_page");
    expect(result.polling_interval_ms).toBe(5000);
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("Bearer");
  });

  it("classifies safe failures without raw body storage", async () => {
    const fakeFetch = vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 403, content_type: "application/json", body_text: "{}", safe_error_reason: "liveChatEnded" }));
    const result = await transport(fakeFetch).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });

    expect(result.status).toBe("live_chat_ended");
    expect(result.raw_body_stored).toBe(false);
  });

  it("blocks invalid response surfaces", async () => {
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "live_chat", max_results: 199, timeout_budget_ms: 1000 })).resolves.toMatchObject({ status: "blocked", fetch_called: false });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "text/html", body_text: "{}" }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["json_content_type_required"] });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: "{bad" }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["invalid_json"] });
  });

  it("committed evidence preserves fake-fetch only transport boundary", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-direct-rest-list-transport.json");

    expect(evidence.directRestListTransportStatus).toBe("implemented");
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.fakeFetchOnly).toBe(true);
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
