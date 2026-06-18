import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { YouTubeLiveChatFakeClient } from "./youtube-live-chat-fake-client.js";
import { runYouTubeLiveChatFakeConnectorLoop } from "./youtube-live-chat-fake-connector-loop.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function page(id: string, nextPageToken: string | null = null) {
  return nextPageToken === null
    ? { pollingIntervalMillis: 5000, items: [{ id, snippet: { type: "textMessageEvent" } }] }
    : { nextPageToken, pollingIntervalMillis: 5000, items: [{ id, snippet: { type: "textMessageEvent" } }] };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("raw_item");
  expect(serialized).not.toContain("Viewer");
}

describe("P1 YouTube Live Chat fake connector loop", () => {
  it("completes fixture pages without sleep, network, OAuth, or real API execution", async () => {
    const client = new YouTubeLiveChatFakeClient({
      stream_pages: [
        { page_token: null, page: page("msg_1", "page_2"), next_page_token: "page_2" },
        { page_token: "page_2", page: page("msg_2"), next_page_token: null }
      ]
    });
    const seenTokens: Array<string | null> = [];
    const result = await runYouTubeLiveChatFakeConnectorLoop({
      client,
      cursor_id: "cursor_loop",
      live_chat_id: "live_chat_loop",
      mode: "stream",
      ingestPage: async ({ page_token }) => {
        seenTokens.push(page_token);
        return {
          page_status: "page_ingested",
          next_page_token: page_token === null ? "page_2" : null,
          cursor_status: page_token === null ? "page_ingested" : "caught_up_fixture",
          normalized_count: 1,
          persisted_count: 1,
          duplicate_count: 0,
          held_count: 0,
          safe_reason_codes: ["page_ingested"]
        };
      }
    });

    expect(result.loop_status).toBe("completed_fixture");
    expect(result.cycles_completed).toBe(2);
    expect(result.pages_read).toBe(2);
    expect(result.pages_ingested).toBe(2);
    expect(result.events_persisted).toBe(2);
    expect(seenTokens).toEqual([null, "page_2"]);
    expectSafeOutput(result);
  });

  it("stops at hard caps and emits safe failure capsules", async () => {
    const client = new YouTubeLiveChatFakeClient({
      list_pages: [
        { page_token: null, page: page("msg_1", "page_2"), next_page_token: "page_2" },
        { page_token: "page_2", page: page("msg_2", "page_3"), next_page_token: "page_3" },
        { page_token: "page_3", page: page("msg_3", "page_4"), next_page_token: "page_4" },
        { page_token: "page_4", page: page("msg_4", "page_5"), next_page_token: "page_5" },
        { page_token: "page_5", page: page("msg_5", "page_6"), next_page_token: "page_6" }
      ]
    });
    const capped = await runYouTubeLiveChatFakeConnectorLoop({
      client,
      cursor_id: "cursor_capped",
      live_chat_id: "live_chat_loop",
      mode: "list",
      max_cycles: 10,
      ingestPage: async ({ page_token }) => ({
        page_status: "page_ingested",
        next_page_token: page_token === null ? "page_2" : page_token === "page_2" ? "page_3" : page_token === "page_3" ? "page_4" : page_token === "page_4" ? "page_5" : "page_6",
        cursor_status: "page_ingested",
        normalized_count: 0,
        persisted_count: 0,
        duplicate_count: 0,
        held_count: 0,
        safe_reason_codes: ["page_ingested"]
      })
    });
    const missing = await runYouTubeLiveChatFakeConnectorLoop({
      client: new YouTubeLiveChatFakeClient({ stream_pages: [] }),
      cursor_id: "cursor_missing",
      live_chat_id: "live_chat_loop",
      mode: "stream",
      ingestPage: async () => {
        throw new Error("should not ingest");
      }
    });

    expect(capped.loop_status).toBe("cycle_budget_exhausted");
    expect(capped.safe_failure_capsule?.raw_logs_read).toBe(false);
    expect(capped.safe_failure_capsule?.scope_expansion).toBe(false);
    expect(missing.loop_status).toBe("blocked");
    expect(missing.safe_failure_capsule?.failure_class).toBe("page_token_invalid");
    expectSafeOutput(capped);
    expectSafeOutput(missing);
  });

  it("committed fake connector loop evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-fake-connector-loop.json");

    expect(evidence.youtubeLiveChatFakeConnectorLoopStatus).toBe("implemented");
    expect(evidence.maxCyclesStatus).toBe("pass");
    expect(evidence.sameFailureRepeatLimitStatus).toBe("pass");
    expect(evidence.safeFailureCapsuleStatus).toBe("pass");
    expect(evidence.noSleepStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
