import { z } from "zod";
import type { YouTubeLiveChatPlannerFailureClass } from "./youtube-live-chat-quota-polling-planner.js";

export type YouTubeLiveChatFixtureCursorStatus = "not_started" | "page_ingested" | "caught_up_fixture" | "cursor_blocked" | "cursor_superseded";

export const youtubeLiveChatPlannerFailureClasses = [
  "none",
  "quota_unavailable",
  "stream_disconnected",
  "page_token_invalid",
  "network_forbidden",
  "real_api_not_configured",
  "oauth_missing",
  "live_chat_ended",
  "live_chat_disabled",
  "live_chat_not_found",
  "rate_limit_exceeded",
  "upstream_unavailable"
] as const;

export type YouTubeLiveChatFixtureCursorState = {
  cursor_id: string;
  stream_id: string;
  youtube_video_id: string;
  live_chat_id: string;
  character_id: string;
  current_page_token: string | null;
  next_page_token: string | null;
  last_message_published_at: string | null;
  last_message_id: string | null;
  pages_ingested: number;
  messages_seen: number;
  super_chats_normalized: number;
  duplicates_skipped: number;
  cursor_status: YouTubeLiveChatFixtureCursorStatus;
  connector_failure_class?: YouTubeLiveChatPlannerFailureClass;
  connector_failure_count?: number;
  connector_failure_fingerprint?: string;
  created_at: string;
  updated_at: string;
  seen_message_ids: Set<string>;
  page_fingerprints: Set<string>;
  successful_page_results: Map<string, unknown>;
};

export const InternalYouTubeLiveChatFixtureCursorFailureStateSchema = z.object({
  failure_class: z.enum(youtubeLiveChatPlannerFailureClasses),
  failure_count: z.number().int().min(1).max(2),
  safe_failure_fingerprint: z.string().min(1).max(160).regex(/^p1_list_connector:[a-z0-9_:-]+$/)
}).strict();

export function toYouTubeLiveChatFixtureCursorResponse(cursor: YouTubeLiveChatFixtureCursorState) {
  return {
    cursor_id: cursor.cursor_id,
    stream_id: cursor.stream_id,
    youtube_video_id: cursor.youtube_video_id,
    live_chat_id: cursor.live_chat_id,
    character_id: cursor.character_id,
    current_page_token: cursor.current_page_token,
    next_page_token: cursor.next_page_token,
    last_message_published_at: cursor.last_message_published_at,
    last_message_id: cursor.last_message_id,
    pages_ingested: cursor.pages_ingested,
    messages_seen: cursor.messages_seen,
    super_chats_normalized: cursor.super_chats_normalized,
    duplicates_skipped: cursor.duplicates_skipped,
    cursor_status: cursor.cursor_status,
    connector_failure_class: cursor.connector_failure_class ?? "none",
    connector_failure_count: cursor.connector_failure_count ?? 0,
    connector_failure_fingerprint: cursor.connector_failure_fingerprint ?? null,
    created_at: cursor.created_at,
    updated_at: cursor.updated_at
  };
}

export function clearYouTubeLiveChatFixtureCursorFailureState(cursor: YouTubeLiveChatFixtureCursorState) {
  delete cursor.connector_failure_class;
  delete cursor.connector_failure_count;
  delete cursor.connector_failure_fingerprint;
}
