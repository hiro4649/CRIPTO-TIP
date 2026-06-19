import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { InMemoryRepository } from "./repositories/in-memory.js";
import {
  advanceYouTubeLiveChatFixtureCursorPage,
  clearYouTubeLiveChatFixtureCursorFailureState,
  createOrGetYouTubeLiveChatFixtureCursor,
  createYouTubeLiveChatFixtureCursorIdentity,
  createYouTubeLiveChatFixturePageFingerprint,
  extractSafeYouTubeLiveChatMessageIds,
  getYouTubeLiveChatFixtureCursor,
  getYouTubeLiveChatFixtureSuccessfulPageResult,
  guardYouTubeLiveChatFixturePageToken,
  hasYouTubeLiveChatFixturePageFingerprint,
  setYouTubeLiveChatFixtureCursorFailureState
} from "./youtube-live-chat-fixture-cursor-operations.js";

const root = path.resolve(__dirname, "..", "..", "..");

function cursorInput(character_id = "char_ops") {
  return {
    stream_id: "stream_ops",
    youtube_video_id: "video_ops",
    live_chat_id: "chat_ops",
    character_id
  };
}

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 YouTube fixture cursor operations", () => {
  it("creates and looks up cursors idempotently with stable identity scope", () => {
    const repo = new InMemoryRepository();
    const first = createOrGetYouTubeLiveChatFixtureCursor(repo, cursorInput(), "2026-06-19T00:00:00.000Z");
    const duplicate = createOrGetYouTubeLiveChatFixtureCursor(repo, cursorInput(), "2026-06-19T00:01:00.000Z");
    const differentCharacter = createOrGetYouTubeLiveChatFixtureCursor(repo, cursorInput("char_ops_2"), "2026-06-19T00:02:00.000Z");

    expect(createYouTubeLiveChatFixtureCursorIdentity(cursorInput())).toBe("stream_ops:video_ops:chat_ops:char_ops");
    expect(first.idempotent).toBe(false);
    expect(duplicate.idempotent).toBe(true);
    expect(duplicate.cursor.cursor_id).toBe(first.cursor.cursor_id);
    expect(differentCharacter.cursor.cursor_id).not.toBe(first.cursor.cursor_id);
    expect(getYouTubeLiveChatFixtureCursor(repo, first.cursor.cursor_id)).toBe(first.cursor);
  });

  it("extracts safe message ids without unknown placeholders, duplicates, or blank ids", () => {
    const ids = extractSafeYouTubeLiveChatMessageIds({
      items: [
        { id: "msg_b" },
        { id: "" },
        { id: "msg_a" },
        { id: "msg_a" },
        { snippet: { type: "textMessageEvent" } },
        null,
        ["not_object"]
      ]
    });

    expect(ids).toEqual(["msg_a", "msg_b"]);
    expect(ids).not.toContain("unknown");
  });

  it("fingerprints safe page metadata and guards page-token ordering", () => {
    const repo = new InMemoryRepository();
    const { cursor } = createOrGetYouTubeLiveChatFixtureCursor(repo, cursorInput(), "2026-06-19T00:00:00.000Z");
    const page = { nextPageToken: "page_2", items: [{ id: "msg_b" }, { id: "msg_a" }, { id: "msg_a" }] };
    const firstFingerprint = createYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, null, page);
    const duplicateFingerprint = createYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, null, page);
    const nextFingerprint = createYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, "page_2", page);

    expect(firstFingerprint).toBe(duplicateFingerprint);
    expect(nextFingerprint).not.toBe(firstFingerprint);
    expect(guardYouTubeLiveChatFixturePageToken(cursor, "").allowed).toBe(true);
    cursor.next_page_token = "page_2";
    expect(guardYouTubeLiveChatFixturePageToken(cursor, "wrong")).toEqual({ allowed: false, safe_reason_codes: ["page_token_mismatch", "page_out_of_order"] });
  });

  it("stores, clears, and auto-clears connector failure state during page advance", () => {
    const repo = new InMemoryRepository();
    const { cursor } = createOrGetYouTubeLiveChatFixtureCursor(repo, cursorInput(), "2026-06-19T00:00:00.000Z");
    setYouTubeLiveChatFixtureCursorFailureState(cursor, {
      failure_class: "upstream_unavailable",
      failure_count: 1,
      safe_failure_fingerprint: "p1_list_connector:upstream_unavailable:ops_test"
    }, "2026-06-19T00:01:00.000Z");

    expect(cursor.connector_failure_class).toBe("upstream_unavailable");
    clearYouTubeLiveChatFixtureCursorFailureState(cursor, "2026-06-19T00:02:00.000Z");
    expect(cursor.connector_failure_class).toBeUndefined();
    setYouTubeLiveChatFixtureCursorFailureState(cursor, {
      failure_class: "rate_limit_exceeded",
      failure_count: 2,
      safe_failure_fingerprint: "p1_list_connector:rate_limit_exceeded:ops_test"
    }, "2026-06-19T00:03:00.000Z");

    const fingerprint = "safe_fingerprint_ops";
    advanceYouTubeLiveChatFixtureCursorPage(cursor, {
      page_token: null,
      next_page_token: "page_2",
      accepted_event_ids: ["msg_1"],
      safe_message_ids: ["msg_1", "txt_1"],
      last_message_id: "msg_1",
      last_message_published_at: "2026-06-19T00:04:00.000Z",
      normalized_count: 1,
      duplicate_count: 0,
      page_fingerprint: fingerprint,
      successful_page_result: { page_status: "page_ingested" },
      clear_failure_state: true,
      now: "2026-06-19T00:04:00.000Z"
    });

    expect(cursor.connector_failure_class).toBeUndefined();
    expect(cursor.pages_ingested).toBe(1);
    expect(cursor.messages_seen).toBe(2);
    expect(cursor.super_chats_normalized).toBe(1);
    expect(cursor.cursor_status).toBe("page_ingested");
    expect(hasYouTubeLiveChatFixturePageFingerprint(cursor, fingerprint)).toBe(true);
    expect(getYouTubeLiveChatFixtureSuccessfulPageResult(cursor, fingerprint)).toEqual({ page_status: "page_ingested" });
  });

  it("committed operations evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-fixture-cursor-operations.json");

    expect(evidence.fixtureCursorOperationsStatus).toBe("pass");
    expect(evidence.serverDirectCursorMutationStatus).toBe("removed");
    expect(evidence.safeMessageIdExtractionStatus).toBe("pass");
    expect(evidence.pageTokenGuardStatus).toBe("pass");
    expect(evidence.pageReplayStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("server cursor routes delegate operations instead of owning cursor mutations", () => {
    const serverSource = fs.readFileSync(path.join(root, "apps", "api", "src", "server.ts"), "utf8");

    expect(serverSource).not.toContain("function extractSafePageMessageIds");
    expect(serverSource).not.toContain("function toYouTubeLiveChatFixturePageFingerprint");
    expect(serverSource).not.toContain("getYouTubeLiveChatFixtureCursorStores(repo)");
    expect(serverSource).not.toMatch(/cursor\.connector_failure_(class|count|fingerprint)\s*=/);
    expect(serverSource).not.toMatch(/cursor\.(current_page_token|next_page_token|pages_ingested|messages_seen|super_chats_normalized|duplicates_skipped|cursor_status)\s*=/);
    expect(serverSource).not.toContain("cursor.page_fingerprints.add");
    expect(serverSource).not.toContain("cursor.successful_page_results.set");
  });
});
