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

function cursorPayload(overrides: Record<string, unknown> = {}) {
  return {
    stream_id: "stream_page_support_ingest",
    youtube_video_id: "yt_video_page_support_ingest",
    live_chat_id: "live_chat_page_support_ingest",
    character_id: "char_page_support_ingest",
    ...overrides
  };
}

function superChat(id: string, comment = "Please cheer for the stream") {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T05:45:00.000Z",
      superChatDetails: {
        amountMicros: "2500000",
        currency: "JPY",
        amountDisplayString: "JPY 2,500",
        userComment: comment,
        tier: 4
      }
    },
    authorDetails: {
      channelId: `channel_${id}`,
      displayName: `Viewer ${id}`
    }
  };
}

function page(items: unknown[], nextPageToken: string | null = null) {
  return nextPageToken === null
    ? { pollingIntervalMillis: 5000, items }
    : { nextPageToken, pollingIntervalMillis: 5000, items };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("raw_item");
  expect(serialized).not.toContain("JPY 2,500");
  expect(serialized).not.toContain("Viewer msg");
}

async function createCursor(app: ReturnType<typeof buildServer>, payload = cursorPayload()) {
  const response = await app.inject({
    method: "POST",
    url: "/internal/fixtures/youtube-live-chat/cursors",
    headers: { authorization: internalAuth },
    payload
  });
  expect(response.statusCode).toBe(200);
  return response.json().cursor.cursor_id as string;
}

describe("P0 YouTube live chat page support.received ingest", () => {
  it("persists approved and held page events through the explicit ingest route with replay and token guards", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const cursorId = await createCursor(app);

    const unauthorized = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`,
      payload: { page_token: null, page: page([superChat("msg_approved")]) }
    });
    expect(unauthorized.statusCode).toBe(401);

    const parseOnlyCursorId = await createCursor(app, cursorPayload({ live_chat_id: "live_chat_parse_only" }));
    const parseOnly = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${parseOnlyCursorId}/pages`,
      headers: { authorization: internalAuth },
      payload: { page_token: null, page: page([superChat("msg_parse_only")]) }
    });
    expect(parseOnly.statusCode).toBe(200);
    expect(repo.supportEvents.size).toBe(0);

    const firstPagePayload = {
      page_token: null,
      page: page([
        superChat("msg_approved"),
        superChat("msg_held", "visit https://private.example/hook Authorization Bearer secret"),
        { id: "txt_ignored", snippet: { type: "textMessageEvent" } }
      ], "page_2")
    };
    const firstPage = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`,
      headers: { authorization: internalAuth },
      payload: firstPagePayload
    });
    const replay = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`,
      headers: { authorization: internalAuth },
      payload: firstPagePayload
    });
    const wrongToken = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`,
      headers: { authorization: internalAuth },
      payload: { page_token: "wrong_page", page: page([superChat("msg_wrong")]) }
    });
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json().page_result.persisted_count).toBe(2);
    expect(firstPage.json().page_result.held_count).toBe(1);
    expect(firstPage.json().page_result.support_events).toHaveLength(2);
    expect(firstPage.json().cursor.character_id).toBe("char_page_support_ingest");
    expect(replay.statusCode).toBe(200);
    expect(replay.json().idempotent).toBe(true);
    expect(wrongToken.statusCode).toBe(409);
    expect(repo.supportEvents.size).toBe(2);
    const secondPage = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`,
      headers: { authorization: internalAuth },
      payload: { page_token: "page_2", page: page([superChat("msg_approved"), superChat("msg_second")], null) }
    });
    expect(secondPage.statusCode).toBe(200);
    expect(secondPage.json().page_result.persisted_count).toBe(1);
    expect(secondPage.json().page_result.duplicate_count).toBe(1);
    expect(repo.supportEvents.size).toBe(3);
    expect(repo.reactionRequests.size).toBe(2);
    expect(repo.overlayEvents.size).toBe(2);
    expect(repo.outboxEvents.size).toBe(4);
    expect(await repo.getSupportEventBySource("youtube_super_chat", "msg_approved")).toBeDefined();
    expect(await repo.getSupportEventBySource("youtube_super_chat", "msg_held")).toEqual(expect.objectContaining({
      support: expect.objectContaining({ message_moderation_status: "hold" })
    }));
    expectSafeOutput(firstPage.json());
    expectSafeOutput(replay.json());
    expectSafeOutput(secondPage.json());

    await app.close();
  }, 120_000);

  it("committed page support.received ingest evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-youtube-live-chat-page-support-received-ingest.json");

    expect(evidence.youtubeLiveChatPageSupportReceivedIngestStatus).toBe("implemented");
    expect(evidence.cursorContextStatus).toBe("pass");
    expect(evidence.pageTokenGuardStatus).toBe("pass");
    expect(evidence.pageReplayStatus).toBe("pass");
    expect(evidence.crossPageDedupStatus).toBe("pass");
    expect(evidence.contractPrevalidationStatus).toBe("pass");
    expect(evidence.supportReceivedPersistenceStatus).toBe("pass");
    expect(evidence.heldModerationStatus).toBe("pass");
    expect(evidence.sourceIdempotencyStatus).toBe("pass");
    expect(evidence.safeResultProjectionStatus).toBe("pass");
    expect(evidence.noDuplicateAffinityStatus).toBe("pass");
    expect(evidence.noDuplicateReactionStatus).toBe("pass");
    expect(evidence.noDuplicateOverlayStatus).toBe("pass");
    expect(evidence.noDuplicateOutboxStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawUnsafeMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
