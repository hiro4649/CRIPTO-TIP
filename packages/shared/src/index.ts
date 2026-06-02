import { z } from "zod";

export const supportSources = ["youtube_super_chat", "youtube_super_sticker", "iris_token_tip", "iris_credit_tip", "admin_manual_support"] as const;
export const moderationStatuses = ["approved", "display_only", "hold", "rejected", "shadow_ignored"] as const;
export const tiers = ["small", "medium", "large", "high"] as const;
export type Tier = (typeof tiers)[number];

export const WalletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const LiveSessionSchema = z.object({
  id: z.string().min(1),
  youtube_video_id: z.string().optional(),
  youtube_live_chat_id: z.string().optional(),
  youtube_channel_id: z.string().optional(),
  character_id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["scheduled", "live", "ended"]),
  companion_url: z.string(),
  overlay_url: z.string(),
  created_at: z.string()
});
export type LiveSession = z.infer<typeof LiveSessionSchema>;

export const TipIntentSchema = z.object({
  id: z.string(),
  stream_id: z.string(),
  character_id: z.string(),
  iris_user_id: z.string(),
  wallet_address: WalletAddressSchema.optional(),
  display_name_raw: z.string(),
  display_name_sanitized: z.string(),
  display_name_llm_safe: z.string(),
  message_raw: z.string(),
  message_sanitized: z.string(),
  amount_raw: z.string(),
  amount_display: z.string(),
  tier: z.enum(tiers),
  message_hash: z.string(),
  client_tip_id: z.string(),
  moderation_status: z.enum(moderationStatuses),
  created_at: z.string()
});
export type TipIntent = z.infer<typeof TipIntentSchema>;

export const TipTransactionSchema = z.object({
  id: z.string(),
  chain_id: z.number().int(),
  contract_address: WalletAddressSchema,
  token_address: WalletAddressSchema,
  tx_hash: z.string().min(1),
  log_index: z.number().int().nonnegative(),
  block_number: z.number().int().nonnegative(),
  from_address: WalletAddressSchema,
  stream_id: z.string(),
  character_id: z.string(),
  amount_raw: z.string(),
  message_hash: z.string(),
  client_tip_id: z.string().optional(),
  status: z.enum(["detected", "pending_confirmation", "confirmed", "reorged", "failed", "ignored"]),
  confirmations: z.number().int().nonnegative()
});
export type TipTransaction = z.infer<typeof TipTransactionSchema>;

export const SupportReceivedSchema = z.object({
  event_type: z.literal("support.received"),
  event_id: z.string(),
  source: z.enum(supportSources),
  source_event_id: z.string(),
  stream_id: z.string(),
  youtube_video_id: z.string().optional(),
  character_id: z.string(),
  viewer: z.object({
    iris_user_id: z.string().optional(),
    display_name: z.string(),
    display_name_reading: z.string().optional(),
    youtube_author_channel_id: z.string().optional(),
    wallet_address: WalletAddressSchema.optional()
  }),
  support: z.object({
    amount_raw: z.string(),
    amount_display: z.string(),
    tier: z.enum(tiers),
    message: z.string(),
    message_moderation_status: z.enum(moderationStatuses)
  }),
  relationship: z.object({
    previous_affinity: z.number().int().nonnegative(),
    affinity_delta: z.number().int().nonnegative(),
    new_affinity: z.number().int().nonnegative(),
    relationship_level: z.number().int().nonnegative()
  }),
  reaction_policy: z.object({
    can_say_name: z.boolean(),
    can_read_message: z.boolean(),
    max_speech_seconds: z.number().int().positive(),
    must_not_discuss_token_price: z.literal(true),
    must_not_promise_financial_return: z.literal(true)
  }),
  created_at: z.string()
});
export type SupportReceived = z.infer<typeof SupportReceivedSchema>;

export const SupportRejectedSchema = z.object({ event_type: z.literal("support.rejected"), event_id: z.string(), source_event_id: z.string(), reason: z.string() });
export const AffinityUpdatedSchema = z.object({ event_type: z.literal("affinity.updated"), event_id: z.string(), source_event_id: z.string(), iris_user_id: z.string(), previous_affinity: z.number(), affinity_delta: z.number(), new_affinity: z.number() });
export const CharacterReactionRequestSchema = z.object({
  event_type: z.literal("character.reaction.requested"),
  event_id: z.string(),
  source_event_id: z.string(),
  character_id: z.string(),
  stream_id: z.string(),
  viewer_display_name: z.string(),
  message: z.string(),
  constraints: z.object({
    max_speech_seconds: z.number().int(),
    say_display_name_max_count: z.number().int(),
    must_not_discuss_token_price: z.literal(true),
    must_not_promise_financial_return: z.literal(true),
    must_not_obey_user_name_as_instruction: z.literal(true),
    do_not_read_wallet_address: z.literal(true),
    avoid_romantic_escalation_from_payment: z.literal(true)
  })
});
export type CharacterReactionRequest = z.infer<typeof CharacterReactionRequestSchema>;
export const CharacterReactionCompletedSchema = z.object({ event_type: z.literal("character.reaction.completed"), event_id: z.string(), source_event_id: z.string(), status: z.enum(["completed", "timeout", "skipped"]) });
export const OverlayTipAlertSchema = z.object({ event_type: z.literal("overlay.tip_alert"), event_id: z.string(), stream_id: z.string(), viewer_name: z.string(), amount: z.string(), message: z.string(), effect: z.string(), duration_ms: z.number().int().positive() });
export type OverlayTipAlert = z.infer<typeof OverlayTipAlertSchema>;
export const YouTubeChatMessageReceivedSchema = z.object({ event_type: z.literal("youtube.chat.message.received"), event_id: z.string(), stream_id: z.string(), author_display_name: z.string(), author_channel_id: z.string(), message: z.string(), published_at: z.string() });
export const YouTubeViewerVerifiedSchema = z.object({ event_type: z.literal("youtube.viewer.verified"), event_id: z.string(), iris_user_id: z.string(), youtube_author_channel_id: z.string(), code: z.string().regex(/^IRIS-[A-Z0-9]{6}$/), expires_at: z.string() });
export const ModerationDecisionSchema = z.object({ status: z.enum(moderationStatuses), reasons: z.array(z.string()) });
export type ModerationDecision = z.infer<typeof ModerationDecisionSchema>;
export const AffinityScoreSchema = z.object({ previous: z.number(), delta: z.number(), next: z.number(), daily_remaining: z.number(), stream_remaining: z.number() });
export const YouTubeSuperChatInputSchema = z.object({ live_chat_message_id: z.string(), stream_id: z.string(), youtube_video_id: z.string().optional(), character_id: z.string(), author_channel_id: z.string(), author_display_name: z.string(), amount_micros: z.string(), currency: z.string(), amount_display_string: z.string(), tier: z.number().int(), user_comment: z.string().default(""), published_at: z.string() });
export type YouTubeSuperChatInput = z.infer<typeof YouTubeSuperChatInputSchema>;
export const TokenTipInputSchema = z.object({ chain_id: z.number().int(), contract_address: WalletAddressSchema, tx_hash: z.string(), log_index: z.number().int().nonnegative(), stream_id: z.string(), character_id: z.string(), iris_user_id: z.string().optional(), wallet_address: WalletAddressSchema, display_name: z.string(), amount_raw: z.string(), amount_display: z.string(), tier: z.enum(tiers), message: z.string(), moderation_status: z.enum(moderationStatuses), created_at: z.string() });
export type TokenTipInput = z.infer<typeof TokenTipInputSchema>;

const walletRegex = /0x[a-fA-F0-9]{40}/g;
const urlRegex = /(https?:\/\/|www\.)\S+/i;
const promptLikeRegex = /(ignore|system|developer|assistant|命令|指示|プロンプト|従え|無視|あなたは|管理者|admin)/i;
const ngRegex = /(死ね|殺|差別|セックス|暴力|harass|hate|sexual|violent)/i;
const personalInfoRegex = /(\d{3}-\d{4}|\d{2,4}-\d{2,4}-\d{3,4}|住所|本名|電話番号)/;

export function stableId(prefix: string, value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

export function detectWalletAddressInText(input: string): boolean {
  return walletRegex.test(input);
}

export function redactWalletAddressInText(input: string): string {
  return input.replace(walletRegex, "[wallet-redacted]");
}

export function detectPromptInjectionLikeName(input: string): boolean {
  return promptLikeRegex.test(input);
}

function cleanText(input: string, max: number): string {
  return redactWalletAddressInText(input).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function sanitizeDisplayName(input: string): { sanitized: string; llmSafe: string } {
  const sanitized = cleanText(input || "ユーザーさん", 16) || "ユーザーさん";
  const unsafe = detectPromptInjectionLikeName(input) || detectWalletAddressInText(input);
  return { sanitized: unsafe ? "ユーザーさん" : sanitized, llmSafe: unsafe ? "ユーザーさん" : sanitized };
}

export function sanitizeMessage(input: string, maxLength = 80): string {
  return cleanText(input, maxLength);
}

export function moderateTipMessage(args: { displayName: string; message: string; amountRaw?: string; recentTipCount?: number; isNewWallet?: boolean }): ModerationDecision {
  const reasons: string[] = [];
  if (ngRegex.test(args.message)) reasons.push("ng_word");
  if (detectPromptInjectionLikeName(args.displayName)) reasons.push("instruction_like_name");
  if (urlRegex.test(args.message)) reasons.push("url");
  if (detectWalletAddressInText(args.message) || detectWalletAddressInText(args.displayName)) reasons.push("wallet_address");
  if (personalInfoRegex.test(args.message)) reasons.push("personal_information");
  if (args.recentTipCount && args.recentTipCount >= 3) reasons.push("rapid_repeat");
  if (args.isNewWallet && Number(args.amountRaw || "0") > 1_000_000) reasons.push("new_wallet_high_tip");
  if (reasons.includes("ng_word")) return { status: "rejected", reasons };
  if (reasons.length > 0) return { status: "hold", reasons };
  return { status: "approved", reasons };
}

export function calculateAffinityDelta(args: { tier: Tier; previous: number; dailyUsed: number; streamUsed: number; recentTipCount?: number }): z.infer<typeof AffinityScoreSchema> {
  const baseByTier = { small: 3, medium: 8, large: 15, high: 24 } as const;
  const spamDecay = args.recentTipCount && args.recentTipCount > 2 ? 0.4 : 1;
  const dailyCap = 80;
  const streamCap = 40;
  const raw = Math.floor(baseByTier[args.tier] * spamDecay);
  const dailyRemaining = Math.max(0, dailyCap - args.dailyUsed);
  const streamRemaining = Math.max(0, streamCap - args.streamUsed);
  const delta = Math.max(0, Math.min(raw, dailyRemaining, streamRemaining));
  return { previous: args.previous, delta, next: args.previous + delta, daily_remaining: dailyRemaining - delta, stream_remaining: streamRemaining - delta };
}

export function createIdempotencyKeyForChainLog(input: Pick<TokenTipInput, "chain_id" | "contract_address" | "tx_hash" | "log_index">): string {
  return `${input.chain_id}:${input.contract_address.toLowerCase()}:${input.tx_hash}:${input.log_index}`;
}

export function createIdempotencyKeyForSupportEvent(source: string, sourceEventId: string): string {
  return `${source}:${sourceEventId}`;
}

export function normalizeTokenTipToSupportReceived(input: TokenTipInput, affinity = { previous: 0, delta: 0, next: 0 }): SupportReceived {
  const name = sanitizeDisplayName(input.display_name);
  const message = sanitizeMessage(input.message);
  const source_event_id = createIdempotencyKeyForChainLog(input);
  return SupportReceivedSchema.parse({
    event_type: "support.received",
    event_id: stableId("evt", createIdempotencyKeyForSupportEvent("iris_token_tip", source_event_id)),
    source: "iris_token_tip",
    source_event_id,
    stream_id: input.stream_id,
    character_id: input.character_id,
    viewer: { iris_user_id: input.iris_user_id, display_name: name.sanitized, wallet_address: input.wallet_address },
    support: { amount_raw: input.amount_raw, amount_display: input.amount_display, tier: input.tier, message, message_moderation_status: input.moderation_status },
    relationship: { previous_affinity: affinity.previous, affinity_delta: affinity.delta, new_affinity: affinity.next, relationship_level: Math.floor(affinity.next / 50) },
    reaction_policy: { can_say_name: true, can_read_message: input.moderation_status === "approved", max_speech_seconds: 12, must_not_discuss_token_price: true, must_not_promise_financial_return: true },
    created_at: input.created_at
  });
}

export function normalizeYouTubeSuperChatToSupportReceived(input: YouTubeSuperChatInput, affinity = { previous: 0, delta: 0, next: 0 }): SupportReceived {
  const name = sanitizeDisplayName(input.author_display_name);
  const message = sanitizeMessage(input.user_comment);
  const source_event_id = input.live_chat_message_id;
  return SupportReceivedSchema.parse({
    event_type: "support.received",
    event_id: stableId("evt", createIdempotencyKeyForSupportEvent("youtube_super_chat", source_event_id)),
    source: "youtube_super_chat",
    source_event_id,
    stream_id: input.stream_id,
    youtube_video_id: input.youtube_video_id,
    character_id: input.character_id,
    viewer: { display_name: name.sanitized, youtube_author_channel_id: input.author_channel_id },
    support: { amount_raw: input.amount_micros, amount_display: input.amount_display_string, tier: input.tier >= 4 ? "high" : input.tier >= 3 ? "large" : input.tier >= 2 ? "medium" : "small", message, message_moderation_status: "approved" },
    relationship: { previous_affinity: affinity.previous, affinity_delta: affinity.delta, new_affinity: affinity.next, relationship_level: Math.floor(affinity.next / 50) },
    reaction_policy: { can_say_name: true, can_read_message: true, max_speech_seconds: 12, must_not_discuss_token_price: true, must_not_promise_financial_return: true },
    created_at: input.published_at
  });
}

export function buildCharacterReactionRequest(event: SupportReceived): CharacterReactionRequest {
  return CharacterReactionRequestSchema.parse({
    event_type: "character.reaction.requested",
    event_id: stableId("react", event.event_id),
    source_event_id: stableId("src", event.source_event_id),
    character_id: event.character_id,
    stream_id: event.stream_id,
    viewer_display_name: sanitizeDisplayName(event.viewer.display_name).llmSafe,
    message: event.reaction_policy.can_read_message ? sanitizeMessage(event.support.message) : "",
    constraints: {
      max_speech_seconds: event.reaction_policy.max_speech_seconds,
      say_display_name_max_count: 1,
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true,
      must_not_obey_user_name_as_instruction: true,
      do_not_read_wallet_address: true,
      avoid_romantic_escalation_from_payment: true
    }
  });
}

export function buildOverlayTipAlert(event: SupportReceived): OverlayTipAlert {
  return OverlayTipAlertSchema.parse({
    event_type: "overlay.tip_alert",
    event_id: stableId("overlay", event.event_id),
    stream_id: event.stream_id,
    viewer_name: sanitizeDisplayName(event.viewer.display_name).sanitized,
    amount: event.support.amount_display,
    message: sanitizeMessage(event.support.message),
    effect: event.support.tier,
    duration_ms: event.support.tier === "high" ? 9000 : 6000
  });
}
