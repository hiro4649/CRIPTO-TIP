import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  NetworkForbiddenYouTubeLiveChatApiTransport,
  buildYouTubeLiveChatApiRequestEnvelope
} from "./youtube-live-chat-api-envelope-contract.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectSafeEnvelope(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("access_token");
  expect(serialized).not.toContain("refresh_token");
  expect(serialized).not.toContain("client_secret");
  expect(serialized).not.toContain("https://");
}

describe("P1 YouTube Live Chat API envelope contract", () => {
  it("builds stream and list envelopes without auth headers or private endpoints", () => {
    const stream = buildYouTubeLiveChatApiRequestEnvelope({ mode: "stream", page_token: "next", max_results: 200 });
    const list = buildYouTubeLiveChatApiRequestEnvelope({ mode: "list" });

    expect(stream).toEqual({
      mode: "stream",
      method: "GET",
      path_template: "/youtube/v3/liveChat/messages",
      query_keys: ["liveChatId", "part", "pageToken", "maxResults"],
      auth_header_included: false,
      raw_token_included: false,
      private_url_included: false
    });
    expect(list.query_keys).toEqual(["liveChatId", "part"]);
    expectSafeEnvelope(stream);
    expectSafeEnvelope(list);
  });

  it("network-forbidden transport never calls fetch and returns safe failure only", async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn(() => {
      throw new Error("fetch must not be called");
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      const transport = new NetworkForbiddenYouTubeLiveChatApiTransport();
      const response = await transport.execute(buildYouTubeLiveChatApiRequestEnvelope({ mode: "stream" }));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(response).toEqual({
        status: "network_forbidden",
        mode: "stream",
        page: null,
        next_page_token: null,
        polling_interval_ms: null,
        raw_response_included: false,
        safe_failure: {
          failure_class: "network_forbidden",
          safe_reason: "real_youtube_api_transport_not_authorized",
          raw_logs_read: false,
          scope_expansion: false
        }
      });
      expectSafeEnvelope(response);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("committed API envelope evidence preserves no-network transport boundary", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-api-envelope-contract.json");

    expect(evidence.apiEnvelopeContractStatus).toBe("implemented");
    expect(evidence.transportStatus).toBe("network_forbidden_only");
    expect(evidence.fetchCalled).toBe(false);
    expect(evidence.httpClientAdded).toBe(false);
    expect(evidence.googleSdkAdded).toBe(false);
    expect(evidence.rawResponseIncluded).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
