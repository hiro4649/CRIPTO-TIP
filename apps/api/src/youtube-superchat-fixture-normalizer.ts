import { z } from "zod";
import {
  createIdempotencyKeyForSupportEvent,
  CurrencyCodeSchema,
  normalizeYouTubeSuperChatToSupportReceived,
  SourceEventIdSchema,
  YouTubeAmountMicrosSchema,
  YouTubeSuperChatInputSchema,
  type SupportReceived
} from "@cripto-tip/shared";

export const YouTubeSuperChatFixtureSchema = YouTubeSuperChatInputSchema.extend({
  live_chat_message_id: SourceEventIdSchema,
  stream_id: z.string().min(1).max(160),
  youtube_video_id: z.string().min(1).max(160).optional(),
  character_id: z.string().min(1).max(160),
  author_channel_id: z.string().min(1).max(160),
  author_display_name: z.string().min(1).max(120),
  amount_micros: YouTubeAmountMicrosSchema,
  currency: CurrencyCodeSchema,
  amount_display_string: z.string().min(1).max(80),
  tier: z.number().int().min(1).max(7),
  user_comment: z.string().max(500).default(""),
  published_at: z.string().datetime({ offset: true })
}).strict();

export type YouTubeSuperChatFixture = z.infer<typeof YouTubeSuperChatFixtureSchema>;

export type YouTubeSuperChatFixtureNormalization = {
  normalized_event: SupportReceived;
  normalization_status: "normalized";
  idempotency_key: string;
  safe_reason_codes: string[];
  side_effects: {
    support_event_persisted: "skipped";
    affinity_update: "skipped";
    reaction_enqueue: "skipped";
    overlay_enqueue: "skipped";
    outbox_enqueue: "skipped";
    external_execution: "skipped";
  };
};

const unsafeFixtureCommentPattern = /(https?:\/\/|www\.|ignore\s+previous|system\s+prompt|<script|<\/script|authorization|bearer|secret|token|api[_-]?key)/i;
const walletLikePattern = /0x[a-fA-F0-9]{40}/;

export function normalizeYouTubeSuperChatFixture(input: unknown): YouTubeSuperChatFixtureNormalization {
  const fixture = YouTubeSuperChatFixtureSchema.parse(input);
  const base = normalizeYouTubeSuperChatToSupportReceived(fixture);
  const emptyComment = fixture.user_comment.trim().length === 0;
  const unsafeComment = unsafeFixtureCommentPattern.test(fixture.user_comment) || walletLikePattern.test(fixture.user_comment);
  const normalized: SupportReceived = {
    ...base,
    support: {
      ...base.support,
      message: unsafeComment ? "" : base.support.message,
      message_moderation_status: unsafeComment ? "hold" : base.support.message_moderation_status
    },
    reaction_policy: {
      ...base.reaction_policy,
      can_say_name: !unsafeComment && base.reaction_policy.can_say_name,
      can_read_message: !emptyComment && !unsafeComment && base.reaction_policy.can_read_message
    }
  };
  return {
    normalized_event: normalized,
    normalization_status: "normalized",
    idempotency_key: createIdempotencyKeyForSupportEvent("youtube_super_chat", fixture.live_chat_message_id),
    safe_reason_codes: normalized.support.message_moderation_status === "approved"
      ? ["youtube_superchat_fixture_normalized"]
      : ["youtube_superchat_unsafe_input_held"],
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
