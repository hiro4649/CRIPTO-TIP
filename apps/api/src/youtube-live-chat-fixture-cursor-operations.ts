import { createHash } from "node:crypto";
import { stableId } from "@cripto-tip/shared";
import type { CriptoTipRepository } from "./repositories/types.js";
import {
  clearYouTubeLiveChatFixtureCursorFailureState as clearYouTubeLiveChatFixtureCursorFailureFields,
  getYouTubeLiveChatFixtureCursorStores,
  type YouTubeLiveChatFixtureCursorState
} from "./youtube-live-chat-fixture-cursor-boundary.js";
import type { YouTubeLiveChatPlannerFailureClass } from "./youtube-live-chat-quota-polling-planner.js";

export type YouTubeLiveChatFixtureCursorIdentityInput = {
  stream_id: string;
  youtube_video_id: string;
  live_chat_id: string;
  character_id: string;
};

export type YouTubeLiveChatFixtureCursorFailureStateInput = {
  failure_class: YouTubeLiveChatPlannerFailureClass;
  failure_count: number;
  safe_failure_fingerprint: string;
};

export type YouTubeLiveChatFixtureCursorCreateResult = {
  cursor: YouTubeLiveChatFixtureCursorState;
  idempotent: boolean;
  identity: string;
};

export type YouTubeLiveChatFixtureCursorTokenGuardResult =
  | { allowed: true }
  | { allowed: false; safe_reason_codes: ["page_token_mismatch", "page_out_of_order"] };

export type YouTubeLiveChatFixtureCursorPageAdvanceInput = {
  page_token: string | null;
  next_page_token: string | null;
  accepted_event_ids: string[];
  safe_message_ids: string[];
  last_message_id: string | null;
  last_message_published_at: string | null;
  normalized_count: number;
  duplicate_count: number;
  page_fingerprint: string;
  successful_page_result?: unknown;
  clear_failure_state: boolean;
  now: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashSafeMetadata(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createYouTubeLiveChatFixtureCursorIdentity(input: YouTubeLiveChatFixtureCursorIdentityInput) {
  return `${input.stream_id}:${input.youtube_video_id}:${input.live_chat_id}:${input.character_id}`;
}

export function createOrGetYouTubeLiveChatFixtureCursor(
  repo: CriptoTipRepository,
  input: YouTubeLiveChatFixtureCursorIdentityInput,
  now: string
): YouTubeLiveChatFixtureCursorCreateResult {
  const { cursors, identities } = getYouTubeLiveChatFixtureCursorStores(repo);
  const identity = createYouTubeLiveChatFixtureCursorIdentity(input);
  const existingId = identities.get(identity);
  if (existingId) {
    const existing = cursors.get(existingId);
    if (existing) return { cursor: existing, idempotent: true, identity };
  }
  const cursor: YouTubeLiveChatFixtureCursorState = {
    cursor_id: stableId("ytcursor", identity),
    stream_id: input.stream_id,
    youtube_video_id: input.youtube_video_id,
    live_chat_id: input.live_chat_id,
    character_id: input.character_id,
    current_page_token: null,
    next_page_token: null,
    last_message_published_at: null,
    last_message_id: null,
    pages_ingested: 0,
    messages_seen: 0,
    super_chats_normalized: 0,
    duplicates_skipped: 0,
    cursor_status: "not_started",
    created_at: now,
    updated_at: now,
    seen_message_ids: new Set<string>(),
    page_fingerprints: new Set<string>(),
    successful_page_results: new Map<string, unknown>()
  };
  cursors.set(cursor.cursor_id, cursor);
  identities.set(identity, cursor.cursor_id);
  return { cursor, idempotent: false, identity };
}

export function getYouTubeLiveChatFixtureCursor(repo: CriptoTipRepository, cursorId: string) {
  return getYouTubeLiveChatFixtureCursorStores(repo).cursors.get(cursorId) ?? null;
}

export function setYouTubeLiveChatFixtureCursorFailureState(
  cursor: YouTubeLiveChatFixtureCursorState,
  input: YouTubeLiveChatFixtureCursorFailureStateInput,
  now: string
) {
  cursor.connector_failure_class = input.failure_class;
  cursor.connector_failure_count = input.failure_count;
  cursor.connector_failure_fingerprint = input.safe_failure_fingerprint;
  cursor.updated_at = now;
}

export function clearYouTubeLiveChatFixtureCursorFailureState(cursor: YouTubeLiveChatFixtureCursorState, now: string) {
  clearYouTubeLiveChatFixtureCursorFailureFields(cursor);
  cursor.updated_at = now;
}

export function extractSafeYouTubeLiveChatMessageIds(page: unknown) {
  const record = typeof page === "object" && page !== null && !Array.isArray(page) ? page as Record<string, unknown> : {};
  const items = Array.isArray(record.items) ? record.items : [];
  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === "string" && id.trim().length > 0) ids.add(id);
  }
  return [...ids].sort();
}

export function createYouTubeLiveChatFixturePageFingerprint(cursorId: string, pageToken: string | null, page: unknown) {
  const record = typeof page === "object" && page !== null && !Array.isArray(page) ? page as Record<string, unknown> : {};
  return hashSafeMetadata({
    cursor_id: cursorId,
    input_page_token: pageToken ?? null,
    next_page_token: typeof record.nextPageToken === "string" ? record.nextPageToken : null,
    message_ids: extractSafeYouTubeLiveChatMessageIds(page)
  });
}

export function hasYouTubeLiveChatFixturePageFingerprint(cursor: YouTubeLiveChatFixtureCursorState, fingerprint: string) {
  return cursor.page_fingerprints.has(fingerprint);
}

export function getYouTubeLiveChatFixtureSuccessfulPageResult(cursor: YouTubeLiveChatFixtureCursorState, fingerprint: string) {
  return cursor.successful_page_results.get(fingerprint) ?? null;
}

export function guardYouTubeLiveChatFixturePageToken(
  cursor: YouTubeLiveChatFixtureCursorState,
  pageToken: string | null
): YouTubeLiveChatFixtureCursorTokenGuardResult {
  if ((cursor.next_page_token ?? "") === (pageToken ?? "")) return { allowed: true };
  return { allowed: false, safe_reason_codes: ["page_token_mismatch", "page_out_of_order"] };
}

export function advanceYouTubeLiveChatFixtureCursorPage(
  cursor: YouTubeLiveChatFixtureCursorState,
  input: YouTubeLiveChatFixtureCursorPageAdvanceInput
) {
  for (const eventId of input.accepted_event_ids) cursor.seen_message_ids.add(eventId);
  for (const messageId of input.safe_message_ids) cursor.seen_message_ids.add(messageId);
  cursor.last_message_id = input.last_message_id;
  cursor.last_message_published_at = input.last_message_published_at;
  cursor.current_page_token = input.page_token;
  cursor.next_page_token = input.next_page_token;
  cursor.pages_ingested += 1;
  cursor.messages_seen = cursor.seen_message_ids.size;
  cursor.super_chats_normalized += input.normalized_count;
  cursor.duplicates_skipped += input.duplicate_count;
  cursor.cursor_status = input.next_page_token ? "page_ingested" : "caught_up_fixture";
  if (input.clear_failure_state) clearYouTubeLiveChatFixtureCursorFailureFields(cursor);
  cursor.updated_at = input.now;
  cursor.page_fingerprints.add(input.page_fingerprint);
  if (input.successful_page_result !== undefined) {
    cursor.successful_page_results.set(input.page_fingerprint, input.successful_page_result);
  }
}
