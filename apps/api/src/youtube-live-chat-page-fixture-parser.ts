import { z } from "zod";
import { normalizeYouTubeSuperChatFixture } from "./youtube-superchat-fixture-normalizer.js";

const PageContextSchema = z.object({
  stream_id: z.string().min(1).max(160),
  character_id: z.string().min(1).max(160),
  youtube_video_id: z.string().min(1).max(160),
  live_chat_id: z.string().min(1).max(160),
  page_token: z.string().min(0).max(240).optional()
}).strict();

const PageRootSchema = z.object({
  nextPageToken: z.string().min(0).max(240).optional(),
  pollingIntervalMillis: z.number().int().min(0).max(300_000).optional(),
  items: z.array(z.unknown())
}).strict();

export type YouTubeLiveChatPageFixtureContext = z.infer<typeof PageContextSchema>;
export type YouTubeLiveChatPageFixtureParseResult = ReturnType<typeof parseYouTubeLiveChatPageFixture>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringAt(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function numberAt(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : undefined;
}

function safeSkipped(messageId: string, messageType: string, safeReasonCodes: string[]) {
  return {
    message_id: messageId,
    message_type: messageType,
    safe_reason_codes: safeReasonCodes
  };
}

function reasonFromFixtureError(error: unknown) {
  if (!(error instanceof z.ZodError)) return "malformed_super_chat";
  const paths = error.issues.map((issue) => issue.path.join("."));
  if (paths.some((path) => path.includes("amount_micros"))) return "invalid_amount";
  if (paths.some((path) => path.includes("currency"))) return "invalid_currency";
  if (paths.some((path) => path.includes("tier"))) return "invalid_tier";
  if (paths.some((path) => path.includes("published_at"))) return "invalid_published_at";
  if (paths.some((path) => path.includes("author"))) return "invalid_author_details";
  return "malformed_super_chat";
}

export function parseYouTubeLiveChatPageFixture(input: { context: unknown; page: unknown }) {
  const context = PageContextSchema.parse(input.context);
  const page = PageRootSchema.parse(input.page);
  const seenMessageIds = new Set<string>();
  const normalizedEvents = [];
  const skippedItems = [];
  let superChatItems = 0;
  let duplicateCount = 0;

  for (const rawItem of page.items) {
    const item = asRecord(rawItem);
    const snippet = asRecord(item?.snippet);
    const details = asRecord(snippet?.superChatDetails);
    const author = asRecord(item?.authorDetails);
    const messageId = stringAt(item, "id") ?? "unknown";
    const messageType = stringAt(snippet, "type") ?? "unknown";

    if (seenMessageIds.has(messageId)) {
      duplicateCount += 1;
      skippedItems.push(safeSkipped(messageId, messageType, ["duplicate_message_id"]));
      continue;
    }
    seenMessageIds.add(messageId);

    if (messageType !== "superChatEvent") {
      skippedItems.push(safeSkipped(messageId, messageType, ["unsupported_message_type"]));
      continue;
    }
    superChatItems += 1;
    if (!details) {
      skippedItems.push(safeSkipped(messageId, messageType, ["missing_super_chat_details"]));
      continue;
    }
    if (!stringAt(author, "channelId") || !stringAt(author, "displayName")) {
      skippedItems.push(safeSkipped(messageId, messageType, ["invalid_author_details"]));
      continue;
    }

    try {
      const normalization = normalizeYouTubeSuperChatFixture({
        live_chat_message_id: messageId,
        stream_id: context.stream_id,
        youtube_video_id: context.youtube_video_id,
        character_id: context.character_id,
        author_channel_id: stringAt(author, "channelId"),
        author_display_name: stringAt(author, "displayName"),
        amount_micros: stringAt(details, "amountMicros"),
        currency: stringAt(details, "currency"),
        amount_display_string: stringAt(details, "amountDisplayString"),
        tier: numberAt(details, "tier"),
        user_comment: stringAt(details, "userComment") ?? "",
        published_at: stringAt(snippet, "publishedAt")
      });
      normalizedEvents.push(normalization.normalized_event);
    } catch (error) {
      skippedItems.push(safeSkipped(messageId, messageType, [reasonFromFixtureError(error)]));
    }
  }

  const heldCount = normalizedEvents.filter((event) => event.support.message_moderation_status === "hold").length;
  return {
    page_token: context.page_token ?? null,
    next_page_token: page.nextPageToken ?? null,
    youtube_page_token: page.nextPageToken ?? null,
    polling_interval_ms: page.pollingIntervalMillis ?? null,
    normalized_events: normalizedEvents,
    skipped_items: skippedItems,
    page_summary: {
      total_items: page.items.length,
      super_chat_items: superChatItems,
      normalized_count: normalizedEvents.length,
      held_count: heldCount,
      skipped_count: skippedItems.length,
      duplicate_count: duplicateCount
    }
  };
}
