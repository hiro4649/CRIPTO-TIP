import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function cursorPayload() {
  return {
    stream_id: "stream_cursor_fixture",
    youtube_video_id: "yt_video_cursor_fixture",
    live_chat_id: "live_chat_cursor_fixture",
    character_id: "char_cursor_fixture"
  };
}

function superChat(id: string, nextComment = "Nice stream") {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T05:00:00.000Z",
      superChatDetails: {
        amountMicros: "1000000",
        currency: "JPY",
        amountDisplayString: "JPY 1,000",
        userComment: nextComment,
        tier: 2
      }
    },
    authorDetails: {
      channelId: `channel_${id}`,
      displayName: `Viewer ${id}`
    }
  };
}

function page(items: unknown[], nextPageToken: string | null = "page_2") {
  return nextPageToken === null
    ? { pollingIntervalMillis: 5000, items }
    : { nextPageToken, pollingIntervalMillis: 5000, items };
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

describe("P0 YouTube live chat fixture cursor boundary", () => {
  it("creates cursor idempotently and ingests pages with replay, token, duplicate, and malformed guards", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const unauthorized = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-live-chat/cursors", payload: cursorPayload() });
    expect(unauthorized.statusCode).toBe(401);
    const missingCharacter = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors",
      headers: { authorization: internalAuth },
      payload: {
        stream_id: "stream_cursor_fixture",
        youtube_video_id: "yt_video_cursor_fixture",
        live_chat_id: "live_chat_cursor_fixture"
      }
    });
    const create = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-live-chat/cursors", headers: { authorization: internalAuth }, payload: cursorPayload() });
    const duplicateCreate = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-live-chat/cursors", headers: { authorization: internalAuth }, payload: cursorPayload() });
    const differentVideo = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors",
      headers: { authorization: internalAuth },
      payload: { ...cursorPayload(), youtube_video_id: "yt_video_cursor_fixture_two" }
    });
    const differentCharacter = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors",
      headers: { authorization: internalAuth },
      payload: { ...cursorPayload(), character_id: "char_cursor_fixture_two" }
    });
    expect(create.statusCode).toBe(200);
    expect(missingCharacter.statusCode).toBe(400);
    expect(missingCharacter.json().safe_reason_codes).toContain("character_id_required");
    expect(duplicateCreate.statusCode).toBe(200);
    expect(differentVideo.statusCode).toBe(200);
    expect(differentCharacter.statusCode).toBe(200);
    expect(duplicateCreate.json().idempotent).toBe(true);
    const cursorId = create.json().cursor.cursor_id;
    expect(create.json().cursor.character_id).toBe("char_cursor_fixture");
    expect(differentVideo.json().cursor.cursor_id).not.toBe(cursorId);
    expect(differentCharacter.json().cursor.cursor_id).not.toBe(cursorId);
    expect(create.json().cursor.cursor_status).toBe("not_started");

    const firstPage = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: null, page: page([superChat("msg_1"), { id: "txt_1", snippet: { type: "textMessageEvent" } }], "page_2") }
    });
    const replay = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: null, page: page([superChat("msg_1"), { id: "txt_1", snippet: { type: "textMessageEvent" } }], "page_2") }
    });
    const wrongToken = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: "wrong_page", page: page([superChat("msg_wrong")], "page_3") }
    });
    const secondPage = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: "page_2", page: page([superChat("msg_1"), superChat("msg_2", "https://private.example/hook")], null) }
    });
    const malformed = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: "", page: { items: [], unknown: "field" } }
    });
    const detail = await app.inject({ method: "GET", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}`, headers: { authorization: internalAuth } });

    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json().cursor.pages_ingested).toBe(1);
    expect(firstPage.json().cursor.next_page_token).toBe("page_2");
    expect(firstPage.json().page_result.page_summary.normalized_count).toBe(1);
    expect(firstPage.json().page_result.page_summary.skipped_count).toBe(1);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().idempotent).toBe(true);
    expect(replay.json().page_result.safe_reason_codes).toContain("page_replayed");
    expect(wrongToken.statusCode).toBe(409);
    expect(wrongToken.json().page_result.safe_reason_codes).toContain("page_token_mismatch");
    expect(secondPage.statusCode).toBe(200);
    expect(secondPage.json().cursor.pages_ingested).toBe(2);
    expect(secondPage.json().cursor.cursor_status).toBe("caught_up_fixture");
    expect(secondPage.json().cursor.super_chats_normalized).toBe(2);
    expect(secondPage.json().cursor.duplicates_skipped).toBe(1);
    expect(malformed.statusCode).toBe(400);
    expect(detail.statusCode).toBe(200);
    expect(detail.json().cursor.pages_ingested).toBe(2);
    expect(detail.json().cursor.character_id).toBe("char_cursor_fixture");
    expectSafeOutput(firstPage.json());
    expectSafeOutput(secondPage.json());
    expectSafeOutput(malformed.json());
    await app.close();
  }, 60_000);

  it("committed youtube live chat fixture cursor evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-youtube-live-chat-fixture-cursor-boundary.json");

    expect(evidence.youtubeLiveChatFixtureCursorBoundaryStatus).toBe("implemented");
    expect(evidence.cursorCreateStatus).toBe("pass");
    expect(evidence.cursorCreateIdempotencyStatus).toBe("pass");
    expect(evidence.validFirstPageAdvanceStatus).toBe("pass");
    expect(evidence.validSecondPageAdvanceStatus).toBe("pass");
    expect(evidence.wrongTokenRejectedStatus).toBe("pass");
    expect(evidence.samePageReplayIdempotentStatus).toBe("pass");
    expect(evidence.duplicateAcrossPagesStatus).toBe("pass");
    expect(evidence.malformedPageNoAdvanceStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("stores and clears safe connector failure state on fixture cursors", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const create = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-live-chat/cursors", headers: { authorization: internalAuth }, payload: cursorPayload() });
    const cursorId = create.json().cursor.cursor_id;
    const storeFailure = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`,
      headers: { authorization: internalAuth },
      payload: {
        failure_class: "upstream_unavailable",
        failure_count: 1,
        safe_failure_fingerprint: "p1_list_connector:upstream_unavailable:injected_fetch_exception"
      }
    });
    const detail = await app.inject({ method: "GET", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}`, headers: { authorization: internalAuth } });
    const invalidFailure = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`,
      headers: { authorization: internalAuth },
      payload: {
        failure_class: "upstream_unavailable",
        failure_count: 3,
        safe_failure_fingerprint: "not-safe"
      }
    });
    const clearFailure = await app.inject({ method: "DELETE", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`, headers: { authorization: internalAuth } });

    expect(storeFailure.statusCode).toBe(200);
    expect(storeFailure.json().safe_reason_codes).toContain("connector_failure_state_stored");
    expect(detail.json().cursor).toMatchObject({
      connector_failure_class: "upstream_unavailable",
      connector_failure_count: 1,
      connector_failure_fingerprint: "p1_list_connector:upstream_unavailable:injected_fetch_exception"
    });
    expect(invalidFailure.statusCode).toBe(400);
    expect(clearFailure.statusCode).toBe(200);
    expect(clearFailure.json().cursor.connector_failure_class).toBe("none");
    expect(clearFailure.json().cursor.connector_failure_count).toBe(0);
    expect(clearFailure.json().cursor.connector_failure_fingerprint).toBeNull();
    expectSafeOutput(storeFailure.json());
    expectSafeOutput(detail.json());
    await app.close();
  });

  it("committed cursor path keeps character context explicit and does not persist support events", () => {
    const serverSource = fs.readFileSync(path.join(root, "apps", "api", "src", "server.ts"), "utf8");

    expect(serverSource).toContain("character_id: cursor.character_id");
    expect(serverSource).not.toContain('character_id: "char_mio",\n          youtube_video_id: cursor.youtube_video_id');
  });
});
