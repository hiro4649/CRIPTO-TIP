import type { FastifyInstance } from "fastify";
import type { SupportReceived } from "@cripto-tip/shared";
import { z } from "zod";
import {
  InternalYouTubeLiveChatFixtureCursorFailureStateSchema,
  toYouTubeLiveChatFixtureCursorResponse
} from "../youtube-live-chat-fixture-cursor-boundary.js";
import {
  advanceYouTubeLiveChatFixtureCursorPage,
  clearYouTubeLiveChatFixtureCursorFailureState,
  createOrGetYouTubeLiveChatFixtureCursor,
  createYouTubeLiveChatFixturePageFingerprint,
  extractSafeYouTubeLiveChatMessageIds,
  getYouTubeLiveChatFixtureCursor,
  getYouTubeLiveChatFixtureSuccessfulPageResult,
  guardYouTubeLiveChatFixturePageToken,
  hasYouTubeLiveChatFixturePageFingerprint,
  setYouTubeLiveChatFixtureCursorFailureState
} from "../youtube-live-chat-fixture-cursor-operations.js";
import { parseYouTubeLiveChatPageFixture } from "../youtube-live-chat-page-fixture-parser.js";
import { normalizeYouTubeSuperChatFixture } from "../youtube-superchat-fixture-normalizer.js";
import type { YouTubeFixtureRouteDependencies } from "./youtube-fixture-route-dependencies.js";

const InternalYouTubeLiveChatFixtureCursorCreateSchema = z.object({
  stream_id: z.string().min(1).max(160),
  youtube_video_id: z.string().min(1).max(160),
  live_chat_id: z.string().min(1).max(160),
  character_id: z.string().min(1).max(160)
}).strict();

const InternalYouTubeLiveChatFixtureCursorPageSchema = z.object({
  page_token: z.string().min(0).max(240).nullable().optional(),
  page: z.unknown()
}).strict();

function youtubeSuperChatFixtureInvalidResponse(error: unknown) {
  const issuePaths = error instanceof z.ZodError
    ? error.issues.map((issue) => issue.path.join(".")).filter(Boolean)
    : [];
  return {
    error: "youtube_superchat_fixture_invalid",
    safe_reason_codes: issuePaths.length ? issuePaths.map((issue) => `invalid_${issue}`) : ["youtube_superchat_fixture_invalid"],
    side_effects: {
      support_event_persisted: "skipped",
      affinity_update: "skipped",
      reaction_enqueue: "skipped",
      overlay_enqueue: "skipped",
      outbox_enqueue: "skipped",
      external_execution: "skipped"
    }
  };
}

export function registerYouTubeFixtureRoutes(app: FastifyInstance, deps: YouTubeFixtureRouteDependencies) {
  const { repo, requireInternalAuth, now, previewReactionDispatch, applySupportReceived } = deps;

  app.post("/internal/fixtures/youtube-superchat/normalize", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    try {
      const normalization = normalizeYouTubeSuperChatFixture(req.body);
      const contractPreview = await previewReactionDispatch(repo, normalization.normalized_event);
      if (contractPreview.contract_validation.status !== "valid") {
        return reply.code(409).send({
          error: "youtube_superchat_fixture_invalid",
          safe_reason_codes: contractPreview.contract_validation.errors,
          side_effects: normalization.side_effects
        });
      }
      return {
        ...normalization,
        contract_validation: contractPreview.contract_validation
      };
    } catch (error) {
      return reply.code(400).send(youtubeSuperChatFixtureInvalidResponse(error));
    }
  });

  app.post("/internal/fixtures/youtube-superchat/ingest", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    try {
      const normalization = normalizeYouTubeSuperChatFixture(req.body);
      const contractPreview = await previewReactionDispatch(repo, normalization.normalized_event);
      if (contractPreview.contract_validation.status !== "valid") {
        return reply.code(409).send({
          error: "youtube_superchat_fixture_invalid",
          safe_reason_codes: contractPreview.contract_validation.errors,
          side_effects: normalization.side_effects
        });
      }
      const result = await applySupportReceived(repo, normalization.normalized_event);
      return {
        ...(result as Record<string, unknown>),
        normalization_status: normalization.normalization_status,
        idempotency_key: normalization.idempotency_key,
        safe_reason_codes: normalization.safe_reason_codes,
        contract_validation: contractPreview.contract_validation
      };
    } catch (error) {
      return reply.code(400).send(youtubeSuperChatFixtureInvalidResponse(error));
    }
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const parsedInput = InternalYouTubeLiveChatFixtureCursorCreateSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return reply.code(400).send({ error: "youtube_live_chat_fixture_cursor_invalid", safe_reason_codes: ["character_id_required"] });
    }
    const result = createOrGetYouTubeLiveChatFixtureCursor(repo, parsedInput.data, now());
    return { cursor: toYouTubeLiveChatFixtureCursorResponse(result.cursor), idempotent: result.idempotent, safe_reason_codes: ["cursor_created"] };
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors/:cursorId/failure-state", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const parsedFailureState = InternalYouTubeLiveChatFixtureCursorFailureStateSchema.safeParse(req.body);
    if (!parsedFailureState.success) {
      return reply.code(400).send({ error: "youtube_live_chat_fixture_cursor_failure_state_invalid", safe_reason_codes: ["connector_failure_state_invalid"] });
    }
    const cursor = getYouTubeLiveChatFixtureCursor(repo, cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    setYouTubeLiveChatFixtureCursorFailureState(cursor, parsedFailureState.data, now());
    return {
      cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
      failure_state_status: "stored",
      safe_reason_codes: ["connector_failure_state_stored"]
    };
  });

  app.delete("/internal/fixtures/youtube-live-chat/cursors/:cursorId/failure-state", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const cursor = getYouTubeLiveChatFixtureCursor(repo, cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    clearYouTubeLiveChatFixtureCursorFailureState(cursor, now());
    return {
      cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
      failure_state_status: "cleared",
      safe_reason_codes: ["connector_failure_state_cleared"]
    };
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors/:cursorId/pages", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const input = InternalYouTubeLiveChatFixtureCursorPageSchema.parse(req.body);
    const cursor = getYouTubeLiveChatFixtureCursor(repo, cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    const pageToken = input.page_token ?? null;
    const fingerprint = createYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, pageToken, input.page);
    if (hasYouTubeLiveChatFixturePageFingerprint(cursor, fingerprint)) {
      return {
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_fingerprint: fingerprint, page_status: "page_replayed", safe_reason_codes: ["page_replayed"] },
        idempotent: true
      };
    }
    const tokenGuard = guardYouTubeLiveChatFixturePageToken(cursor, pageToken);
    if (!tokenGuard.allowed) {
      return reply.code(409).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_blocked", safe_reason_codes: tokenGuard.safe_reason_codes }
      });
    }
    let parsed: ReturnType<typeof parseYouTubeLiveChatPageFixture>;
    try {
      parsed = parseYouTubeLiveChatPageFixture({
        context: {
          stream_id: cursor.stream_id,
          character_id: cursor.character_id,
          youtube_video_id: cursor.youtube_video_id,
          live_chat_id: cursor.live_chat_id,
          page_token: pageToken ?? ""
        },
        page: input.page
      });
    } catch {
      return reply.code(400).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_invalid", safe_reason_codes: ["page_invalid"] }
      });
    }
    let crossPageDuplicates = 0;
    const acceptedEventIds: string[] = [];
    let lastMessageId = cursor.last_message_id;
    let lastMessagePublishedAt = cursor.last_message_published_at;
    for (const event of parsed.normalized_events) {
      if (cursor.seen_message_ids.has(event.source_event_id)) {
        crossPageDuplicates += 1;
        continue;
      }
      acceptedEventIds.push(event.source_event_id);
      lastMessageId = event.source_event_id;
      lastMessagePublishedAt = event.created_at;
    }
    advanceYouTubeLiveChatFixtureCursorPage(cursor, {
      page_token: pageToken,
      next_page_token: parsed.next_page_token,
      accepted_event_ids: acceptedEventIds,
      safe_message_ids: extractSafeYouTubeLiveChatMessageIds(input.page),
      last_message_id: lastMessageId,
      last_message_published_at: lastMessagePublishedAt,
      normalized_count: acceptedEventIds.length,
      duplicate_count: parsed.page_summary.duplicate_count + crossPageDuplicates,
      page_fingerprint: fingerprint,
      clear_failure_state: true,
      now: now()
    });
    return {
      cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
      page_result: {
        page_fingerprint: fingerprint,
        page_status: "page_ingested",
        safe_reason_codes: ["page_ingested"],
        page_summary: {
          ...parsed.page_summary,
          cross_page_duplicate_count: crossPageDuplicates
        },
        skipped_items: parsed.skipped_items
      },
      idempotent: false
    };
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors/:cursorId/pages/ingest", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const input = InternalYouTubeLiveChatFixtureCursorPageSchema.parse(req.body);
    const cursor = getYouTubeLiveChatFixtureCursor(repo, cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    const pageToken = input.page_token ?? null;
    const fingerprint = createYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, pageToken, input.page);
    const replay = getYouTubeLiveChatFixtureSuccessfulPageResult(cursor, fingerprint);
    if (replay) return { cursor: toYouTubeLiveChatFixtureCursorResponse(cursor), page_result: replay, idempotent: true };
    const tokenGuard = guardYouTubeLiveChatFixturePageToken(cursor, pageToken);
    if (!tokenGuard.allowed) {
      return reply.code(409).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_blocked", safe_reason_codes: tokenGuard.safe_reason_codes }
      });
    }
    let parsed: ReturnType<typeof parseYouTubeLiveChatPageFixture>;
    try {
      parsed = parseYouTubeLiveChatPageFixture({
        context: {
          stream_id: cursor.stream_id,
          character_id: cursor.character_id,
          youtube_video_id: cursor.youtube_video_id,
          live_chat_id: cursor.live_chat_id,
          page_token: pageToken ?? ""
        },
        page: input.page
      });
    } catch {
      return reply.code(400).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_invalid", safe_reason_codes: ["page_invalid"] }
      });
    }
    const eventsToApply: SupportReceived[] = [];
    let crossPageDuplicates = 0;
    for (const event of parsed.normalized_events) {
      if (cursor.seen_message_ids.has(event.source_event_id)) {
        crossPageDuplicates += 1;
        continue;
      }
      eventsToApply.push(event);
    }
    for (const event of eventsToApply) {
      const preview = await previewReactionDispatch(repo, event);
      if (preview.contract_validation.status !== "valid") {
        return reply.code(409).send({
          cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
          page_result: {
            page_status: "page_blocked",
            safe_reason_codes: ["contract_v2_invalid", ...preview.contract_validation.errors]
          }
        });
      }
    }
    const supportEvents = [];
    let persistedCount = 0;
    let idempotentCount = 0;
    let heldCount = 0;
    try {
      for (const event of eventsToApply) {
        const result = await applySupportReceived(repo, event) as { duplicate?: boolean; support_event: SupportReceived };
        const duplicate = "duplicate" in result && result.duplicate === true;
        if (duplicate) idempotentCount += 1;
        else persistedCount += 1;
        if (result.support_event.support.message_moderation_status === "hold") heldCount += 1;
        supportEvents.push({
          source_event_id: result.support_event.source_event_id,
          support_event_id: result.support_event.event_id,
          moderation_status: result.support_event.support.message_moderation_status,
          persistence_status: duplicate ? "idempotent" : "persisted"
        });
      }
    } catch {
      return reply.code(409).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_blocked", safe_reason_codes: ["support_received_apply_failed"] }
      });
    }
    let lastMessageId = cursor.last_message_id;
    let lastMessagePublishedAt = cursor.last_message_published_at;
    for (const event of eventsToApply) {
      lastMessageId = event.source_event_id;
      lastMessagePublishedAt = event.created_at;
    }
    const pageResult = {
      page_fingerprint: fingerprint,
      page_status: "page_ingested",
      cursor_id: cursor.cursor_id,
      page_token: pageToken,
      next_page_token: parsed.next_page_token,
      normalized_count: parsed.page_summary.normalized_count,
      persisted_count: persistedCount,
      idempotent_count: idempotentCount,
      held_count: heldCount,
      duplicate_count: parsed.page_summary.duplicate_count + crossPageDuplicates,
      skipped_count: parsed.page_summary.skipped_count,
      support_events: supportEvents,
      safe_reason_codes: ["page_ingested", "support_received_persisted"]
    };
    advanceYouTubeLiveChatFixtureCursorPage(cursor, {
      page_token: pageToken,
      next_page_token: parsed.next_page_token,
      accepted_event_ids: eventsToApply.map((event) => event.source_event_id),
      safe_message_ids: extractSafeYouTubeLiveChatMessageIds(input.page),
      last_message_id: lastMessageId,
      last_message_published_at: lastMessagePublishedAt,
      normalized_count: eventsToApply.length,
      duplicate_count: parsed.page_summary.duplicate_count + crossPageDuplicates,
      page_fingerprint: fingerprint,
      successful_page_result: pageResult,
      clear_failure_state: true,
      now: now()
    });
    return {
      cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
      page_result: pageResult,
      idempotent: false
    };
  });

  app.get("/internal/fixtures/youtube-live-chat/cursors/:cursorId", async (req, reply) => {
    if (!requireInternalAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const cursor = getYouTubeLiveChatFixtureCursor(repo, cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    return { cursor: toYouTubeLiveChatFixtureCursorResponse(cursor) };
  });
}
