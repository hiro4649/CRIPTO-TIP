import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { YouTubeLiveChatDirectRestListTransport, type YouTubeDirectRestFetch } from "./youtube-live-chat-direct-rest-transport.js";
import {
  FakeOpaqueYouTubeCredentialProvider,
  UnavailableYouTubeCredentialProvider,
  type YouTubeCredentialProvider
} from "./youtube-credential-provider.js";
import { armYouTubeConnectorKillSwitchForFakeTransport, defaultYouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

const readonlyScope = "https://www.googleapis.com/auth/youtube.readonly";

function page(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    kind: "youtube#liveChatMessageListResponse",
    etag: "raw_etag_ignored",
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
    ],
    ...extra
  });
}

function transport(fetchFn: YouTubeDirectRestFetch, armed = true, credentialProvider: YouTubeCredentialProvider = new FakeOpaqueYouTubeCredentialProvider()) {
  return new YouTubeLiveChatDirectRestListTransport({
    fetch_fn: fetchFn,
    credential_provider: credentialProvider,
    kill_switch: armed
      ? armYouTubeConnectorKillSwitchForFakeTransport({ now: new Date("2026-06-18T00:00:00.000Z"), expires_at: "2026-06-18T00:10:00.000Z", head_binding: "head", config_hash_binding: "config" })
      : defaultYouTubeConnectorKillSwitch({ now: new Date("2026-06-18T00:00:00.000Z"), head_binding: "head", config_hash_binding: "config" }),
    head_binding: "head",
    config_hash_binding: "config",
    scope_ids: [readonlyScope]
  });
}

class ThrowingReleaseCredentialProvider extends FakeOpaqueYouTubeCredentialProvider {
  async releaseAccessCredentialHandle(): Promise<{ status: "released" | "already_released"; raw_value_exposed: false }> {
    throw new Error("raw release failure hidden");
  }
}

describe("P1 YouTube Live Chat direct REST list transport", () => {
  it("blocked kill switch never calls fake fetch", async () => {
    const fakeFetch = vi.fn<YouTubeDirectRestFetch>();
    const result = await transport(fakeFetch, false).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });

    expect(fakeFetch).not.toHaveBeenCalled();
    expect(result.status).toBe("blocked");
    expect(result.fetch_called).toBe(false);
    expect(result.network_call_used).toBe(false);
    expect(result.global_fetch_used).toBe(false);
  });

  it("armed fake mode calls injected fake fetch once with fixed host/path, injected scope, and safe query", async () => {
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
    expect(fakeFetch.mock.calls[0]?.[0].credential_handle.scope_ids).toEqual([readonlyScope]);
    expect(result.status).toBe("success_page");
    expect(result.next_page_token).toBe("next_page");
    expect(result.polling_interval_ms).toBe(5000);
    expect(result.fetch_called).toBe(true);
    expect(result.fake_fetch_called).toBe(true);
    expect(result.network_call_used).toBe(false);
    expect(result.global_fetch_used).toBe(false);
    expect(result.credential_handle_acquired).toBe(true);
    expect(result.credential_handle_release_attempted).toBe(true);
    expect(result.credential_handle_released).toBe(true);
    expect(JSON.stringify(result.page)).not.toContain("youtube#liveChatMessageListResponse");
    expect(JSON.stringify(result.page)).not.toContain("raw_etag_ignored");
    expect(JSON.stringify(result)).not.toContain("Authorization");
    expect(JSON.stringify(result)).not.toContain("Bearer");
    expect(JSON.stringify(result)).not.toContain("direct_rest_contract_stream");
  });

  it("classifies safe failures without raw body storage", async () => {
    const fakeFetch = vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 403, content_type: "application/json", body_text: "{}", safe_error_reason: "liveChatEnded" }));
    const result = await transport(fakeFetch).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });

    expect(result.status).toBe("live_chat_ended");
    expect(result.raw_body_stored).toBe(false);
    expect(result.credential_handle_release_attempted).toBe(true);
    expect(result.credential_handle_released).toBe(true);
  });

  it("blocks invalid response surfaces and releases acquired credentials", async () => {
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "live_chat", max_results: 199, timeout_budget_ms: 1000 })).resolves.toMatchObject({ status: "blocked", fetch_called: false });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "text/html", body_text: "{}" }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["json_content_type_required"], credential_handle_released: true });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: "{bad" }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["invalid_json"], credential_handle_released: true });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: JSON.stringify({ items: [], nextPageToken: "x".repeat(513) }) }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["next_page_token_invalid"], credential_handle_released: true });
  });

  it("handles redirect, oversized UTF-8 response, injected fetch throw, credential acquisition failure, and release failure safely", async () => {
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: page(), redirected: true }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["redirect_blocked"], credential_handle_released: true });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: JSON.stringify({ items: ["あ".repeat(90_000)] }) }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "response_invalid", safe_reason_codes: ["response_oversized"], credential_handle_released: true });
    const throwingFetch = vi.fn<YouTubeDirectRestFetch>(async () => { throw new Error("raw upstream message hidden"); });
    const thrown = await transport(throwingFetch).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });
    expect(thrown).toMatchObject({ status: "upstream_unavailable", safe_reason_codes: ["injected_fetch_exception"], credential_handle_released: true });
    expect(JSON.stringify(thrown)).not.toContain("raw upstream message hidden");
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(), true, new UnavailableYouTubeCredentialProvider()).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "oauth_missing", credential_handle_acquired: false, credential_handle_release_attempted: false });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 200, content_type: "application/json", body_text: page() })), true, new ThrowingReleaseCredentialProvider()).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") })).resolves.toMatchObject({ status: "credential_release_failed", safe_reason_codes: ["credential_release_failed"] });
  });

  it("rejects request bounds, duplicate scopes, and unknown error reasons without reflecting raw values", async () => {
    const now = new Date("2026-06-18T00:01:00.000Z");
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "", max_results: 200, timeout_budget_ms: 1000, now })).resolves.toMatchObject({ status: "blocked", safe_reason_codes: ["live_chat_id_invalid"] });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "live_chat", page_token: "x".repeat(513), max_results: 200, timeout_budget_ms: 1000, now })).resolves.toMatchObject({ status: "blocked", safe_reason_codes: ["page_token_invalid"] });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "live_chat", max_results: 200, hl: "bad_locale_@", timeout_budget_ms: 1000, now })).resolves.toMatchObject({ status: "blocked", safe_reason_codes: ["hl_invalid"] });
    await expect(transport(vi.fn<YouTubeDirectRestFetch>()).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 99, now })).resolves.toMatchObject({ status: "blocked", safe_reason_codes: ["timeout_budget_invalid"] });
    expect(() => new YouTubeLiveChatDirectRestListTransport({
      fetch_fn: vi.fn<YouTubeDirectRestFetch>(),
      credential_provider: new FakeOpaqueYouTubeCredentialProvider(),
      kill_switch: defaultYouTubeConnectorKillSwitch(),
      head_binding: "head",
      config_hash_binding: "config",
      scope_ids: [readonlyScope, readonlyScope]
    })).toThrow("scope_ids_duplicate");
    const result = await transport(vi.fn<YouTubeDirectRestFetch>(async () => ({ status: 403, content_type: "application/json", body_text: "{}", safe_error_reason: "rawUnexpected" as never }))).executeList({ live_chat_id: "live_chat", max_results: 200, timeout_budget_ms: 1000, now: new Date("2026-06-18T00:01:00.000Z") });
    expect(result).toMatchObject({ status: "forbidden", safe_reason_codes: ["forbidden"] });
    expect(JSON.stringify(result)).not.toContain("rawUnexpected");
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
