import Fastify, { type FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  buildCharacterReactionRequest,
  buildOverlayTipAlert,
  calculateAffinityDelta,
  canApplyAffinity,
  canEmitOverlay,
  canRequestAiReaction,
  createIdempotencyKeyForChainLog,
  createPublicId,
  moderateTipMessage,
  normalizeTokenTipToSupportReceived,
  normalizeYouTubeSuperChatToSupportReceived,
  sanitizeDisplayName,
  sanitizeMessage,
  sha256Bytes32Hex,
  stableId,
  moderationStatuses,
  supportSources,
  TipIntentSchema,
  SupportReceivedSchema,
  YouTubeSuperChatInputSchema,
  type LiveSession,
  type ModerationStatus,
  type OverlayTipAlert,
  type SupportReceived,
  type Tier,
  type TipIntent
} from "@cripto-tip/shared";
import { loadConfig } from "./config/env.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { AuditLogInput, CriptoTipRepository, JobType } from "./repositories/types.js";

loadConfig();
const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const ADMIN_TOKEN = process.env.MOCK_ADMIN_TOKEN ?? mockValue("admin");
const INTERNAL_TOKEN = process.env.MOCK_INTERNAL_TOKEN ?? mockValue("internal");
const OVERLAY_TOKEN = process.env.MOCK_OVERLAY_TOKEN ?? mockValue("overlay");
const PORT = Number(process.env.API_PORT ?? 4000);

type Store = {
  overlayClients: Map<string, Set<{ send: (payload: string) => void }>>;
};

type AdminRateLimitBucket = {
  count: number;
  resetAt: number;
};

const ADMIN_RATE_LIMIT_WINDOW_MS = 60_000;
const ADMIN_RATE_LIMIT_MAX_REQUESTS = 3;

export const repository = new InMemoryRepository();
export const store: Store = { overlayClients: new Map() };

function requireBearer(req: FastifyRequest, expected: string): boolean {
  return req.headers.authorization === `Bearer ${expected}`;
}

function adminTokenFingerprint(req: FastifyRequest): string {
  return createHash("sha256").update(String(req.headers.authorization ?? "")).digest("hex").slice(0, 16);
}

function checkAdminRateLimit(
  buckets: Map<string, AdminRateLimitBucket>,
  req: FastifyRequest,
  scope: "dlq_list" | "dlq_retry" | "audit_export",
  now = Date.now()
) {
  const key = `${scope}:${adminTokenFingerprint(req)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + ADMIN_RATE_LIMIT_WINDOW_MS });
    return { allowed: true as const };
  }
  if (current.count >= ADMIN_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false as const,
      response: {
        error: "rate_limited",
        scope,
        retry_after_seconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      }
    };
  }
  current.count += 1;
  return { allowed: true as const };
}

function emitOverlay(alert: OverlayTipAlert) {
  const clients = store.overlayClients.get(alert.stream_id);
  if (!clients) return;
  for (const client of clients) client.send(JSON.stringify(alert));
}

export function isOverlayTokenValid(token: string | undefined): boolean {
  return token === OVERLAY_TOKEN;
}

type SupportPipelineFailureReason = "affinity_apply_failed" | "reaction_enqueue_failed" | "overlay_enqueue_failed";
type AdminDlqSafePayload = ReturnType<typeof supportFailureSafeSummary>;
const RETRYABLE_SUPPORT_PIPELINE_FAILURE_REASONS: ReadonlySet<SupportPipelineFailureReason> = new Set([
  "affinity_apply_failed",
  "reaction_enqueue_failed",
  "overlay_enqueue_failed"
]);

function isAdminDlqSafePayload(payload: unknown): payload is AdminDlqSafePayload {
  if (typeof payload !== "object" || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return ["event_id", "source", "source_event_id", "stream_id", "character_id", "reason_code"].every((key) => typeof record[key] === "string");
}

function supportFailureSafeSummary(support: SupportReceived, reasonCode: SupportPipelineFailureReason) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    reason_code: reasonCode
  };
}

function toAdminDlqListEntry(deadLetter: Awaited<ReturnType<CriptoTipRepository["listDeadLetters"]>>[number]) {
  const payload = isAdminDlqSafePayload(deadLetter.payload_json) ? deadLetter.payload_json : undefined;
  return {
    id: deadLetter.id,
    original_event_id: deadLetter.original_event_id,
    job_type: deadLetter.job_type,
    retry_count: deadLetter.retry_count,
    failed_at: deadLetter.failed_at,
    created_at: deadLetter.created_at,
    retry_status: "candidate",
    event_id: payload?.event_id,
    source: payload?.source,
    source_event_id: payload?.source_event_id,
    stream_id: payload?.stream_id,
    character_id: payload?.character_id,
    reason_code: payload?.reason_code
  };
}

function toAdminDlqRetryEntry(
  deadLetter: Awaited<ReturnType<CriptoTipRepository["listDeadLetters"]>>[number],
  retriedOutboxEventId: string
) {
  const payload = isAdminDlqSafePayload(deadLetter.payload_json) ? deadLetter.payload_json : undefined;
  if (!payload) return undefined;
  if (!RETRYABLE_SUPPORT_PIPELINE_FAILURE_REASONS.has(payload.reason_code as SupportPipelineFailureReason)) return undefined;
  return {
    id: deadLetter.id,
    original_event_id: deadLetter.original_event_id,
    job_type: deadLetter.job_type,
    retry_count: deadLetter.retry_count,
    failed_at: deadLetter.failed_at,
    created_at: deadLetter.created_at,
    retry_status: "retry_queued",
    retried_outbox_event_id: retriedOutboxEventId,
    event_id: payload.event_id,
    source: payload.source,
    source_event_id: payload.source_event_id,
    stream_id: payload.stream_id,
    character_id: payload.character_id,
    reason_code: payload.reason_code
  };
}

function toAdminDlqListAuditMetadata(streamId: string, resultCount: number) {
  return { stream_id: streamId, result_count: resultCount };
}

function toOverlayResendAuditMetadata(support: SupportReceived, resendSourceEventId: string, resendStatus: "queued" | "duplicate") {
  return {
    event_id: support.event_id,
    source_event_id: resendSourceEventId,
    stream_id: support.stream_id,
    character_id: support.character_id,
    resend_status: resendStatus,
    overlay_status: resendStatus,
    outbox_status: resendStatus
  };
}

function toReactionResendAuditMetadata(support: SupportReceived, resendSourceEventId: string, resendStatus: "queued" | "duplicate") {
  return {
    event_id: support.event_id,
    source_event_id: resendSourceEventId,
    stream_id: support.stream_id,
    character_id: support.character_id,
    resend_status: resendStatus,
    reaction_status: resendStatus,
    outbox_status: resendStatus
  };
}

const ADMIN_AUDIT_ACTIONS = new Set(["approve_tip", "reject_tip", "list_dead_letters", "retry_dead_letter", "list_held_support", "approve_held_support", "reject_held_support", "create_manual_support", "adjust_support_event", "resend_overlay", "resend_reaction"]);
const ADMIN_AUDIT_TARGET_TYPES = new Set(["support_event", "dlq_list", "dead_letter_event", "held_support_list"]);
const ADMIN_AUDIT_SAFE_METADATA_KEYS = new Set([
  "stream_id",
  "result_count",
  "request_id",
  "operator_note",
  "outbox_event_id",
  "event_id",
  "source",
  "source_event_id",
  "character_id",
  "reason_code",
  "retry_status",
  "target_id",
  "review_status",
  "moderation_status",
  "resend_status",
  "overlay_status",
  "reaction_status",
  "outbox_status"
]);
const ADMIN_AUDIT_UNSAFE_KEY_PATTERN = /(raw|payload|secret|token|oauth|database|db_url|wallet|private|stack|stdout|stderr|logs_url|jobs_url|url)/i;
const ADMIN_AUDIT_UNSAFE_VALUE_PATTERN = /(bearer\s+|postgres:\/\/|redis:\/\/|kafka:\/\/|mongodb:\/\/|mysql:\/\/|https?:\/\/)/i;

function isSafeAuditPrimitive(value: unknown): value is string | number | boolean | null {
  if (value === null || typeof value === "number" || typeof value === "boolean") return true;
  return typeof value === "string" && !ADMIN_AUDIT_UNSAFE_VALUE_PATTERN.test(value);
}

function toSafeAuditMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return { redacted: true };
  const input = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (ADMIN_AUDIT_UNSAFE_KEY_PATTERN.test(key)) return { redacted: true };
    if (!ADMIN_AUDIT_SAFE_METADATA_KEYS.has(key)) continue;
    if (!isSafeAuditPrimitive(entry)) return { redacted: true };
    output[key] = entry;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

function toAdminAuditSafeSummary(log: AuditLogInput) {
  if (!ADMIN_AUDIT_ACTIONS.has(log.action)) return undefined;
  if (!ADMIN_AUDIT_TARGET_TYPES.has(log.target_type)) return undefined;
  const before = toSafeAuditMetadata(log.before_json);
  const after = toSafeAuditMetadata(log.after_json);
  const summary: {
    actor_type: string;
    actor_id?: string;
    action: string;
    target_type: string;
    target_id: string;
    before_json?: Record<string, string | number | boolean | null>;
    after_json?: Record<string, string | number | boolean | null>;
  } = {
    actor_type: log.actor_type,
    action: log.action,
    target_type: log.target_type,
    target_id: log.target_id
  };
  if (log.actor_id && !ADMIN_AUDIT_UNSAFE_VALUE_PATTERN.test(log.actor_id)) summary.actor_id = log.actor_id;
  if (before) summary.before_json = before;
  if (after) summary.after_json = after;
  return summary;
}

function auditSummaryMatchesStream(summary: ReturnType<typeof toAdminAuditSafeSummary>, streamId: string | undefined) {
  if (!summary || !streamId) return true;
  return summary.target_id === streamId || summary.before_json?.stream_id === streamId || summary.after_json?.stream_id === streamId;
}

function countDeadLettersByStream(deadLetters: Awaited<ReturnType<CriptoTipRepository["listDeadLetters"]>>) {
  const counts: Record<string, number> = {};
  for (const deadLetter of deadLetters) {
    const streamId = isAdminDlqSafePayload(deadLetter.payload_json) ? deadLetter.payload_json.stream_id : "unknown";
    counts[streamId] = (counts[streamId] ?? 0) + 1;
  }
  return counts;
}

function countAuditActions(logs: AuditLogInput[]) {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    if (!ADMIN_AUDIT_ACTIONS.has(log.action)) continue;
    counts[log.action] = (counts[log.action] ?? 0) + 1;
  }
  return counts;
}

function summarizeAdminRateLimits(buckets: Map<string, AdminRateLimitBucket>) {
  const activeBucketsByScope: Record<"dlq_list" | "dlq_retry" | "audit_export", number> = {
    dlq_list: 0,
    dlq_retry: 0,
    audit_export: 0
  };
  for (const key of buckets.keys()) {
    const [scope] = key.split(":");
    if (scope === "dlq_list" || scope === "dlq_retry" || scope === "audit_export") {
      activeBucketsByScope[scope] += 1;
    }
  }
  return {
    storage: "in_memory",
    key_material: "redacted",
    active_buckets_by_scope: activeBucketsByScope
  };
}

function summarizeAdminRateLimitConfig() {
  return {
    storage: "in_memory",
    key_material: "redacted",
    window_ms: ADMIN_RATE_LIMIT_WINDOW_MS,
    max_requests: ADMIN_RATE_LIMIT_MAX_REQUESTS,
    scopes: {
      dlq_list: { enabled: true },
      dlq_retry: { enabled: true },
      audit_export: { enabled: true }
    }
  };
}

function toAdminHeldSupportEntry(support: SupportReceived) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    viewer_display_name: sanitizeDisplayName(support.viewer.display_name).sanitized,
    amount_display: support.support.amount_display,
    tier: support.support.tier,
    moderation_status: support.support.message_moderation_status,
    created_at: support.created_at
  };
}

function toHeldSupportAuditMetadata(support: SupportReceived, reviewStatus: "approved" | "rejected") {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    review_status: reviewStatus,
    moderation_status: support.support.message_moderation_status
  };
}

function buildModerationQueueSummary(
  held: SupportReceived[],
  reviewed: Awaited<ReturnType<CriptoTipRepository["listSupportModerationReviewStatuses"]>>
) {
  const perStream: Record<string, { held_count: number; approved_count: number; rejected_count: number }> = {};
  const ensureStream = (streamId: string) => {
    perStream[streamId] ??= { held_count: 0, approved_count: 0, rejected_count: 0 };
    return perStream[streamId];
  };
  let newestHeldAt: string | undefined;
  for (const event of held) {
    ensureStream(event.stream_id).held_count += 1;
    if (!newestHeldAt || event.created_at > newestHeldAt) newestHeldAt = event.created_at;
  }
  for (const entry of reviewed) {
    const stream = ensureStream(entry.stream_id);
    if (entry.status === "approved") stream.approved_count += 1;
    if (entry.status === "rejected") stream.rejected_count += 1;
  }
  return {
    status: "ok",
    generated_at: new Date().toISOString(),
    held_count: held.length,
    approved_count: reviewed.filter((entry) => entry.status === "approved").length,
    rejected_count: reviewed.filter((entry) => entry.status === "rejected").length,
    blocked_transition_count: 0,
    per_stream: perStream,
    newest_held_at: newestHeldAt
  };
}

async function buildReviewedSupport(repo: CriptoTipRepository, support: SupportReceived, status: "approved" | "rejected") {
  const previous = support.viewer.iris_user_id ? await repo.getCurrentAffinity(support.viewer.iris_user_id, support.character_id) : support.relationship.previous_affinity;
  const affinity = status === "approved"
    ? calculateAffinityDelta({ tier: support.support.tier, previous, dailyUsed: 0, streamUsed: 0 })
    : { previous, delta: 0, next: previous };
  return SupportReceivedSchema.parse({
    ...support,
    support: {
      ...support.support,
      message: sanitizeMessage(support.support.message),
      message_moderation_status: status
    },
    relationship: {
      previous_affinity: affinity.previous,
      affinity_delta: affinity.delta,
      new_affinity: affinity.next,
      relationship_level: Math.floor(affinity.next / 50)
    },
    reaction_policy: {
      ...support.reaction_policy,
      can_say_name: status === "approved",
      can_read_message: status === "approved",
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true
    }
  });
}

async function recordSupportPipelineDlq(repo: CriptoTipRepository, support: SupportReceived, jobType: JobType, reasonCode: SupportPipelineFailureReason) {
  const dlqJobId = stableId("outbox", `support-pipeline-dlq:${reasonCode}:${support.source}:${support.source_event_id}`);
  const job = await repo.enqueueOutbox({
    id: dlqJobId,
    job_type: jobType,
    aggregate_type: "support_event",
    aggregate_id: support.event_id,
    idempotency_key: `support-pipeline-dlq:${reasonCode}:${support.source}:${support.source_event_id}`,
    payload_json: supportFailureSafeSummary(support, reasonCode),
    max_retry_count: 1
  });
  return repo.failOutboxJob(job.id, reasonCode);
}

async function applySupportReceivedEffects(repo: CriptoTipRepository, support: SupportReceived) {
  if (canApplyAffinity(support.support.message_moderation_status) && support.viewer.iris_user_id) {
    try {
      await repo.applyAffinityIfAbsent({
        id: createPublicId("aff"),
        source_event_id: support.source_event_id,
        iris_user_id: support.viewer.iris_user_id,
        character_id: support.character_id,
        previous_affinity: support.relationship.previous_affinity,
        affinity_delta: support.relationship.affinity_delta,
        new_affinity: support.relationship.new_affinity,
        reason: "support.received",
        created_at: new Date().toISOString()
      });
    } catch {
      const dead_letter_event = await recordSupportPipelineDlq(repo, support, "affinity.apply", "affinity_apply_failed");
      return {
        support_event: support,
        failure: { reason_code: "affinity_apply_failed", mode: "fail_closed" },
        dead_letter_event
      };
    }
  }

  const overlay = canEmitOverlay(support.support.message_moderation_status) ? buildOverlayTipAlert(support) : undefined;
  if (overlay) {
    await repo.createOverlayEventIfAbsent(support.source_event_id, support.stream_id, overlay);
    try {
      await repo.enqueueOutbox({ id: createPublicId("outbox"), job_type: "overlay.emit", aggregate_type: "support_event", aggregate_id: support.event_id, idempotency_key: `overlay.emit:${support.source_event_id}:${support.stream_id}`, payload_json: overlay });
      emitOverlay(overlay);
    } catch {
      await recordSupportPipelineDlq(repo, support, "overlay.emit", "overlay_enqueue_failed");
    }
  }

  const reactionRequest = canRequestAiReaction(support.support.message_moderation_status) ? buildCharacterReactionRequest(support) : undefined;
  if (reactionRequest) {
    await repo.createReactionRequestIfAbsent(support.source_event_id, support.character_id, reactionRequest);
    try {
      await repo.enqueueOutbox({ id: createPublicId("outbox"), job_type: "reaction.request", aggregate_type: "support_event", aggregate_id: support.event_id, idempotency_key: `reaction.request:${support.source_event_id}:${support.character_id}`, payload_json: reactionRequest });
    } catch {
      await recordSupportPipelineDlq(repo, support, "reaction.request", "reaction_enqueue_failed");
    }
  }

  return {
    support_event: support,
    character_reaction_request: reactionRequest,
    overlay
  };
}

async function applySupportReceivedSideEffects(repo: CriptoTipRepository, support: SupportReceived) {
  const createdSupport = await repo.createSupportEventIfAbsent(support);
  if (!createdSupport.created) return { support_event: createdSupport.event, duplicate: true };
  return applySupportReceivedEffects(repo, support);
}

const TipIntentRequestSchema = z.object({
  iris_user_id: z.string().default("usr_mock"),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  display_name: z.string().min(1),
  message: z.string().default(""),
  amount_raw: z.string(),
  amount_display: z.string(),
  tier: z.enum(["small", "medium", "large", "high"])
});

const AdminManualSupportRequestSchema = z.object({
  request_id: z.string().min(1).max(80),
  stream_id: z.string().min(1).max(120),
  character_id: z.string().min(1).max(120),
  display_name: z.string().min(1).max(120),
  tier: z.enum(["small", "medium", "large", "high"]),
  message: z.string().default(""),
  moderation_status: z.enum(["approved", "hold", "rejected"])
});

type AdminManualSupportRequest = z.infer<typeof AdminManualSupportRequestSchema>;

const SupportEventAdjustmentSchema = z.object({
  display_name_sanitized: z.string().min(1).max(120).optional(),
  message_moderation_status: z.enum(["approved", "hold", "rejected"]).optional(),
  tier: z.enum(["small", "medium", "large", "high"]).optional(),
  operator_note: z.string().max(160).optional()
});

const AdminSupportEventSearchQuerySchema = z.object({
  stream_id: z.string().optional(),
  character_id: z.string().optional(),
  source: z.enum(supportSources).optional(),
  message_moderation_status: z.enum(moderationStatuses).optional(),
  delivery_status: z.enum(["pending", "retrying", "delivered", "failed"]).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const ADMIN_SUPPORT_BULK_REVIEW_PREVIEW_MAX_EVENTS = 50;
const AdminSupportBulkReviewPreviewRequestSchema = z.object({
  event_ids: z.array(z.string().min(1).max(160)).min(1).max(ADMIN_SUPPORT_BULK_REVIEW_PREVIEW_MAX_EVENTS)
});
const AdminSupportBulkReviewApplyRequestSchema = AdminSupportBulkReviewPreviewRequestSchema.extend({
  action: z.enum(["approve_hold", "reject_hold"])
});
const ADMIN_SUPPORT_BULK_REVIEW_ACTIONS = [
  "approve_hold",
  "reject_hold",
  "view_timeline",
  "view_side_effects",
  "overlay_resend",
  "reaction_resend",
  "adjust_safe_fields",
  "bulk_preview"
] as const;
type AdminSupportBulkReviewAction = typeof ADMIN_SUPPORT_BULK_REVIEW_ACTIONS[number];
type AdminSupportActionPlanBlockedReason =
  | "already_approved"
  | "already_rejected"
  | "held_requires_review"
  | "unsupported_source"
  | "side_effect_already_applied"
  | "state_transition_blocked";

const FORBIDDEN_SUPPORT_ADJUSTMENT_FIELDS = new Set([
  "amount_raw",
  "amount_display",
  "currency_or_token",
  "wallet_address",
  "youtube_author_channel_id",
  "source",
  "source_event_id",
  "stream_id",
  "character_id",
  "affinity_delta",
  "relationship",
  "message",
  "raw_message",
  "raw_payload",
  "payload"
]);

async function buildAdminManualSupport(repo: CriptoTipRepository, input: AdminManualSupportRequest) {
  const displayName = sanitizeDisplayName(input.display_name);
  const message = sanitizeMessage(input.message);
  const source_event_id = stableId("adminmanual", input.request_id);
  const irisUserId = stableId("adminusr", input.request_id);
  const previous = await repo.getCurrentAffinity(irisUserId, input.character_id);
  const affinity = input.moderation_status === "approved"
    ? calculateAffinityDelta({ tier: input.tier as Tier, previous, dailyUsed: 0, streamUsed: 0 })
    : { previous, delta: 0, next: previous };
  return SupportReceivedSchema.parse({
    event_type: "support.received",
    event_id: stableId("evt", `admin_manual_support:${source_event_id}`),
    source: "admin_manual_support",
    source_event_id,
    stream_id: input.stream_id,
    character_id: input.character_id,
    viewer: {
      iris_user_id: irisUserId,
      display_name: displayName.sanitized
    },
    support: {
      amount_raw: "0",
      amount_display: "manual support",
      tier: input.tier,
      message,
      message_moderation_status: input.moderation_status as ModerationStatus
    },
    relationship: {
      previous_affinity: affinity.previous,
      affinity_delta: affinity.delta,
      new_affinity: affinity.next,
      relationship_level: Math.floor(affinity.next / 50)
    },
    reaction_policy: {
      can_say_name: input.moderation_status === "approved",
      can_read_message: input.moderation_status === "approved",
      max_speech_seconds: 12,
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true
    },
    created_at: new Date().toISOString()
  });
}

function toAdminManualSupportAuditMetadata(input: AdminManualSupportRequest, support: SupportReceived) {
  return {
    request_id: input.request_id,
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    moderation_status: support.support.message_moderation_status
  };
}

function toSupportAdjustmentSafeEntry(support: SupportReceived) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    viewer_display_name: sanitizeDisplayName(support.viewer.display_name).sanitized,
    tier: support.support.tier,
    moderation_status: support.support.message_moderation_status,
    created_at: support.created_at
  };
}

function toSupportAdjustmentAuditMetadata(support: SupportReceived, operatorNote?: string) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    moderation_status: support.support.message_moderation_status,
    operator_note: operatorNote ? sanitizeMessage(operatorNote, 80) : undefined
  };
}

function toAdminSupportBulkReviewPreviewEntry(eventId: string, support?: SupportReceived) {
  if (!support) {
    return {
      event_id: eventId,
      exists: false,
      eligible_actions: [] as AdminSupportBulkReviewAction[],
      ineligible_reason: "not_found"
    };
  }
  const baseActions: AdminSupportBulkReviewAction[] = ["view_timeline", "view_side_effects", "adjust_safe_fields"];
  const moderationStatus = support.support.message_moderation_status;
  const moderationActions: AdminSupportBulkReviewAction[] = moderationStatus === "hold" ? ["approve_hold", "reject_hold"] : [];
  const resendActions: AdminSupportBulkReviewAction[] = moderationStatus === "approved" ? ["overlay_resend", "reaction_resend"] : [];
  return {
    event_id: support.event_id,
    exists: true,
    stream_id: support.stream_id,
    character_id: support.character_id,
    source: support.source,
    moderation_status: moderationStatus,
    eligible_actions: [...moderationActions, ...baseActions, ...resendActions],
    ineligible_reason: moderationStatus === "rejected" ? "rejected_support_event" : undefined
  };
}

async function toAdminSupportEventActionPlan(repo: CriptoTipRepository, support: SupportReceived) {
  const moderationStatus = support.support.message_moderation_status;
  const reviewStatus = await repo.getSupportModerationReviewStatus(support.event_id);
  const ledger = await repo.getSupportSideEffectLedger(support);
  const timeline = await repo.getSupportEventTimeline(support);
  const eligibleActions: AdminSupportBulkReviewAction[] = [...ADMIN_SUPPORT_BULK_REVIEW_ACTIONS];
  const blockedActions: { action: AdminSupportBulkReviewAction; reason: AdminSupportActionPlanBlockedReason }[] = [];
  const block = (action: AdminSupportBulkReviewAction, reason: AdminSupportActionPlanBlockedReason) => blockedActions.push({ action, reason });

  if (moderationStatus === "hold" && !reviewStatus) {
    block("overlay_resend", "held_requires_review");
    block("reaction_resend", "held_requires_review");
  } else if (reviewStatus === "approved" || moderationStatus === "approved") {
    block("approve_hold", "already_approved");
    block("reject_hold", "already_approved");
    if (ledger.overlay_requested) block("overlay_resend", "side_effect_already_applied");
    if (ledger.reaction_requested) block("reaction_resend", "side_effect_already_applied");
  } else if (reviewStatus === "rejected" || moderationStatus === "rejected") {
    block("approve_hold", "already_rejected");
    block("reject_hold", "already_rejected");
    block("overlay_resend", "already_rejected");
    block("reaction_resend", "already_rejected");
  } else {
    block("approve_hold", "state_transition_blocked");
    block("reject_hold", "state_transition_blocked");
    block("overlay_resend", "state_transition_blocked");
    block("reaction_resend", "state_transition_blocked");
  }

  if (!supportSources.includes(support.source)) {
    block("approve_hold", "unsupported_source");
    block("reject_hold", "unsupported_source");
  }

  return {
    support_event: {
      event_id: support.event_id,
      moderation_status: moderationStatus,
      review_status: reviewStatus ?? "not_reviewed",
      delivery_status: "pending",
      source: support.source,
      stream_id: support.stream_id,
      character_id: support.character_id
    },
    eligible_actions: eligibleActions,
    blocked_actions: blockedActions,
    side_effects: {
      affinity_applied: ledger.affinity_applied,
      reaction_requested: ledger.reaction_requested,
      overlay_requested: ledger.overlay_requested,
      outbox_enqueued: ledger.outbox_enqueued,
      resend_candidates: ledger.resend_candidates
    },
    timeline_ref: {
      event_id: support.event_id,
      entry_count: timeline.entries.length
    }
  };
}

function toAdminBulkModerationSideEffects(status: "enqueued" | "skipped") {
  return {
    affinity: status === "enqueued",
    reaction_request: status === "enqueued",
    overlay: status === "enqueued",
    outbox: status === "enqueued"
  };
}

function toAdminBulkModerationSkippedEntry(eventId: string, action: "approve_hold" | "reject_hold", reason: string) {
  return {
    event_id: eventId,
    status: reason === "not_found" ? "failed" : "skipped",
    action,
    reason,
    side_effects_applied: toAdminBulkModerationSideEffects("skipped")
  };
}

async function applyAdminBulkModerationItem(repo: CriptoTipRepository, eventId: string, action: "approve_hold" | "reject_hold") {
  const support = await repo.getSupportEventById(eventId);
  if (!support) return toAdminBulkModerationSkippedEntry(eventId, action, "not_found");
  const existingReview = await repo.getSupportModerationReviewStatus(eventId);
  if (existingReview === "approved") return toAdminBulkModerationSkippedEntry(eventId, action, "already_approved");
  if (existingReview === "rejected") return toAdminBulkModerationSkippedEntry(eventId, action, "already_rejected");
  if (support.support.message_moderation_status !== "hold") return toAdminBulkModerationSkippedEntry(eventId, action, `not_hold_${support.support.message_moderation_status}`);

  if (action === "reject_hold") {
    const rejected = await buildReviewedSupport(repo, support, "rejected");
    await repo.updateSupportEvent(rejected);
    await repo.setSupportModerationReviewStatus(eventId, "rejected");
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reject_held_support",
      target_type: "support_event",
      target_id: eventId,
      after_json: toHeldSupportAuditMetadata(rejected, "rejected")
    });
    return {
      event_id: eventId,
      status: "applied",
      action,
      reason: "rejected_hold",
      side_effects_applied: toAdminBulkModerationSideEffects("skipped")
    };
  }

  const approved = await buildReviewedSupport(repo, support, "approved");
  await repo.updateSupportEvent(approved);
  const effects = await applySupportReceivedEffects(repo, approved);
  await repo.setSupportModerationReviewStatus(eventId, "approved");
  await repo.writeAuditLog({
    actor_type: "admin",
    actor_id: "admin_mock",
    action: "approve_held_support",
    target_type: "support_event",
    target_id: eventId,
    after_json: toHeldSupportAuditMetadata(approved, "approved")
  });
  return {
    event_id: eventId,
    status: "applied",
    action,
    reason: "approved_hold",
    side_effects_applied: {
      affinity: Boolean(approved.viewer.iris_user_id),
      reaction_request: Boolean(effects.character_reaction_request),
      overlay: Boolean(effects.overlay),
      outbox: Boolean(effects.character_reaction_request || effects.overlay)
    }
  };
}

export function buildServer(repo: CriptoTipRepository = repository) {
  const app = Fastify({ logger: false });
  const adminRateLimitBuckets = new Map<string, AdminRateLimitBucket>();
  app.register(websocket);

  app.get("/health", async () => ({ ok: true, service: "cripto-tip-api" }));

  app.get("/api/live/:streamId", async (req) => {
    const params = z.object({ streamId: z.string() }).parse(req.params);
    const existing = await repo.getLiveSession(params.streamId);
    if (existing) return existing;
    const session: LiveSession = {
      id: params.streamId,
      youtube_video_id: "mock-youtube-video",
      youtube_channel_id: "mock-channel",
      character_id: "char_mio",
      title: "IRIS LIVE mock session",
      status: "live",
      companion_url: `/live/${params.streamId}`,
      overlay_url: `/overlay/${params.streamId}`,
      created_at: new Date().toISOString()
    };
    return repo.createLiveSession(session);
  });

  app.post("/api/wallet/nonce", async (req) => {
    const body = z.object({ wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).parse(req.body);
    return { nonce: createPublicId("nonce"), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
  });

  app.post("/api/wallet/verify", async (req) => {
    z.object({ wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), nonce: z.string(), signature: z.string().min(1) }).parse(req.body);
    return { iris_user_id: "usr_mock", verified: true };
  });

  app.post("/api/live/:streamId/tip-intents", async (req) => {
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    const body = TipIntentRequestSchema.parse(req.body);
    const displayName = sanitizeDisplayName(body.display_name);
    const message = sanitizeMessage(body.message);
    const recentTipCount = body.wallet_address ? await repo.getRecentTipCountByWallet(body.wallet_address) : 0;
    const moderation = moderateTipMessage({ displayName: body.display_name, message: body.message, amountRaw: body.amount_raw, recentTipCount, isNewWallet: recentTipCount === 0 });
    const id = createPublicId("tipi");
    const clientTipSeed = `${streamId}:${body.iris_user_id}:${id}`;
    const tipIntent = TipIntentSchema.parse({
      id,
      stream_id: streamId,
      character_id: "char_mio",
      iris_user_id: body.iris_user_id,
      wallet_address: body.wallet_address,
      display_name_raw: body.display_name,
      display_name_sanitized: displayName.sanitized,
      display_name_llm_safe: displayName.llmSafe,
      message_raw: body.message,
      message_sanitized: message,
      amount_raw: body.amount_raw,
      amount_display: body.amount_display,
      tier: body.tier,
      message_hash: await sha256Bytes32Hex(message),
      client_tip_id: await sha256Bytes32Hex(clientTipSeed),
      moderation_status: moderation.status,
      created_at: new Date().toISOString()
    });
    await repo.createTipIntent(tipIntent);
    if (body.wallet_address) await repo.recordRecentTipByWallet(body.wallet_address);
    return { tip_intent: await repo.getTipIntentPublic(id), moderation };
  });

  app.get("/api/tip-intents/:tipIntentId", async (req) => {
    const { tipIntentId } = z.object({ tipIntentId: z.string() }).parse(req.params);
    return (await repo.getTipIntentPublic(tipIntentId)) ?? { error: "not_found" };
  });

  app.post("/internal/events", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const rawBody = z.record(z.string(), z.unknown()).parse(req.body);
    if (rawBody.event_type === "support.received") {
      const support = SupportReceivedSchema.parse(rawBody);
      return applySupportReceivedSideEffects(repo, support);
    }
    const body = z.object({ tip_intent_id: z.string(), tx_hash: z.string().default("0xmock"), log_index: z.number().int().default(0) }).parse(req.body);
    const intent = await repo.getTipIntentInternal(body.tip_intent_id);
    if (!intent) return reply.code(404).send({ error: "tip_intent_not_found" });
    const source_event_id = createIdempotencyKeyForChainLog({
      chain_id: 31337,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: body.tx_hash,
      log_index: body.log_index
    });
    const supportKey = `iris_token_tip:${source_event_id}`;
    const existing = await repo.getSupportEventBySource("iris_token_tip", source_event_id);
    if (existing) {
      return { support_event: existing, duplicate: true };
    }
    if (intent.moderation_status === "hold") return { status: "hold", reason: "admin_approval_required" };
    if (intent.moderation_status === "rejected" || intent.moderation_status === "shadow_ignored") return { status: intent.moderation_status };
    const previous = await repo.getCurrentAffinity(intent.iris_user_id, intent.character_id);
    const affinity = canApplyAffinity(intent.moderation_status) ? calculateAffinityDelta({ tier: intent.tier, previous, dailyUsed: 0, streamUsed: 0 }) : { previous, delta: 0, next: previous };
    const support = normalizeTokenTipToSupportReceived({
      chain_id: 31337,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: body.tx_hash,
      log_index: body.log_index,
      stream_id: intent.stream_id,
      character_id: intent.character_id,
      iris_user_id: intent.iris_user_id,
      wallet_address: intent.wallet_address ?? "0x1111111111111111111111111111111111111111",
      display_name: intent.display_name_llm_safe,
      amount_raw: intent.amount_raw,
      amount_display: intent.amount_display,
      tier: intent.tier,
      message: intent.message_sanitized,
      moderation_status: intent.moderation_status,
      created_at: new Date().toISOString()
    }, { previous: affinity.previous, delta: affinity.delta, next: affinity.next });
    return applySupportReceivedSideEffects(repo, support);
  });

  app.post("/internal/youtube/super-chat-fixtures", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const input = YouTubeSuperChatInputSchema.parse(req.body);
    const irisUserId = stableId("ytusr", input.author_channel_id);
    const existing = await repo.getSupportEventBySource("youtube_super_chat", input.live_chat_message_id);
    if (existing) return { support_event: existing, duplicate: true };
    const moderation = moderateTipMessage({ displayName: input.author_display_name, message: input.user_comment, amountRaw: input.amount_micros });
    const previous = await repo.getCurrentAffinity(irisUserId, input.character_id);
    const tier = input.tier >= 4 ? "high" : input.tier >= 3 ? "large" : input.tier >= 2 ? "medium" : "small";
    const affinity = canApplyAffinity(moderation.status) ? calculateAffinityDelta({ tier, previous, dailyUsed: 0, streamUsed: 0 }) : { previous, delta: 0, next: previous };
    const normalized = normalizeYouTubeSuperChatToSupportReceived(input, { previous: affinity.previous, delta: affinity.delta, next: affinity.next });
    const support: SupportReceived = {
      ...normalized,
      viewer: { ...normalized.viewer, iris_user_id: irisUserId }
    };
    return applySupportReceivedSideEffects(repo, support);
  });

  app.get("/admin/live-sessions/:streamId/tips", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    return repo.listSupportEventsByStream(streamId);
  });

  app.get("/admin/moderation/held-support", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = z.object({ stream_id: z.string().optional() }).parse(req.query);
    const held = await repo.listHeldSupportEvents(query.stream_id ? { streamId: query.stream_id } : undefined);
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "list_held_support",
      target_type: "held_support_list",
      target_id: query.stream_id ?? "all",
      after_json: { stream_id: query.stream_id ?? "all", result_count: held.length }
    });
    return { held_support: held.map(toAdminHeldSupportEntry) };
  });

  app.get("/admin/moderation/summary", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const held = await repo.listHeldSupportEvents();
    const reviewed = await repo.listSupportModerationReviewStatuses();
    return buildModerationQueueSummary(held, reviewed);
  });

  app.get("/admin/support-events", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminSupportEventSearchQuerySchema.parse(req.query);
    const filter: Parameters<CriptoTipRepository["searchSupportEvents"]>[0] = {
      limit: query.limit,
      offset: query.offset
    };
    if (query.stream_id) filter.streamId = query.stream_id;
    if (query.character_id) filter.characterId = query.character_id;
    if (query.source) filter.source = query.source;
    if (query.message_moderation_status) filter.moderationStatus = query.message_moderation_status;
    if (query.delivery_status) filter.deliveryStatus = query.delivery_status;
    if (query.created_after) filter.createdAfter = query.created_after;
    if (query.created_before) filter.createdBefore = query.created_before;
    const events = await repo.searchSupportEvents(filter);
    return {
      support_events: events,
      page: {
        limit: query.limit,
        offset: query.offset,
        count: events.length
      }
    };
  });

  app.post("/admin/support-events/bulk-review/preview", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const parsed = AdminSupportBulkReviewPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_bulk_review_preview_request" });
    const input = parsed.data;
    const seen = new Set<string>();
    for (const eventId of input.event_ids) {
      if (seen.has(eventId)) return reply.code(400).send({ error: "duplicate_event_id", event_id: eventId });
      seen.add(eventId);
    }
    const previews = [];
    for (const eventId of input.event_ids) {
      previews.push(toAdminSupportBulkReviewPreviewEntry(eventId, await repo.getSupportEventById(eventId)));
    }
    return {
      support_events: previews,
      page: {
        requested_count: input.event_ids.length,
        result_count: previews.length,
        max_event_ids: ADMIN_SUPPORT_BULK_REVIEW_PREVIEW_MAX_EVENTS
      },
      duplicate_count: input.event_ids.length - seen.size
    };
  });

  app.post("/admin/support-events/bulk-review/apply", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const parsed = AdminSupportBulkReviewApplyRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_bulk_review_apply_request" });
    const input = parsed.data;
    const seen = new Set<string>();
    for (const eventId of input.event_ids) {
      if (seen.has(eventId)) return reply.code(400).send({ error: "duplicate_event_id", event_id: eventId });
      seen.add(eventId);
    }
    const results = [];
    for (const eventId of input.event_ids) {
      results.push(await applyAdminBulkModerationItem(repo, eventId, input.action));
    }
    return {
      status: "reviewed",
      action: input.action,
      results,
      page: {
        requested_count: input.event_ids.length,
        result_count: results.length,
        max_event_ids: ADMIN_SUPPORT_BULK_REVIEW_PREVIEW_MAX_EVENTS
      }
    };
  });

  app.post("/admin/support-events/manual", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const input = AdminManualSupportRequestSchema.parse(req.body);
    const sourceEventId = stableId("adminmanual", input.request_id);
    const existing = await repo.getSupportEventBySource("admin_manual_support", sourceEventId);
    if (existing) {
      return {
        status: existing.support.message_moderation_status,
        duplicate: true,
        support_event: toAdminHeldSupportEntry(existing),
        side_effects: {
          affinity: "skipped",
          reaction_request: "skipped",
          overlay: "skipped",
          outbox: "skipped"
        }
      };
    }
    const support = await buildAdminManualSupport(repo, input);
    const created = await repo.createSupportEventIfAbsent(support);
    let effects: Awaited<ReturnType<typeof applySupportReceivedEffects>> | undefined;
    if (support.support.message_moderation_status === "approved") effects = await applySupportReceivedEffects(repo, support);
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "create_manual_support",
      target_type: "support_event",
      target_id: created.event.event_id,
      after_json: toAdminManualSupportAuditMetadata(input, created.event)
    });
    return {
      status: support.support.message_moderation_status,
      duplicate: false,
      support_event: toAdminHeldSupportEntry(created.event),
      side_effects: {
        affinity: support.support.message_moderation_status === "approved" ? "applied" : "skipped",
        reaction_request: effects?.character_reaction_request ? "enqueued" : "skipped",
        overlay: effects?.overlay ? "enqueued" : "skipped",
        outbox: effects?.character_reaction_request || effects?.overlay ? "enqueued" : "skipped"
      }
    };
  });

  app.patch("/admin/support-events/:eventId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const rawBody = z.record(z.string(), z.unknown()).parse(req.body ?? {});
    const forbiddenField = Object.keys(rawBody).find((key) => FORBIDDEN_SUPPORT_ADJUSTMENT_FIELDS.has(key));
    if (forbiddenField) return reply.code(400).send({ error: "forbidden_support_adjustment_field", field: forbiddenField });
    const patch = SupportEventAdjustmentSchema.parse(rawBody);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    if (patch.message_moderation_status === "approved") return reply.code(409).send({ error: "use_existing_approve_flow" });
    if (support.support.message_moderation_status === "approved" && patch.message_moderation_status === "rejected") return reply.code(409).send({ error: "approved_reversal_blocked" });
    const adjusted = SupportReceivedSchema.parse({
      ...support,
      viewer: {
        ...support.viewer,
        display_name: patch.display_name_sanitized ? sanitizeDisplayName(patch.display_name_sanitized).sanitized : support.viewer.display_name
      },
      support: {
        ...support.support,
        tier: patch.tier ?? support.support.tier,
        message_moderation_status: patch.message_moderation_status ?? support.support.message_moderation_status
      }
    });
    await repo.updateSupportEvent(adjusted);
    if (patch.message_moderation_status === "rejected") await repo.setSupportModerationReviewStatus(eventId, "rejected");
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "adjust_support_event",
      target_type: "support_event",
      target_id: eventId,
      before_json: toSupportAdjustmentAuditMetadata(support),
      after_json: toSupportAdjustmentAuditMetadata(adjusted, patch.operator_note)
    });
    return {
      status: "adjusted",
      support_event: toSupportAdjustmentSafeEntry(adjusted),
      side_effects: {
        affinity: "skipped",
        reaction_request: "skipped",
        overlay: "skipped",
        outbox: "skipped"
      }
    };
  });

  app.post("/admin/support-events/:eventId/overlay-resend", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    if (support.support.message_moderation_status === "rejected") return reply.code(409).send({ error: "support_event_rejected" });
    if (support.support.message_moderation_status !== "approved") return reply.code(409).send({ error: "support_event_not_approved" });

    const resendSourceEventId = `overlay-resend:${support.event_id}`;
    const overlay = buildOverlayTipAlert(support);
    const overlayResult = await repo.createOverlayEventIfAbsent(resendSourceEventId, support.stream_id, overlay);
    const resendStatus = overlayResult.created ? "queued" : "duplicate";
    await repo.enqueueOutbox({
      id: stableId("outbox", `overlay-resend:${support.event_id}:${support.stream_id}`),
      job_type: "overlay.emit",
      aggregate_type: "support_event",
      aggregate_id: support.event_id,
      idempotency_key: `overlay.resend:${support.event_id}:${support.stream_id}`,
      payload_json: overlay
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "resend_overlay",
      target_type: "support_event",
      target_id: support.event_id,
      after_json: toOverlayResendAuditMetadata(support, resendSourceEventId, resendStatus)
    });
    return {
      status: resendStatus,
      support_event: toAdminHeldSupportEntry(support),
      overlay_resend: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        resend_status: resendStatus
      },
      side_effects: {
        affinity: "skipped",
        reaction_request: "skipped",
        overlay: resendStatus,
        outbox: resendStatus
      }
    };
  });

  app.post("/admin/support-events/:eventId/reaction-resend", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    if (support.support.message_moderation_status === "rejected") return reply.code(409).send({ error: "support_event_rejected" });
    if (support.support.message_moderation_status !== "approved") return reply.code(409).send({ error: "support_event_not_approved" });

    const resendSourceEventId = `reaction-resend:${support.event_id}`;
    const reactionRequest = buildCharacterReactionRequest(support);
    const reactionResult = await repo.createReactionRequestIfAbsent(resendSourceEventId, support.character_id, reactionRequest);
    const resendStatus = reactionResult.created ? "queued" : "duplicate";
    await repo.enqueueOutbox({
      id: stableId("outbox", `reaction-resend:${support.event_id}:${support.character_id}`),
      job_type: "reaction.request",
      aggregate_type: "support_event",
      aggregate_id: support.event_id,
      idempotency_key: `reaction.resend:${support.event_id}:${support.character_id}`,
      payload_json: reactionRequest
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "resend_reaction",
      target_type: "support_event",
      target_id: support.event_id,
      after_json: toReactionResendAuditMetadata(support, resendSourceEventId, resendStatus)
    });
    return {
      status: resendStatus,
      support_event: toAdminHeldSupportEntry(support),
      reaction_resend: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        resend_status: resendStatus
      },
      side_effects: {
        affinity: "skipped",
        reaction_request: resendStatus,
        overlay: "skipped",
        outbox: resendStatus
      }
    };
  });

  app.get("/admin/support-events/:eventId/side-effects", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const ledger = await repo.getSupportSideEffectLedger(support);
    return {
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        source_event_id: support.source_event_id,
        moderation_status: support.support.message_moderation_status
      },
      side_effects: ledger
    };
  });

  app.get("/admin/support-events/:eventId/action-plan", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    return toAdminSupportEventActionPlan(repo, support);
  });

  app.get("/admin/support-events/:eventId/timeline", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const timeline = await repo.getSupportEventTimeline(support);
    return {
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        source_event_id: support.source_event_id,
        moderation_status: support.support.message_moderation_status
      },
      timeline
    };
  });

  app.post("/admin/tips/:supportEventId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { supportEventId } = z.object({ supportEventId: z.string() }).parse(req.params);
    const existingReview = await repo.getSupportModerationReviewStatus(supportEventId);
    if (existingReview === "approved") return { status: "approved", idempotent: true };
    if (existingReview === "rejected") return reply.code(409).send({ error: "support_event_already_rejected" });
    const support = await repo.getSupportEventById(supportEventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    if (support.support.message_moderation_status !== "hold") return reply.code(409).send({ error: "support_event_not_held" });
    const approved = await buildReviewedSupport(repo, support, "approved");
    await repo.updateSupportEvent(approved);
    const effects = await applySupportReceivedEffects(repo, approved);
    await repo.setSupportModerationReviewStatus(supportEventId, "approved");
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "approve_held_support",
      target_type: "support_event",
      target_id: supportEventId,
      after_json: toHeldSupportAuditMetadata(approved, "approved")
    });
    return {
      status: "approved",
      support_event: toAdminHeldSupportEntry(approved),
      side_effects: {
        affinity: approved.viewer.iris_user_id ? "applied" : "skipped",
        reaction_request: effects.character_reaction_request ? "enqueued" : "skipped",
        overlay: effects.overlay ? "enqueued" : "skipped",
        outbox: effects.character_reaction_request || effects.overlay ? "enqueued" : "skipped"
      }
    };
  });

  app.post("/admin/tips/:supportEventId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { supportEventId } = z.object({ supportEventId: z.string() }).parse(req.params);
    const existingReview = await repo.getSupportModerationReviewStatus(supportEventId);
    if (existingReview === "rejected") return { status: "rejected", idempotent: true };
    if (existingReview === "approved") return reply.code(409).send({ error: "support_event_already_approved" });
    const support = await repo.getSupportEventById(supportEventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    if (support.support.message_moderation_status !== "hold") return reply.code(409).send({ error: "support_event_not_held" });
    const rejected = await buildReviewedSupport(repo, support, "rejected");
    await repo.updateSupportEvent(rejected);
    await repo.setSupportModerationReviewStatus(supportEventId, "rejected");
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reject_held_support",
      target_type: "support_event",
      target_id: supportEventId,
      after_json: toHeldSupportAuditMetadata(rejected, "rejected")
    });
    return {
      status: "rejected",
      support_event: toAdminHeldSupportEntry(rejected),
      side_effects: {
        affinity: "skipped",
        reaction_request: "skipped",
        overlay: "skipped",
        outbox: "skipped"
      }
    };
  });

  app.get("/admin/audit-logs", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const rateLimit = checkAdminRateLimit(adminRateLimitBuckets, req, "audit_export");
    if (!rateLimit.allowed) return reply.code(429).send(rateLimit.response);
    const query = z.object({
      action: z.string().optional(),
      target_type: z.string().optional(),
      target_id: z.string().optional(),
      stream_id: z.string().optional()
    }).parse(req.query);
    if (query.action && !ADMIN_AUDIT_ACTIONS.has(query.action)) return reply.code(400).send({ error: "unsupported_audit_action" });
    if (query.target_type && !ADMIN_AUDIT_TARGET_TYPES.has(query.target_type)) return reply.code(400).send({ error: "unsupported_audit_target_type" });
    const auditFilter: { action?: string; targetType?: string; targetId?: string } = {};
    if (query.action) auditFilter.action = query.action;
    if (query.target_type) auditFilter.targetType = query.target_type;
    if (query.target_id) auditFilter.targetId = query.target_id;
    const logs = await repo.listAuditLogs(auditFilter);
    return {
      audit_logs: logs
        .map(toAdminAuditSafeSummary)
        .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))
        .filter((summary) => auditSummaryMatchesStream(summary, query.stream_id))
    };
  });

  app.get("/admin/operations/summary", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = z.object({ stream_id: z.string().optional() }).parse(req.query);
    const deadLetters = await repo.listDeadLetters(query.stream_id ? { streamId: query.stream_id } : undefined);
    const safeAuditLogs = (await repo.listAuditLogs())
      .map(toAdminAuditSafeSummary)
      .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))
      .filter((summary) => auditSummaryMatchesStream(summary, query.stream_id));
    return {
      status: "ok",
      dlq: {
        total: deadLetters.length,
        by_stream_id: countDeadLettersByStream(deadLetters)
      },
      audit: {
        total: safeAuditLogs.length,
        action_counts: countAuditActions(safeAuditLogs)
      },
      rate_limit: summarizeAdminRateLimits(adminRateLimitBuckets)
    };
  });

  app.get("/admin/operations/health", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    return {
      status: "ok",
      generated_at: new Date().toISOString(),
      repository: {
        mode: "local_in_memory"
      },
      endpoints: {
        dlq_list: true,
        dlq_redrive: true,
        audit_export: true,
        operations_summary: true,
        operations_health: true
      },
      rate_limit: summarizeAdminRateLimitConfig()
    };
  });

  app.get("/admin/live-sessions/:streamId/dlq", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const rateLimit = checkAdminRateLimit(adminRateLimitBuckets, req, "dlq_list");
    if (!rateLimit.allowed) return reply.code(429).send(rateLimit.response);
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    const entries = await repo.listDeadLetters({ streamId });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "list_dead_letters",
      target_type: "dlq_list",
      target_id: streamId,
      after_json: toAdminDlqListAuditMetadata(streamId, entries.length)
    });
    return { dead_letters: entries.map(toAdminDlqListEntry) };
  });

  app.post("/admin/dead-letter/:deadLetterId/retry", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const rateLimit = checkAdminRateLimit(adminRateLimitBuckets, req, "dlq_retry");
    if (!rateLimit.allowed) return reply.code(429).send(rateLimit.response);
    const { deadLetterId } = z.object({ deadLetterId: z.string() }).parse(req.params);
    const body = z.object({ actor_id: z.string().default("admin_mock") }).parse(req.body ?? {});
    const deadLetter = (await repo.listDeadLetters()).find((entry) => entry.id === deadLetterId);
    if (!deadLetter) return reply.code(404).send({ error: "dead_letter_not_found" });
    if (!isAdminDlqSafePayload(deadLetter.payload_json)) return reply.code(422).send({ error: "dead_letter_not_retryable" });
    if (!RETRYABLE_SUPPORT_PIPELINE_FAILURE_REASONS.has(deadLetter.payload_json.reason_code as SupportPipelineFailureReason)) return reply.code(422).send({ error: "dead_letter_not_retryable" });
    const retried = await repo.retryDeadLetter(deadLetterId, body.actor_id);
    if (!retried) return reply.code(404).send({ error: "dead_letter_not_found" });
    return toAdminDlqRetryEntry(deadLetter, retried.id);
  });

  app.get("/overlay/:streamId/ws", { websocket: true }, (socket, req) => {
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    const query = z.object({ token: z.string().optional() }).parse(req.query);
    if (!isOverlayTokenValid(query.token)) {
      socket.close(1008, "invalid overlay token");
      return;
    }
    const client = { send: (payload: string) => socket.send(payload) };
    const clients = store.overlayClients.get(streamId) ?? new Set();
    clients.add(client);
    store.overlayClients.set(streamId, clients);
    socket.on("close", () => clients.delete(client));
  });

  return app;
}

if (process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") {
  const app = buildServer();
  app.listen({ port: PORT, host: "0.0.0.0" }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
