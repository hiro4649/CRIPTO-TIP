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
  TipIntentSchema,
  SupportReceivedSchema,
  YouTubeSuperChatInputSchema,
  type LiveSession,
  type OverlayTipAlert,
  type SupportReceived,
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
  const windowMs = 60_000;
  const limit = 3;
  const key = `${scope}:${adminTokenFingerprint(req)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const };
  }
  if (current.count >= limit) {
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

const ADMIN_AUDIT_ACTIONS = new Set(["approve_tip", "reject_tip", "list_dead_letters", "retry_dead_letter"]);
const ADMIN_AUDIT_TARGET_TYPES = new Set(["support_event", "dlq_list", "dead_letter_event"]);
const ADMIN_AUDIT_SAFE_METADATA_KEYS = new Set([
  "stream_id",
  "result_count",
  "outbox_event_id",
  "event_id",
  "source",
  "source_event_id",
  "character_id",
  "reason_code",
  "retry_status",
  "target_id"
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

async function applySupportReceivedSideEffects(repo: CriptoTipRepository, support: SupportReceived) {
  const createdSupport = await repo.createSupportEventIfAbsent(support);
  if (!createdSupport.created) return { support_event: createdSupport.event, duplicate: true };

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

const TipIntentRequestSchema = z.object({
  iris_user_id: z.string().default("usr_mock"),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  display_name: z.string().min(1),
  message: z.string().default(""),
  amount_raw: z.string(),
  amount_display: z.string(),
  tier: z.enum(["small", "medium", "large", "high"])
});

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

  app.post("/admin/tips/:supportEventId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    await repo.writeAuditLog({ actor_type: "admin", action: "approve_tip", target_type: "support_event", target_id: String((req.params as { supportEventId: string }).supportEventId) });
    return { status: "approved", audit_log: "mock-admin-approve" };
  });

  app.post("/admin/tips/:supportEventId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    await repo.writeAuditLog({ actor_type: "admin", action: "reject_tip", target_type: "support_event", target_id: String((req.params as { supportEventId: string }).supportEventId) });
    return { status: "rejected", audit_log: "mock-admin-reject" };
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
