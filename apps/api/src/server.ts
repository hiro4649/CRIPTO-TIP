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
import type { AuditLogInput, CriptoTipRepository, JobType, ReactionDispatchAdapterExecutionBoundaryApprovalMetadata, ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode, ReactionDispatchAdapterExecutionBoundaryApprovalStatus, ReactionDispatchApprovalMetadata, ReactionDispatchApprovalReasonCode, ReactionDispatchApprovalResult, ReactionDispatchCandidateCreateResult, ReactionDispatchCandidateMetadata, ReactionDispatchCandidateReasonCode, ReactionDispatchDryRunApprovalMetadata, ReactionDispatchDryRunApprovalReasonCode, ReactionDispatchDryRunApprovalStatus, ReactionDispatchInternalOutboxAttemptPlanMetadata, ReactionDispatchInternalOutboxAttemptPlanReasonCode, ReactionDispatchInternalOutboxLeaseMetadata, ReactionDispatchInternalOutboxLeaseReasonCode, ReactionDispatchInternalOutboxMetadata, ReactionDispatchInternalOutboxReasonCode, ReactionDispatchInternalOutboxResult, ReactionDispatchLocalAdapterSimulationCase, ReactionDispatchLocalAdapterSimulationReasonCode, ReactionDispatchLocalAdapterSimulationResultMetadata, ReactionDispatchOutboxBoundaryMetadata, ReactionDispatchOutboxBoundaryReasonCode, ReactionDispatchOutboxBoundaryResult, ReactionDispatchSimulationFailureDlqMetadata, SupportEventResolutionMetadata, SupportEventResolutionStatus, SupportEventSearchFilter } from "./repositories/types.js";
import { validateSupportEventContractV2Preview } from "./support-event-contract-v2-validator.js";
import { parseYouTubeLiveChatPageFixture } from "./youtube-live-chat-page-fixture-parser.js";
import { normalizeYouTubeSuperChatFixture } from "./youtube-superchat-fixture-normalizer.js";

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

const ADMIN_AUDIT_ACTIONS = new Set(["approve_tip", "reject_tip", "list_dead_letters", "retry_dead_letter", "list_held_support", "approve_held_support", "reject_held_support", "create_manual_support", "adjust_support_event", "resend_overlay", "resend_reaction", "create_operator_note", "update_operator_note", "archive_operator_note", "reaction_dispatch_candidate_approved", "reaction_dispatch_candidate_rejected", "reaction_dispatch_outbox_boundary_recorded", "reaction_dispatch_internal_outbox_queued", "reaction_dispatch_internal_outbox_cancelled", "reaction_dispatch_internal_outbox_lease_created", "reaction_dispatch_internal_outbox_lease_extended", "reaction_dispatch_internal_outbox_lease_released", "reaction_dispatch_internal_outbox_attempt_plan_created", "reaction_dispatch_dry_run_boundary_approved", "reaction_dispatch_dry_run_boundary_rejected", "reaction_dispatch_adapter_execution_boundary_approved_for_local_simulation", "reaction_dispatch_adapter_execution_boundary_rejected"]);
const ADMIN_AUDIT_TARGET_TYPES = new Set(["support_event", "dlq_list", "dead_letter_event", "held_support_list", "reaction_dispatch_candidate", "reaction_dispatch_outbox_boundary", "reaction_dispatch_internal_outbox", "reaction_dispatch_dry_run_boundary"]);
const ADMIN_AUDIT_SAFE_METADATA_KEYS = new Set([
  "stream_id",
  "result_count",
  "request_id",
  "operator_note",
  "operator_note_id",
  "outbox_event_id",
  "event_id",
  "source",
  "source_event_id",
  "character_id",
  "reason_code",
  "candidate_id",
  "boundary_id",
  "support_event_id",
  "before_status",
  "after_status",
  "boundary_status",
  "approval_status",
  "contract_validation_status",
  "external_delivery_status",
  "adapter_execution_status",
  "dispatch_attempt_count",
  "lease_status",
  "lease_id",
  "lease_expires_at",
  "leased_by_actor_type",
  "attempt_plan_status",
  "plan_id",
  "dry_run_boundary_id",
  "dry_run_status",
  "adapter_kind",
  "approved_at",
  "rejected_at",
  "approved_by_actor_type",
  "rejected_by_actor_type",
  "planned_adapter_type",
  "planned_action",
  "plan_context_hash",
  "approval_id",
  "approval_snapshot_hash",
  "request_envelope_hash",
  "safe_context_hash",
  "constraints_hash",
  "request_preview_hash",
  "created_by_actor_type",
  "cancelled_at",
  "cancelled_by_actor_type",
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

const AdminSupportEventOperatorNoteSchema = z.object({
  note: z.string().min(1).max(240)
});
const AdminSupportEventOperatorNotePatchSchema = z.object({
  note: z.string().min(1).max(240).optional(),
  archived: z.boolean().optional()
}).refine((value) => value.note !== undefined || value.archived !== undefined);

type AdminSupportEventOperatorNote = {
  id: string;
  event_id: string;
  note: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type OperatorNoteRepository = {
  createSupportEventOperatorNote?: (note: AdminSupportEventOperatorNote) => Promise<AdminSupportEventOperatorNote>;
  listSupportEventOperatorNotes?: (eventId: string, options?: { includeArchived?: boolean }) => Promise<AdminSupportEventOperatorNote[]>;
  getSupportEventOperatorNote?: (eventId: string, noteId: string) => Promise<AdminSupportEventOperatorNote | undefined>;
  updateSupportEventOperatorNote?: (eventId: string, noteId: string, patch: Partial<Pick<AdminSupportEventOperatorNote, "note" | "archived">>) => Promise<AdminSupportEventOperatorNote | undefined>;
};
type ResolutionRepository = {
  getSupportEventResolution?: (eventId: string) => Promise<AdminSupportEventResolution | undefined>;
  setSupportEventResolution?: (eventId: string, patch: { status: SupportEventResolutionStatus; operator_note?: string }) => Promise<AdminSupportEventResolution>;
};
type ReactionDispatchCandidateRepository = {
  createReactionDispatchCandidateIfAbsent?: (candidate: ReactionDispatchCandidateMetadata) => Promise<ReactionDispatchCandidateCreateResult>;
  listReactionDispatchCandidatesBySupportEvent?: (eventId: string) => Promise<ReactionDispatchCandidateMetadata[]>;
  getReactionDispatchCandidate?: (eventId: string, candidateId: string) => Promise<ReactionDispatchCandidateMetadata | undefined>;
  getReactionDispatchCandidateById?: (candidateId: string) => Promise<ReactionDispatchCandidateMetadata | undefined>;
  setReactionDispatchApprovalIfAbsent?: (approval: ReactionDispatchApprovalMetadata) => Promise<ReactionDispatchApprovalResult>;
  getReactionDispatchApproval?: (candidateId: string) => Promise<ReactionDispatchApprovalMetadata | undefined>;
  setReactionDispatchOutboxBoundaryIfAbsent?: (boundary: ReactionDispatchOutboxBoundaryMetadata) => Promise<ReactionDispatchOutboxBoundaryResult>;
  getReactionDispatchOutboxBoundary?: (candidateId: string) => Promise<ReactionDispatchOutboxBoundaryMetadata | undefined>;
  getReactionDispatchOutboxBoundaryById?: (boundaryId: string) => Promise<ReactionDispatchOutboxBoundaryMetadata | undefined>;
  setReactionDispatchInternalOutboxIfAbsent?: (outbox: ReactionDispatchInternalOutboxMetadata) => Promise<ReactionDispatchInternalOutboxResult>;
  getReactionDispatchInternalOutboxByBoundary?: (boundaryId: string) => Promise<ReactionDispatchInternalOutboxMetadata | undefined>;
  getReactionDispatchInternalOutbox?: (outboxId: string) => Promise<ReactionDispatchInternalOutboxMetadata | undefined>;
  updateReactionDispatchInternalOutbox?: (outbox: ReactionDispatchInternalOutboxMetadata) => Promise<ReactionDispatchInternalOutboxMetadata | undefined>;
  listReactionDispatchInternalOutbox?: () => Promise<ReactionDispatchInternalOutboxMetadata[]>;
  setReactionDispatchInternalOutboxLease?: (lease: ReactionDispatchInternalOutboxLeaseMetadata) => Promise<ReactionDispatchInternalOutboxLeaseMetadata>;
  getReactionDispatchInternalOutboxLease?: (outboxId: string) => Promise<ReactionDispatchInternalOutboxLeaseMetadata | undefined>;
  setReactionDispatchInternalOutboxAttemptPlan?: (plan: ReactionDispatchInternalOutboxAttemptPlanMetadata) => Promise<ReactionDispatchInternalOutboxAttemptPlanMetadata>;
  getReactionDispatchInternalOutboxAttemptPlan?: (outboxId: string) => Promise<ReactionDispatchInternalOutboxAttemptPlanMetadata | undefined>;
  listReactionDispatchInternalOutboxAttemptPlans?: () => Promise<ReactionDispatchInternalOutboxAttemptPlanMetadata[]>;
  setReactionDispatchDryRunApproval?: (approval: ReactionDispatchDryRunApprovalMetadata) => Promise<ReactionDispatchDryRunApprovalMetadata>;
  getReactionDispatchDryRunApproval?: (dryRunBoundaryId: string) => Promise<ReactionDispatchDryRunApprovalMetadata | undefined>;
  setReactionDispatchAdapterExecutionBoundaryApproval?: (approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata) => Promise<ReactionDispatchAdapterExecutionBoundaryApprovalMetadata>;
  getReactionDispatchAdapterExecutionBoundaryApproval?: (dryRunBoundaryId: string) => Promise<ReactionDispatchAdapterExecutionBoundaryApprovalMetadata | undefined>;
  setReactionDispatchLocalAdapterSimulationResult?: (result: ReactionDispatchLocalAdapterSimulationResultMetadata) => Promise<ReactionDispatchLocalAdapterSimulationResultMetadata>;
  getReactionDispatchLocalAdapterSimulationResult?: (simulationResultId: string) => Promise<ReactionDispatchLocalAdapterSimulationResultMetadata | undefined>;
  listReactionDispatchLocalAdapterSimulationResults?: () => Promise<ReactionDispatchLocalAdapterSimulationResultMetadata[]>;
  setReactionDispatchSimulationFailureDlq?: (entry: ReactionDispatchSimulationFailureDlqMetadata) => Promise<ReactionDispatchSimulationFailureDlqMetadata>;
  getReactionDispatchSimulationFailureDlq?: (dlqId: string) => Promise<ReactionDispatchSimulationFailureDlqMetadata | undefined>;
  listReactionDispatchSimulationFailureDlq?: () => Promise<ReactionDispatchSimulationFailureDlqMetadata[]>;
};
const resolutionFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, AdminSupportEventResolution>>();
const reactionDispatchCandidateFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchCandidateMetadata>>();
const reactionDispatchApprovalFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchApprovalMetadata>>();
const reactionDispatchOutboxBoundaryFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchOutboxBoundaryMetadata>>();
const reactionDispatchInternalOutboxFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchInternalOutboxMetadata>>();
const reactionDispatchInternalOutboxLeaseFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchInternalOutboxLeaseMetadata>>();
const reactionDispatchInternalOutboxAttemptPlanFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchInternalOutboxAttemptPlanMetadata>>();
const reactionDispatchDryRunApprovalFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchDryRunApprovalMetadata>>();
const reactionDispatchAdapterExecutionBoundaryApprovalFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchAdapterExecutionBoundaryApprovalMetadata>>();
const reactionDispatchLocalAdapterSimulationResultFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchLocalAdapterSimulationResultMetadata>>();
const reactionDispatchSimulationFailureDlqFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, ReactionDispatchSimulationFailureDlqMetadata>>();
type YouTubeLiveChatFixtureCursorStatus = "not_started" | "page_ingested" | "caught_up_fixture" | "cursor_blocked" | "cursor_superseded";
type YouTubeLiveChatFixtureCursorState = {
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
  created_at: string;
  updated_at: string;
  seen_message_ids: Set<string>;
  page_fingerprints: Set<string>;
};
const youtubeLiveChatFixtureCursorFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, YouTubeLiveChatFixtureCursorState>>();
const youtubeLiveChatFixtureCursorIdentityFallbackByRepo = new WeakMap<CriptoTipRepository, Map<string, string>>();

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
const AdminOperatorNoteSearchQuerySchema = z.object({
  support_event_id: z.string().optional(),
  stream_id: z.string().optional(),
  character_id: z.string().optional(),
  archived: z.coerce.boolean().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminSupportEventResolutionSchema = z.object({
  status: z.enum(["open", "resolved", "needs_followup", "blocked"]),
  operator_note: z.string().max(240).optional()
});
const AdminSupportEventWorkQueueQuerySchema = z.object({
  resolution_status: z.enum(["open", "resolved", "needs_followup", "blocked"]).optional(),
  message_moderation_status: z.enum(moderationStatuses).optional(),
  stream_id: z.string().optional(),
  character_id: z.string().optional(),
  source: z.enum(supportSources).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminReactionDispatchOutboxReviewQuerySchema = z.object({
  outbox_status: z.enum(["queued_internal", "pending_internal_dispatch", "cancelled_internal", "blocked_internal", "superseded_internal"]).optional(),
  stream_id: z.string().optional(),
  character_id: z.string().optional(),
  source: z.enum(supportSources).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminReactionDispatchAttemptPlanReviewQuerySchema = z.object({
  support_event_id: z.string().optional(),
  outbox_id: z.string().optional(),
  lease_id: z.string().optional(),
  character_id: z.string().optional(),
  stream_id: z.string().optional(),
  plan_status: z.enum(["planned_internal", "plan_blocked", "plan_superseded", "plan_expired"]).optional(),
  outbox_status: z.enum(["queued_internal", "pending_internal_dispatch", "cancelled_internal", "blocked_internal", "superseded_internal"]).optional(),
  lease_status: z.enum(["not_leased", "leased_internal", "lease_expired", "lease_released", "lease_blocked"]).optional(),
  adapter_kind: z.enum(["iris_core_reaction", "voxweave_voice", "overlay_effect", "future_internal_adapter"]).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminReactionDispatchDryRunReviewQuerySchema = z.object({
  support_event_id: z.string().optional(),
  outbox_id: z.string().optional(),
  lease_id: z.string().optional(),
  plan_id: z.string().optional(),
  candidate_id: z.string().optional(),
  boundary_id: z.string().optional(),
  character_id: z.string().optional(),
  stream_id: z.string().optional(),
  adapter_kind: z.enum(["iris_core_reaction", "voxweave_voice", "overlay_effect", "future_internal_adapter"]).optional(),
  dry_run_status: z.enum(["dry_run_planned", "dry_run_ready", "dry_run_blocked", "dry_run_invalid", "dry_run_superseded"]).optional(),
  plan_status: z.enum(["planned_internal", "plan_blocked", "plan_superseded", "plan_expired"]).optional(),
  outbox_status: z.enum(["queued_internal", "pending_internal_dispatch", "cancelled_internal", "blocked_internal", "superseded_internal"]).optional(),
  lease_status: z.enum(["not_leased", "leased_internal", "lease_expired", "lease_released", "lease_blocked"]).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminAdapterExecutionBoundaryPreviewReviewQuerySchema = z.object({
  preview_status: z.enum(["adapter_execution_boundary_preview_ready", "adapter_execution_boundary_preview_blocked"]).optional(),
  adapter_kind: z.enum(["iris_core_reaction", "voxweave_voice", "overlay_effect", "future_internal_adapter"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
const AdminAdapterExecutionBoundaryApprovalRequestSchema = z.object({
  adapter_execution_boundary_preview_id: z.string().min(1).max(160),
  request_envelope_hash: z.string().regex(/^[a-f0-9]{64}$/),
  safe_context_hash: z.string().min(1).max(160),
  constraints_hash: z.string().min(1).max(160),
  request_preview_hash: z.string().min(1).max(160)
});
const AdminLocalAdapterSimulationRequestSchema = z.object({
  simulation_case: z.enum(["success", "retryable_failure", "terminal_failure"])
});
const AdminLocalAdapterSimulationReviewQuerySchema = z.object({
  support_event_id: z.string().optional(),
  preview_id: z.string().optional(),
  dry_run_boundary_id: z.string().optional(),
  plan_id: z.string().optional(),
  outbox_id: z.string().optional(),
  lease_id: z.string().optional(),
  adapter_kind: z.enum(["iris_core_reaction", "voxweave_voice", "overlay_effect", "future_internal_adapter"]).optional(),
  simulation_case: z.enum(["success", "retryable_failure", "terminal_failure"]).optional(),
  simulation_status: z.enum(["simulated_success", "simulated_retryable_failure", "simulated_terminal_failure", "simulated_blocked"]).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
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

type AdminSupportEventResolution = SupportEventResolutionMetadata;

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

function sanitizeOperatorNote(input: string) {
  return sanitizeMessage(input, 240)
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\bBearer\s+\S+/gi, "[redacted-token]")
    .replace(/\b(?:sk|ghp|github_pat)_[A-Za-z0-9_:-]+/g, "[redacted-token]")
    .trim();
}

function toOperatorNoteSafeEntry(note: AdminSupportEventOperatorNote) {
  return {
    id: note.id,
    event_id: note.event_id,
    note: note.note,
    archived: note.archived,
    created_at: note.created_at,
    updated_at: note.updated_at
  };
}

function getOperatorNoteRepository(repo: CriptoTipRepository): Required<OperatorNoteRepository> {
  const candidate = repo as CriptoTipRepository & OperatorNoteRepository;
  return {
    createSupportEventOperatorNote: candidate.createSupportEventOperatorNote
      ? (note) => candidate.createSupportEventOperatorNote!.call(repo, note)
      : async (note) => note,
    listSupportEventOperatorNotes: candidate.listSupportEventOperatorNotes
      ? (eventId, options) => candidate.listSupportEventOperatorNotes!.call(repo, eventId, options)
      : async () => [],
    getSupportEventOperatorNote: candidate.getSupportEventOperatorNote
      ? (eventId, noteId) => candidate.getSupportEventOperatorNote!.call(repo, eventId, noteId)
      : async () => undefined,
    updateSupportEventOperatorNote: candidate.updateSupportEventOperatorNote
      ? (eventId, noteId, patch) => candidate.updateSupportEventOperatorNote!.call(repo, eventId, noteId, patch)
      : async () => undefined
  };
}

function toOperatorNoteAuditMetadata(support: SupportReceived, note: AdminSupportEventOperatorNote) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    operator_note_id: note.id,
    operator_note: note.note
  };
}

function getResolutionRepository(repo: CriptoTipRepository): Required<ResolutionRepository> {
  const candidate = repo as CriptoTipRepository & ResolutionRepository;
  let fallback = resolutionFallbackByRepo.get(repo);
  if (!fallback) {
    fallback = new Map<string, AdminSupportEventResolution>();
    resolutionFallbackByRepo.set(repo, fallback);
  }
  return {
    getSupportEventResolution: candidate.getSupportEventResolution
      ? (eventId) => candidate.getSupportEventResolution!.call(repo, eventId)
      : async (eventId) => fallback.get(eventId),
    setSupportEventResolution: candidate.setSupportEventResolution
      ? (eventId, patch) => candidate.setSupportEventResolution!.call(repo, eventId, patch)
      : async (eventId, patch) => {
        const now = new Date().toISOString();
        const existing = fallback.get(eventId);
        const next: AdminSupportEventResolution = {
          event_id: eventId,
          status: patch.status,
          created_at: existing?.created_at ?? now,
          updated_at: now
        };
        if (patch.operator_note !== undefined) next.operator_note = patch.operator_note;
        else if (existing?.operator_note !== undefined) next.operator_note = existing.operator_note;
        fallback.set(eventId, next);
        return next;
      }
  };
}

function toResolutionSafeEntry(resolution: AdminSupportEventResolution) {
  return {
    event_id: resolution.event_id,
    status: resolution.status,
    operator_note: resolution.operator_note,
    created_at: resolution.created_at,
    updated_at: resolution.updated_at
  };
}

function toResolutionAuditMetadata(support: SupportReceived, resolution: AdminSupportEventResolution) {
  return {
    event_id: support.event_id,
    source: support.source,
    source_event_id: support.source_event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    resolution_status: resolution.status,
    operator_note: resolution.operator_note
  };
}

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

function getReactionDispatchCandidateRepository(repo: CriptoTipRepository): Required<ReactionDispatchCandidateRepository> {
  const candidate = repo as CriptoTipRepository & ReactionDispatchCandidateRepository;
  let fallback = reactionDispatchCandidateFallbackByRepo.get(repo);
  if (!fallback) {
    fallback = new Map<string, ReactionDispatchCandidateMetadata>();
    reactionDispatchCandidateFallbackByRepo.set(repo, fallback);
  }
  let approvalFallback = reactionDispatchApprovalFallbackByRepo.get(repo);
  if (!approvalFallback) {
    approvalFallback = new Map<string, ReactionDispatchApprovalMetadata>();
    reactionDispatchApprovalFallbackByRepo.set(repo, approvalFallback);
  }
  let boundaryFallback = reactionDispatchOutboxBoundaryFallbackByRepo.get(repo);
  if (!boundaryFallback) {
    boundaryFallback = new Map<string, ReactionDispatchOutboxBoundaryMetadata>();
    reactionDispatchOutboxBoundaryFallbackByRepo.set(repo, boundaryFallback);
  }
  let internalOutboxFallback = reactionDispatchInternalOutboxFallbackByRepo.get(repo);
  if (!internalOutboxFallback) {
    internalOutboxFallback = new Map<string, ReactionDispatchInternalOutboxMetadata>();
    reactionDispatchInternalOutboxFallbackByRepo.set(repo, internalOutboxFallback);
  }
  let internalOutboxLeaseFallback = reactionDispatchInternalOutboxLeaseFallbackByRepo.get(repo);
  if (!internalOutboxLeaseFallback) {
    internalOutboxLeaseFallback = new Map<string, ReactionDispatchInternalOutboxLeaseMetadata>();
    reactionDispatchInternalOutboxLeaseFallbackByRepo.set(repo, internalOutboxLeaseFallback);
  }
  let internalOutboxAttemptPlanFallback = reactionDispatchInternalOutboxAttemptPlanFallbackByRepo.get(repo);
  if (!internalOutboxAttemptPlanFallback) {
    internalOutboxAttemptPlanFallback = new Map<string, ReactionDispatchInternalOutboxAttemptPlanMetadata>();
    reactionDispatchInternalOutboxAttemptPlanFallbackByRepo.set(repo, internalOutboxAttemptPlanFallback);
  }
  let dryRunApprovalFallback = reactionDispatchDryRunApprovalFallbackByRepo.get(repo);
  if (!dryRunApprovalFallback) {
    dryRunApprovalFallback = new Map<string, ReactionDispatchDryRunApprovalMetadata>();
    reactionDispatchDryRunApprovalFallbackByRepo.set(repo, dryRunApprovalFallback);
  }
  let adapterExecutionApprovalFallback = reactionDispatchAdapterExecutionBoundaryApprovalFallbackByRepo.get(repo);
  if (!adapterExecutionApprovalFallback) {
    adapterExecutionApprovalFallback = new Map<string, ReactionDispatchAdapterExecutionBoundaryApprovalMetadata>();
    reactionDispatchAdapterExecutionBoundaryApprovalFallbackByRepo.set(repo, adapterExecutionApprovalFallback);
  }
  let localSimulationResultFallback = reactionDispatchLocalAdapterSimulationResultFallbackByRepo.get(repo);
  if (!localSimulationResultFallback) {
    localSimulationResultFallback = new Map<string, ReactionDispatchLocalAdapterSimulationResultMetadata>();
    reactionDispatchLocalAdapterSimulationResultFallbackByRepo.set(repo, localSimulationResultFallback);
  }
  let simulationFailureDlqFallback = reactionDispatchSimulationFailureDlqFallbackByRepo.get(repo);
  if (!simulationFailureDlqFallback) {
    simulationFailureDlqFallback = new Map<string, ReactionDispatchSimulationFailureDlqMetadata>();
    reactionDispatchSimulationFailureDlqFallbackByRepo.set(repo, simulationFailureDlqFallback);
  }
  return {
    createReactionDispatchCandidateIfAbsent: candidate.createReactionDispatchCandidateIfAbsent
      ? (entry) => candidate.createReactionDispatchCandidateIfAbsent!.call(repo, entry)
      : async (entry) => {
        const existing = [...fallback.values()].find((item) => item.idempotency_key === entry.idempotency_key);
        if (existing) return { candidate: existing, created: false };
        fallback.set(entry.candidate_id, entry);
        return { candidate: entry, created: true };
      },
    listReactionDispatchCandidatesBySupportEvent: candidate.listReactionDispatchCandidatesBySupportEvent
      ? (eventId) => candidate.listReactionDispatchCandidatesBySupportEvent!.call(repo, eventId)
      : async (eventId) => [...fallback.values()]
        .filter((entry) => entry.support_event_id === eventId)
        .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.candidate_id.localeCompare(right.candidate_id)),
    getReactionDispatchCandidate: candidate.getReactionDispatchCandidate
      ? (eventId, candidateId) => candidate.getReactionDispatchCandidate!.call(repo, eventId, candidateId)
      : async (eventId, candidateId) => {
        const entry = fallback.get(candidateId);
        return entry?.support_event_id === eventId ? entry : undefined;
      },
    getReactionDispatchCandidateById: candidate.getReactionDispatchCandidateById
      ? (candidateId) => candidate.getReactionDispatchCandidateById!.call(repo, candidateId)
      : async (candidateId) => fallback.get(candidateId),
    setReactionDispatchApprovalIfAbsent: candidate.setReactionDispatchApprovalIfAbsent
      ? (approval) => candidate.setReactionDispatchApprovalIfAbsent!.call(repo, approval)
      : async (approval) => {
        const existing = approvalFallback.get(approval.candidate_id);
        if (existing) return { approval: existing, created: false };
        approvalFallback.set(approval.candidate_id, approval);
        return { approval, created: true };
      },
    getReactionDispatchApproval: candidate.getReactionDispatchApproval
      ? (candidateId) => candidate.getReactionDispatchApproval!.call(repo, candidateId)
      : async (candidateId) => approvalFallback.get(candidateId),
    setReactionDispatchOutboxBoundaryIfAbsent: candidate.setReactionDispatchOutboxBoundaryIfAbsent
      ? (boundary) => candidate.setReactionDispatchOutboxBoundaryIfAbsent!.call(repo, boundary)
      : async (boundary) => {
        const existing = boundaryFallback.get(boundary.candidate_id);
        if (existing) return { boundary: existing, created: false };
        boundaryFallback.set(boundary.candidate_id, boundary);
        return { boundary, created: true };
      },
    getReactionDispatchOutboxBoundary: candidate.getReactionDispatchOutboxBoundary
      ? (candidateId) => candidate.getReactionDispatchOutboxBoundary!.call(repo, candidateId)
      : async (candidateId) => boundaryFallback.get(candidateId),
    getReactionDispatchOutboxBoundaryById: candidate.getReactionDispatchOutboxBoundaryById
      ? (boundaryId) => candidate.getReactionDispatchOutboxBoundaryById!.call(repo, boundaryId)
      : async (boundaryId) => [...boundaryFallback.values()].find((boundary) => boundary.boundary_id === boundaryId),
    setReactionDispatchInternalOutboxIfAbsent: candidate.setReactionDispatchInternalOutboxIfAbsent
      ? (outbox) => candidate.setReactionDispatchInternalOutboxIfAbsent!.call(repo, outbox)
      : async (outbox) => {
        const key = `${outbox.boundary_id}:${outbox.candidate_id}`;
        const existing = internalOutboxFallback.get(key);
        if (existing) return { outbox: existing, created: false };
        internalOutboxFallback.set(key, outbox);
        return { outbox, created: true };
      },
    getReactionDispatchInternalOutboxByBoundary: candidate.getReactionDispatchInternalOutboxByBoundary
      ? (boundaryId) => candidate.getReactionDispatchInternalOutboxByBoundary!.call(repo, boundaryId)
      : async (boundaryId) => [...internalOutboxFallback.values()].find((outbox) => outbox.boundary_id === boundaryId),
    getReactionDispatchInternalOutbox: candidate.getReactionDispatchInternalOutbox
      ? (outboxId) => candidate.getReactionDispatchInternalOutbox!.call(repo, outboxId)
      : async (outboxId) => [...internalOutboxFallback.values()].find((outbox) => outbox.outbox_id === outboxId),
    updateReactionDispatchInternalOutbox: candidate.updateReactionDispatchInternalOutbox
      ? (outbox) => candidate.updateReactionDispatchInternalOutbox!.call(repo, outbox)
      : async (outbox) => {
        const key = `${outbox.boundary_id}:${outbox.candidate_id}`;
        if (!internalOutboxFallback.has(key)) return undefined;
        internalOutboxFallback.set(key, outbox);
        return outbox;
      },
    listReactionDispatchInternalOutbox: candidate.listReactionDispatchInternalOutbox
      ? () => candidate.listReactionDispatchInternalOutbox!.call(repo)
      : async () => [...internalOutboxFallback.values()]
        .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.outbox_id.localeCompare(right.outbox_id)),
    setReactionDispatchInternalOutboxLease: candidate.setReactionDispatchInternalOutboxLease
      ? (lease) => candidate.setReactionDispatchInternalOutboxLease!.call(repo, lease)
      : async (lease) => {
        internalOutboxLeaseFallback.set(lease.outbox_id, lease);
        return lease;
      },
    getReactionDispatchInternalOutboxLease: candidate.getReactionDispatchInternalOutboxLease
      ? (outboxId) => candidate.getReactionDispatchInternalOutboxLease!.call(repo, outboxId)
      : async (outboxId) => internalOutboxLeaseFallback.get(outboxId),
    setReactionDispatchInternalOutboxAttemptPlan: candidate.setReactionDispatchInternalOutboxAttemptPlan
      ? (plan) => candidate.setReactionDispatchInternalOutboxAttemptPlan!.call(repo, plan)
      : async (plan) => {
        internalOutboxAttemptPlanFallback.set(plan.outbox_id, plan);
        return plan;
      },
    getReactionDispatchInternalOutboxAttemptPlan: candidate.getReactionDispatchInternalOutboxAttemptPlan
      ? (outboxId) => candidate.getReactionDispatchInternalOutboxAttemptPlan!.call(repo, outboxId)
      : async (outboxId) => internalOutboxAttemptPlanFallback.get(outboxId),
    listReactionDispatchInternalOutboxAttemptPlans: candidate.listReactionDispatchInternalOutboxAttemptPlans
      ? () => candidate.listReactionDispatchInternalOutboxAttemptPlans!.call(repo)
      : async () => [...internalOutboxAttemptPlanFallback.values()]
        .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.plan_id.localeCompare(right.plan_id)),
    setReactionDispatchDryRunApproval: candidate.setReactionDispatchDryRunApproval
      ? (approval) => candidate.setReactionDispatchDryRunApproval!.call(repo, approval)
      : async (approval) => {
        dryRunApprovalFallback.set(approval.dry_run_boundary_id, approval);
        return approval;
      },
    getReactionDispatchDryRunApproval: candidate.getReactionDispatchDryRunApproval
      ? (dryRunBoundaryId) => candidate.getReactionDispatchDryRunApproval!.call(repo, dryRunBoundaryId)
      : async (dryRunBoundaryId) => dryRunApprovalFallback.get(dryRunBoundaryId),
    setReactionDispatchAdapterExecutionBoundaryApproval: candidate.setReactionDispatchAdapterExecutionBoundaryApproval
      ? (approval) => candidate.setReactionDispatchAdapterExecutionBoundaryApproval!.call(repo, approval)
      : async (approval) => {
        adapterExecutionApprovalFallback.set(approval.dry_run_boundary_id, approval);
        return approval;
      },
    getReactionDispatchAdapterExecutionBoundaryApproval: candidate.getReactionDispatchAdapterExecutionBoundaryApproval
      ? (dryRunBoundaryId) => candidate.getReactionDispatchAdapterExecutionBoundaryApproval!.call(repo, dryRunBoundaryId)
      : async (dryRunBoundaryId) => adapterExecutionApprovalFallback.get(dryRunBoundaryId),
    setReactionDispatchLocalAdapterSimulationResult: candidate.setReactionDispatchLocalAdapterSimulationResult
      ? (result) => candidate.setReactionDispatchLocalAdapterSimulationResult!.call(repo, result)
      : async (result) => {
        localSimulationResultFallback.set(result.simulation_result_id, result);
        return result;
      },
    getReactionDispatchLocalAdapterSimulationResult: candidate.getReactionDispatchLocalAdapterSimulationResult
      ? (simulationResultId) => candidate.getReactionDispatchLocalAdapterSimulationResult!.call(repo, simulationResultId)
      : async (simulationResultId) => localSimulationResultFallback.get(simulationResultId),
    listReactionDispatchLocalAdapterSimulationResults: candidate.listReactionDispatchLocalAdapterSimulationResults
      ? () => candidate.listReactionDispatchLocalAdapterSimulationResults!.call(repo)
      : async () => [...localSimulationResultFallback.values()]
        .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.simulation_result_id.localeCompare(right.simulation_result_id)),
    setReactionDispatchSimulationFailureDlq: candidate.setReactionDispatchSimulationFailureDlq
      ? (entry) => candidate.setReactionDispatchSimulationFailureDlq!.call(repo, entry)
      : async (entry) => {
        simulationFailureDlqFallback.set(entry.dlq_id, entry);
        return entry;
      },
    getReactionDispatchSimulationFailureDlq: candidate.getReactionDispatchSimulationFailureDlq
      ? (dlqId) => candidate.getReactionDispatchSimulationFailureDlq!.call(repo, dlqId)
      : async (dlqId) => simulationFailureDlqFallback.get(dlqId),
    listReactionDispatchSimulationFailureDlq: candidate.listReactionDispatchSimulationFailureDlq
      ? () => candidate.listReactionDispatchSimulationFailureDlq!.call(repo)
      : async () => [...simulationFailureDlqFallback.values()]
        .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.dlq_id.localeCompare(right.dlq_id))
  };
}

function toReactionDispatchCandidateReasonCodes(
  support: SupportReceived,
  preview: Awaited<ReturnType<typeof toReactionDispatchPreview>>
): ReactionDispatchCandidateReasonCode[] {
  const reasons = new Set<ReactionDispatchCandidateReasonCode>();
  if (preview.contract_validation.status === "valid") reasons.add("contract_v2_valid");
  if (!preview.character_continuity.must_keep_persona || !preview.character_continuity.persona_version) reasons.add("missing_character_continuity");
  if (!preview.safe_context_summary.allowed_reaction && support.support.message_moderation_status === "approved") reasons.add("unsafe_context");
  if (support.support.message_moderation_status !== "approved") reasons.add("moderation_not_approved");
  if (preview.support_event.resolution_status === "blocked") reasons.add("resolution_blocked");
  if (!supportSources.includes(support.source)) reasons.add("unsupported_source");
  return [...reasons];
}

function toReactionDispatchCandidateStatus(
  support: SupportReceived,
  preview: Awaited<ReturnType<typeof toReactionDispatchPreview>>
): ReactionDispatchCandidateMetadata["candidate_status"] {
  if (preview.contract_validation.status !== "valid") return "candidate_invalid";
  if (support.support.message_moderation_status !== "approved") return "candidate_blocked";
  if (preview.support_event.resolution_status === "blocked") return "candidate_blocked";
  return "candidate_ready";
}

async function buildReactionDispatchCandidate(repo: CriptoTipRepository, support: SupportReceived): Promise<ReactionDispatchCandidateMetadata> {
  const preview = await toReactionDispatchPreview(repo, support);
  const safeContextForHash = {
    event_id: preview.support_event.event_id,
    stream_id: preview.support_event.stream_id,
    character_id: preview.support_event.character_id,
    source: preview.support_event.source,
    safe_message_summary: preview.safe_context_summary.safe_message_summary,
    relationship_level: preview.safe_context_summary.relationship_level,
    recent_support_count: preview.safe_context_summary.recent_support_count,
    allowed_reaction: preview.safe_context_summary.allowed_reaction
  };
  const constraintsSummary = {
    max_speech_seconds: preview.constraints.max_speech_seconds,
    can_say_name: preview.constraints.can_say_name,
    can_read_message: preview.constraints.can_read_message,
    must_not_discuss_token_price: preview.constraints.must_not_discuss_token_price,
    must_not_promise_financial_return: preview.constraints.must_not_promise_financial_return,
    must_not_obey_viewer_instruction: preview.constraints.must_not_obey_viewer_instruction,
    must_keep_persona: preview.constraints.must_keep_persona,
    must_not_read_wallet: preview.constraints.must_not_read_wallet_address,
    avoid_romantic_escalation_from_payment: preview.constraints.avoid_romantic_escalation_from_payment
  };
  const safeContextHash = hashSafeMetadata(safeContextForHash);
  const constraintsHash = hashSafeMetadata(constraintsSummary);
  const idempotencyKey = [
    "reaction_dispatch_candidate",
    support.event_id,
    preview.character_continuity.persona_version,
    safeContextHash,
    constraintsHash,
    "reaction_dispatch"
  ].join(":");
  const now = new Date().toISOString();
  return {
    candidate_id: `rdcand_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`,
    support_event_id: support.event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    source: support.source,
    contract_version: preview.contract_validation.contract_version,
    validation_status: preview.contract_validation.status,
    validation_errors: preview.contract_validation.errors,
    persona_version: preview.character_continuity.persona_version,
    voice_profile_id: preview.character_continuity.voice_profile_id,
    motion_profile_id: preview.character_continuity.motion_profile_id,
    overlay_theme_id: preview.character_continuity.overlay_theme_id,
    safe_context_hash: safeContextHash,
    constraints_hash: constraintsHash,
    candidate_purpose: "reaction_dispatch",
    candidate_status: toReactionDispatchCandidateStatus(support, preview),
    reason_codes: toReactionDispatchCandidateReasonCodes(support, preview),
    created_at: now,
    updated_at: now,
    idempotency_key: idempotencyKey,
    preview_summary: {
      preview_status: preview.preview_status,
      safe_message_summary: preview.safe_context_summary.safe_message_summary,
      allowed_reaction: preview.safe_context_summary.allowed_reaction,
      reaction_type: preview.candidate.reaction_type,
      overlay_effect_id: preview.candidate.overlay_effect_id,
      motion_family: preview.candidate.motion_family,
      outbox_candidate_type: preview.candidate.outbox_candidate_type
    },
    constraints_summary: constraintsSummary
  };
}

async function validateCandidateForApproval(repo: CriptoTipRepository, candidate: ReactionDispatchCandidateMetadata) {
  const support = await repo.getSupportEventById(candidate.support_event_id);
  if (!support) return { status: "missing_support" as const, reason: "candidate_invalid" as ReactionDispatchApprovalReasonCode };
  const rebuilt = await buildReactionDispatchCandidate(repo, support);
  if (candidate.candidate_status === "candidate_invalid" || rebuilt.candidate_status === "candidate_invalid") {
    return { status: "blocked" as const, support, rebuilt, reason: "candidate_invalid" as ReactionDispatchApprovalReasonCode };
  }
  if (candidate.candidate_status === "candidate_blocked" || rebuilt.candidate_status === "candidate_blocked") {
    return { status: "blocked" as const, support, rebuilt, reason: "candidate_blocked" as ReactionDispatchApprovalReasonCode };
  }
  if (candidate.candidate_status === "candidate_superseded" || rebuilt.candidate_status === "candidate_superseded") {
    return { status: "blocked" as const, support, rebuilt, reason: "candidate_superseded" as ReactionDispatchApprovalReasonCode };
  }
  if (
    rebuilt.validation_status !== "valid" ||
    rebuilt.safe_context_hash !== candidate.safe_context_hash ||
    rebuilt.constraints_hash !== candidate.constraints_hash ||
    rebuilt.persona_version !== candidate.persona_version
  ) {
    return { status: "blocked" as const, support, rebuilt, reason: "unsafe_context" as ReactionDispatchApprovalReasonCode };
  }
  return { status: "valid" as const, support, rebuilt, reason: "contract_v2_valid" as ReactionDispatchApprovalReasonCode };
}

function buildReactionDispatchApprovalMetadata(
  candidate: ReactionDispatchCandidateMetadata,
  action: "approve" | "reject",
  reasonCodes: ReactionDispatchApprovalReasonCode[],
  now = new Date().toISOString()
): ReactionDispatchApprovalMetadata {
  const approved = action === "approve";
  return {
    candidate_id: candidate.candidate_id,
    support_event_id: candidate.support_event_id,
    candidate_status: candidate.candidate_status,
    approval_status: approved ? "approved_for_dispatch" : "rejected_by_admin",
    ...(approved ? { approved_at: now, approved_by_actor_type: "admin" as const } : { rejected_at: now, rejected_by_actor_type: "admin" as const }),
    safe_reason_codes: reasonCodes,
    contract_validation_status: candidate.validation_status,
    idempotency_key: `reaction_dispatch_approval:${action}:${candidate.candidate_id}`,
    created_at: now,
    updated_at: now
  };
}

function toReactionDispatchApprovalAuditMetadata(approval: ReactionDispatchApprovalMetadata, beforeStatus: string) {
  return {
    candidate_id: approval.candidate_id,
    support_event_id: approval.support_event_id,
    before_status: beforeStatus,
    after_status: approval.approval_status,
    reason_code: approval.safe_reason_codes[0] ?? "external_execution_forbidden",
    contract_validation_status: approval.contract_validation_status
  };
}

function toBlockedReactionDispatchApproval(
  candidate: ReactionDispatchCandidateMetadata,
  reason: ReactionDispatchApprovalReasonCode,
  existing?: ReactionDispatchApprovalMetadata
): ReactionDispatchApprovalMetadata {
  const now = new Date().toISOString();
  return {
    candidate_id: candidate.candidate_id,
    support_event_id: candidate.support_event_id,
    candidate_status: candidate.candidate_status,
    approval_status: existing?.approval_status ?? (candidate.candidate_status === "candidate_invalid" ? "candidate_invalid" : candidate.candidate_status === "candidate_superseded" ? "candidate_superseded" : "approval_blocked"),
    ...(existing?.approved_at ? { approved_at: existing.approved_at } : {}),
    ...(existing?.rejected_at ? { rejected_at: existing.rejected_at } : {}),
    ...(existing?.approved_by_actor_type ? { approved_by_actor_type: existing.approved_by_actor_type } : {}),
    ...(existing?.rejected_by_actor_type ? { rejected_by_actor_type: existing.rejected_by_actor_type } : {}),
    safe_reason_codes: existing?.safe_reason_codes ?? [reason, "external_execution_forbidden"],
    contract_validation_status: candidate.validation_status,
    idempotency_key: existing?.idempotency_key ?? `reaction_dispatch_approval:blocked:${candidate.candidate_id}:${reason}`,
    created_at: existing?.created_at ?? now,
    updated_at: existing?.updated_at ?? now
  };
}

function toReactionDispatchApprovalSkippedSideEffects() {
  return {
    support_event_mutation: "skipped",
    reaction_enqueue: "skipped",
    overlay_enqueue: "skipped",
    outbox_enqueue: "skipped",
    iris_core_call: "skipped",
    voxweave_call: "skipped",
    real_tts: "skipped",
    real_live2d: "skipped",
    real_renderer: "skipped",
    real_obs: "skipped",
    real_websocket_delivery: "skipped"
  };
}

function toInitialReactionDispatchApprovalStatus(candidate: ReactionDispatchCandidateMetadata): ReactionDispatchApprovalMetadata["approval_status"] {
  if (candidate.candidate_status === "candidate_ready") return "candidate_ready";
  if (candidate.candidate_status === "candidate_invalid") return "candidate_invalid";
  if (candidate.candidate_status === "candidate_superseded") return "candidate_superseded";
  return "approval_blocked";
}

function toReactionDispatchOutboxBoundarySkippedSideEffects() {
  return {
    support_event_mutation: "skipped",
    reaction_enqueue: "skipped",
    overlay_enqueue: "skipped",
    outbox_enqueue: "skipped",
    external_adapter_execution: "skipped",
    iris_core_call: "skipped",
    voxweave_call: "skipped",
    real_tts: "skipped",
    real_live2d: "skipped",
    real_renderer: "skipped",
    real_obs: "skipped",
    real_websocket_delivery: "skipped"
  };
}

function buildReactionDispatchOutboxBoundary(
  candidate: ReactionDispatchCandidateMetadata,
  approval: ReactionDispatchApprovalMetadata,
  reasonCodes: ReactionDispatchOutboxBoundaryReasonCode[],
  status: ReactionDispatchOutboxBoundaryMetadata["boundary_status"],
  now = new Date().toISOString()
): ReactionDispatchOutboxBoundaryMetadata {
  const idempotencyKey = `reaction_dispatch_outbox_boundary:${candidate.candidate_id}:${approval.approval_status}:${candidate.safe_context_hash}:${candidate.constraints_hash}`;
  return {
    boundary_id: `rdbound_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`,
    candidate_id: candidate.candidate_id,
    support_event_id: candidate.support_event_id,
    boundary_status: status,
    approval_status: approval.approval_status,
    candidate_status: candidate.candidate_status,
    safe_reason_codes: reasonCodes,
    contract_validation_status: candidate.validation_status,
    safe_context_hash: candidate.safe_context_hash,
    constraints_hash: candidate.constraints_hash,
    idempotency_key: idempotencyKey,
    created_at: now,
    updated_at: now
  };
}

function toReactionDispatchOutboxBoundaryAuditMetadata(boundary: ReactionDispatchOutboxBoundaryMetadata) {
  return {
    boundary_id: boundary.boundary_id,
    candidate_id: boundary.candidate_id,
    support_event_id: boundary.support_event_id,
    boundary_status: boundary.boundary_status,
    approval_status: boundary.approval_status,
    reason_code: boundary.safe_reason_codes[0] ?? "external_execution_forbidden",
    contract_validation_status: boundary.contract_validation_status
  };
}

function toReactionDispatchInternalOutboxSkippedSideEffects() {
  return {
    support_event_mutation: "skipped",
    reaction_execution: "skipped",
    overlay_execution: "skipped",
    external_outbox_dispatch: "skipped",
    external_adapter_execution: "skipped",
    iris_core_call: "skipped",
    voxweave_call: "skipped",
    real_tts: "skipped",
    real_live2d: "skipped",
    real_renderer: "skipped",
    real_obs: "skipped",
    real_websocket_delivery: "skipped"
  };
}

function buildReactionDispatchInternalOutbox(
  candidate: ReactionDispatchCandidateMetadata,
  boundary: ReactionDispatchOutboxBoundaryMetadata,
  reasonCodes: ReactionDispatchInternalOutboxReasonCode[],
  status: ReactionDispatchInternalOutboxMetadata["outbox_status"],
  now = new Date().toISOString()
): ReactionDispatchInternalOutboxMetadata {
  const idempotencyKey = `reaction_dispatch_internal_outbox:${boundary.boundary_id}:${candidate.candidate_id}:${candidate.safe_context_hash}:${candidate.constraints_hash}`;
  return {
    outbox_id: `rdout_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`,
    boundary_id: boundary.boundary_id,
    candidate_id: candidate.candidate_id,
    support_event_id: candidate.support_event_id,
    stream_id: candidate.stream_id,
    character_id: candidate.character_id,
    source: candidate.source,
    contract_version: candidate.contract_version,
    candidate_status: candidate.candidate_status,
    boundary_status: boundary.boundary_status,
    outbox_status: status,
    external_delivery_status: "not_attempted",
    adapter_execution_status: "not_executed",
    dispatch_attempt_count: 0,
    safe_context_hash: candidate.safe_context_hash,
    constraints_hash: candidate.constraints_hash,
    idempotency_key: idempotencyKey,
    created_at: now,
    updated_at: now,
    safe_reason_codes: reasonCodes
  };
}

function toReactionDispatchInternalOutboxAuditMetadata(outbox: ReactionDispatchInternalOutboxMetadata) {
  return {
    outbox_id: outbox.outbox_id,
    boundary_id: outbox.boundary_id,
    candidate_id: outbox.candidate_id,
    support_event_id: outbox.support_event_id,
    before_status: "boundary_ready",
    after_status: outbox.outbox_status,
    outbox_status: outbox.outbox_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    reason_code: outbox.safe_reason_codes[0] ?? "external_execution_forbidden"
  };
}

function toReactionDispatchOutboxReviewEntry(outbox: ReactionDispatchInternalOutboxMetadata) {
  const reviewBlockers = [
    outbox.external_delivery_status !== "not_attempted" ? "external_delivery_already_attempted" : undefined,
    outbox.adapter_execution_status !== "not_executed" ? "adapter_already_executed" : undefined,
    outbox.dispatch_attempt_count !== 0 ? "dispatch_attempt_count_nonzero" : undefined,
    outbox.outbox_status !== "queued_internal" ? "not_queued_internal" : undefined
  ].filter((entry): entry is string => Boolean(entry));
  return {
    outbox_id: outbox.outbox_id,
    boundary_id: outbox.boundary_id,
    candidate_id: outbox.candidate_id,
    support_event_id: outbox.support_event_id,
    stream_id: outbox.stream_id,
    character_id: outbox.character_id,
    source: outbox.source,
    contract_version: outbox.contract_version,
    candidate_status: outbox.candidate_status,
    boundary_status: outbox.boundary_status,
    outbox_status: outbox.outbox_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    review_status: reviewBlockers.length === 0 ? "ready_for_operator_review" : "blocked_for_operator_review",
    safe_reason_codes: outbox.safe_reason_codes,
    review_blockers: reviewBlockers,
    created_at: outbox.created_at,
    updated_at: outbox.updated_at
  };
}

function isReactionDispatchInternalOutboxCancellable(outbox: ReactionDispatchInternalOutboxMetadata) {
  return (
    (outbox.outbox_status === "queued_internal" || outbox.outbox_status === "pending_internal_dispatch") &&
    outbox.external_delivery_status === "not_attempted" &&
    outbox.adapter_execution_status === "not_executed" &&
    outbox.dispatch_attempt_count === 0
  );
}

function toReactionDispatchInternalOutboxCancelStatus(outbox: ReactionDispatchInternalOutboxMetadata) {
  return {
    outbox_id: outbox.outbox_id,
    candidate_id: outbox.candidate_id,
    boundary_id: outbox.boundary_id,
    support_event_id: outbox.support_event_id,
    outbox_status: outbox.outbox_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    cancelled_at: outbox.cancelled_at,
    cancelled_by_actor_type: outbox.cancelled_by_actor_type,
    safe_reason_codes: outbox.safe_reason_codes,
    created_at: outbox.created_at,
    updated_at: outbox.updated_at
  };
}

function toReactionDispatchInternalOutboxCancelAuditMetadata(outbox: ReactionDispatchInternalOutboxMetadata, beforeStatus: string) {
  return {
    outbox_id: outbox.outbox_id,
    boundary_id: outbox.boundary_id,
    candidate_id: outbox.candidate_id,
    support_event_id: outbox.support_event_id,
    before_status: beforeStatus,
    after_status: outbox.outbox_status,
    outbox_status: outbox.outbox_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    cancelled_at: outbox.cancelled_at,
    cancelled_by_actor_type: outbox.cancelled_by_actor_type,
    reason_code: outbox.safe_reason_codes[0] ?? "cancelled_by_admin"
  };
}

const REACTION_DISPATCH_INTERNAL_OUTBOX_LEASE_TTL_MS = 5 * 60 * 1000;

const AdminReactionDispatchOutboxLeaseRequestSchema = z.object({
  lease_id: z.string().min(1).max(80).optional()
});

function isReactionDispatchInternalOutboxLeaseActive(lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined, now = new Date()) {
  return Boolean(
    lease?.lease_status === "leased_internal" &&
    lease.lease_expires_at &&
    new Date(lease.lease_expires_at).getTime() > now.getTime()
  );
}

function toReactionDispatchInternalOutboxLeaseStatus(
  outboxId: string,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  now = new Date()
): ReactionDispatchInternalOutboxLeaseMetadata {
  const current = lease ?? {
    outbox_id: outboxId,
    lease_status: "not_leased" as const,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    safe_reason_codes: ["lease_not_found", "external_execution_forbidden"] as ReactionDispatchInternalOutboxLeaseReasonCode[]
  };
  if (
    current.lease_status === "leased_internal" &&
    current.lease_expires_at &&
    new Date(current.lease_expires_at).getTime() <= now.getTime()
  ) {
    return {
      ...current,
      lease_status: "lease_expired",
      updated_at: now.toISOString(),
      safe_reason_codes: ["lease_expired", "external_execution_forbidden"]
    };
  }
  return current;
}

function isReactionDispatchInternalOutboxLeaseable(outbox: ReactionDispatchInternalOutboxMetadata) {
  return (
    outbox.outbox_status === "queued_internal" &&
    outbox.external_delivery_status === "not_attempted" &&
    outbox.adapter_execution_status === "not_executed" &&
    outbox.dispatch_attempt_count === 0
  );
}

function toReactionDispatchInternalOutboxLeaseBlockedReasons(outbox: ReactionDispatchInternalOutboxMetadata): ReactionDispatchInternalOutboxLeaseReasonCode[] {
  const reasons: ReactionDispatchInternalOutboxLeaseReasonCode[] = [];
  if (outbox.outbox_status === "cancelled_internal") reasons.push("cancelled_internal");
  else if (outbox.outbox_status === "blocked_internal") reasons.push("blocked_internal");
  else if (outbox.outbox_status === "superseded_internal") reasons.push("superseded_internal");
  else if (outbox.outbox_status !== "queued_internal") reasons.push("not_queued_internal");
  if (outbox.external_delivery_status !== "not_attempted") reasons.push("state_transition_blocked");
  else reasons.push("external_delivery_not_attempted");
  if (outbox.adapter_execution_status !== "not_executed") reasons.push("state_transition_blocked");
  else reasons.push("adapter_not_executed");
  if (outbox.dispatch_attempt_count !== 0) reasons.push("state_transition_blocked");
  reasons.push("external_execution_forbidden");
  return [...new Set(reasons)];
}

function buildReactionDispatchInternalOutboxLease(outbox: ReactionDispatchInternalOutboxMetadata, now = new Date(), previousLease?: ReactionDispatchInternalOutboxLeaseMetadata) {
  const leaseIdSeed = `reaction_dispatch_internal_outbox_lease:${outbox.outbox_id}:${now.toISOString()}:${outbox.updated_at}:${previousLease?.lease_id ?? "none"}:${previousLease?.updated_at ?? "none"}`;
  return {
    outbox_id: outbox.outbox_id,
    lease_status: "leased_internal" as const,
    lease_id: `rdlease_${createHash("sha256").update(leaseIdSeed).digest("hex").slice(0, 24)}`,
    lease_expires_at: new Date(now.getTime() + REACTION_DISPATCH_INTERNAL_OUTBOX_LEASE_TTL_MS).toISOString(),
    leased_by_actor_type: "admin" as const,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    safe_reason_codes: ["lease_created", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"] as ReactionDispatchInternalOutboxLeaseReasonCode[]
  };
}

function toReactionDispatchInternalOutboxLeaseAuditMetadata(lease: ReactionDispatchInternalOutboxLeaseMetadata, beforeStatus: string) {
  return {
    outbox_id: lease.outbox_id,
    before_status: beforeStatus,
    after_status: lease.lease_status,
    lease_status: lease.lease_status,
    lease_id: lease.lease_id,
    lease_expires_at: lease.lease_expires_at,
    leased_by_actor_type: lease.leased_by_actor_type,
    reason_code: lease.safe_reason_codes[0] ?? "external_execution_forbidden"
  };
}

const AdminReactionDispatchOutboxAttemptPlanRequestSchema = z.object({
  lease_id: z.string().min(1).max(80)
});
const AdminReactionDispatchDryRunAdapterBoundaryRequestSchema = z.object({
  lease_id: z.string().min(1).max(80)
});

function toReactionDispatchInternalOutboxAttemptPlanStatus(
  outboxId: string,
  plan: ReactionDispatchInternalOutboxAttemptPlanMetadata | undefined,
  now = new Date()
): ReactionDispatchInternalOutboxAttemptPlanMetadata {
  return plan ?? {
    outbox_id: outboxId,
    lease_id: "none",
    attempt_plan_status: "not_planned",
    planned_adapter_type: "iris_core_reaction_dispatch",
    planned_action: "reaction_dispatch",
    plan_id: "none",
    plan_context_hash: "none",
    created_by_actor_type: "admin",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    safe_reason_codes: ["attempt_plan_not_found", "external_execution_forbidden"]
  };
}

function toReactionDispatchInternalOutboxAttemptPlanBlockedReasons(
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  leaseId: string,
  now = new Date()
): ReactionDispatchInternalOutboxAttemptPlanReasonCode[] {
  const reasons: ReactionDispatchInternalOutboxAttemptPlanReasonCode[] = [];
  if (outbox.outbox_status !== "queued_internal") reasons.push("not_queued_internal");
  if (outbox.external_delivery_status !== "not_attempted") reasons.push("state_transition_blocked");
  else reasons.push("external_delivery_not_attempted");
  if (outbox.adapter_execution_status !== "not_executed") reasons.push("state_transition_blocked");
  else reasons.push("adapter_not_executed");
  if (outbox.dispatch_attempt_count !== 0) reasons.push("state_transition_blocked");
  if (!lease || lease.lease_status === "not_leased" || lease.lease_status === "lease_released") reasons.push("lease_required");
  else if (!isReactionDispatchInternalOutboxLeaseActive(lease, now)) reasons.push("lease_expired");
  else if (lease.lease_id !== leaseId) reasons.push("lease_id_mismatch");
  reasons.push("external_execution_forbidden");
  return [...new Set(reasons)];
}

function isReactionDispatchInternalOutboxAttemptPlannable(
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  leaseId: string,
  now = new Date()
) {
  return (
    outbox.outbox_status === "queued_internal" &&
    outbox.external_delivery_status === "not_attempted" &&
    outbox.adapter_execution_status === "not_executed" &&
    outbox.dispatch_attempt_count === 0 &&
    isReactionDispatchInternalOutboxLeaseActive(lease, now) &&
    lease?.lease_id === leaseId
  );
}

function buildReactionDispatchInternalOutboxAttemptPlan(
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata,
  now = new Date()
): ReactionDispatchInternalOutboxAttemptPlanMetadata {
  const context = {
    outbox_id: outbox.outbox_id,
    boundary_id: outbox.boundary_id,
    candidate_id: outbox.candidate_id,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash,
    lease_id: lease.lease_id,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count
  };
  const planContextHash = hashSafeMetadata(context);
  const planSeed = `reaction_dispatch_internal_outbox_attempt_plan:${outbox.outbox_id}:${lease.lease_id}:${planContextHash}`;
  return {
    outbox_id: outbox.outbox_id,
    lease_id: lease.lease_id ?? "none",
    attempt_plan_status: "planned_internal",
    planned_adapter_type: "iris_core_reaction_dispatch",
    planned_action: "reaction_dispatch",
    plan_id: `rdplan_${createHash("sha256").update(planSeed).digest("hex").slice(0, 24)}`,
    plan_context_hash: planContextHash,
    created_by_actor_type: "admin",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    safe_reason_codes: ["attempt_plan_created", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
  };
}

function toReactionDispatchInternalOutboxAttemptPlanAuditMetadata(plan: ReactionDispatchInternalOutboxAttemptPlanMetadata, beforeStatus: string) {
  return {
    outbox_id: plan.outbox_id,
    before_status: beforeStatus,
    after_status: plan.attempt_plan_status,
    attempt_plan_status: plan.attempt_plan_status,
    plan_id: plan.plan_id,
    lease_id: plan.lease_id,
    planned_adapter_type: plan.planned_adapter_type,
    planned_action: plan.planned_action,
    plan_context_hash: plan.plan_context_hash,
    created_by_actor_type: plan.created_by_actor_type,
    reason_code: plan.safe_reason_codes[0] ?? "external_execution_forbidden"
  };
}

function toReactionDispatchAttemptPlanAdapterKind(plan: ReactionDispatchInternalOutboxAttemptPlanMetadata) {
  if (plan.planned_adapter_type === "iris_core_reaction_dispatch") return "iris_core_reaction" as const;
  return "future_internal_adapter" as const;
}

function toReactionDispatchAttemptPlanReviewEntry(
  plan: ReactionDispatchInternalOutboxAttemptPlanMetadata,
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  now = new Date()
) {
  const leaseStatus = toReactionDispatchInternalOutboxLeaseStatus(outbox.outbox_id, lease, now);
  const blockingReasonCodes = [
    outbox.outbox_status !== "queued_internal" ? "not_queued_internal" : undefined,
    outbox.external_delivery_status !== "not_attempted" ? "external_delivery_already_attempted" : undefined,
    outbox.adapter_execution_status !== "not_executed" ? "adapter_already_executed" : undefined,
    outbox.dispatch_attempt_count !== 0 ? "dispatch_attempt_count_nonzero" : undefined,
    leaseStatus.lease_status !== "leased_internal" ? leaseStatus.lease_status : undefined,
    ...plan.safe_reason_codes.filter((reason) => reason !== "attempt_plan_created" && reason !== "external_delivery_not_attempted" && reason !== "adapter_not_executed")
  ].filter((entry): entry is string => Boolean(entry));
  return {
    plan_id: plan.plan_id,
    outbox_id: outbox.outbox_id,
    lease_id: plan.lease_id,
    candidate_id: outbox.candidate_id,
    boundary_id: outbox.boundary_id,
    support_event_id: outbox.support_event_id,
    stream_id: outbox.stream_id,
    character_id: outbox.character_id,
    source: outbox.source,
    adapter_kind: toReactionDispatchAttemptPlanAdapterKind(plan),
    plan_status: plan.attempt_plan_status,
    outbox_status: outbox.outbox_status,
    lease_status: leaseStatus.lease_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    contract_version: outbox.contract_version,
    validation_status: outbox.candidate_status,
    safe_reason_codes: plan.safe_reason_codes,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    character_continuity_summary: {
      character_id: outbox.character_id,
      source: outbox.source,
      contract_version: outbox.contract_version
    },
    safe_context_summary_presence: {
      safe_context_hash_present: Boolean(outbox.safe_context_hash),
      constraints_hash_present: Boolean(outbox.constraints_hash)
    },
    reaction_constraints_summary: {
      external_delivery_status: outbox.external_delivery_status,
      adapter_execution_status: outbox.adapter_execution_status,
      dispatch_attempt_count: outbox.dispatch_attempt_count
    },
    operator_state_summary: {
      review_surface: "read_only",
      next_step: "dry_run_adapter_boundary",
      runtime_execution: "not_performed"
    },
    blocking_reason_codes: [...new Set(blockingReasonCodes)]
  };
}

function buildReactionDispatchDryRunAdapterBoundary(
  plan: ReactionDispatchInternalOutboxAttemptPlanMetadata,
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata
) {
  const adapterKind = toReactionDispatchAttemptPlanAdapterKind(plan);
  const requestPreview = {
    plan_id: plan.plan_id,
    outbox_id: outbox.outbox_id,
    lease_id: lease.lease_id,
    adapter_kind: adapterKind,
    support_event_id: outbox.support_event_id,
    stream_id: outbox.stream_id,
    character_id: outbox.character_id,
    contract_version: outbox.contract_version,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash,
    plan_context_hash: plan.plan_context_hash
  };
  const requestPreviewHash = hashSafeMetadata(requestPreview);
  const boundarySeed = `reaction_dispatch_dry_run_adapter_boundary:${plan.plan_id}:${lease.lease_id}:${requestPreviewHash}`;
  return {
    dry_run_boundary_id: `rddry_${createHash("sha256").update(boundarySeed).digest("hex").slice(0, 24)}`,
    plan_id: plan.plan_id,
    outbox_id: outbox.outbox_id,
    lease_id: lease.lease_id,
    candidate_id: outbox.candidate_id,
    boundary_id: outbox.boundary_id,
    support_event_id: outbox.support_event_id,
    stream_id: outbox.stream_id,
    character_id: outbox.character_id,
    source: outbox.source,
    adapter_kind: adapterKind,
    dry_run_boundary_status: "dry_run_ready",
    adapter_request_status: "preview_only",
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    contract_version: outbox.contract_version,
    validation_status: outbox.candidate_status,
    safe_reason_codes: ["dry_run_adapter_boundary_ready", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"],
    request_preview_hash: requestPreviewHash,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash,
    created_from_plan_at: plan.created_at,
    request_preview_summary: {
      adapter_kind: adapterKind,
      execution_mode: "dry_run_preview_only",
      external_adapter_call: "not_performed",
      runtime_execution: "not_performed"
    },
    side_effect_summary: {
      support_event_mutation: "skipped",
      outbox_mutation: "skipped",
      lease_mutation: "skipped",
      attempt_plan_mutation: "skipped",
      dispatch_attempt_count_increment: "skipped",
      external_delivery: "skipped"
    }
  };
}

function toReactionDispatchDryRunAdapterBoundaryBlockers(
  plan: ReactionDispatchInternalOutboxAttemptPlanMetadata | undefined,
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  leaseId: string,
  now = new Date()
) {
  const reasons: string[] = [];
  if (!plan) reasons.push("attempt_plan_not_found");
  else if (plan.attempt_plan_status !== "planned_internal") reasons.push(plan.attempt_plan_status);
  if (outbox.outbox_status !== "queued_internal") reasons.push("not_queued_internal");
  if (outbox.external_delivery_status !== "not_attempted") reasons.push("state_transition_blocked");
  else reasons.push("external_delivery_not_attempted");
  if (outbox.adapter_execution_status !== "not_executed") reasons.push("state_transition_blocked");
  else reasons.push("adapter_not_executed");
  if (outbox.dispatch_attempt_count !== 0) reasons.push("state_transition_blocked");
  if (!isReactionDispatchInternalOutboxLeaseActive(lease, now)) reasons.push("lease_required");
  else if (lease?.lease_id !== leaseId || plan?.lease_id !== leaseId) reasons.push("lease_id_mismatch");
  reasons.push("external_execution_forbidden");
  return [...new Set(reasons)];
}

function toReactionDispatchDryRunReviewEntry(
  plan: ReactionDispatchInternalOutboxAttemptPlanMetadata,
  outbox: ReactionDispatchInternalOutboxMetadata,
  lease: ReactionDispatchInternalOutboxLeaseMetadata | undefined,
  now = new Date()
) {
  const leaseStatus = toReactionDispatchInternalOutboxLeaseStatus(outbox.outbox_id, lease, now);
  const blockers = toReactionDispatchDryRunAdapterBoundaryBlockers(plan, outbox, leaseStatus, plan.lease_id, now);
  const blockingReasonCodes = blockers.filter((reason) => !["external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"].includes(reason));
  const dryRunStatus: "dry_run_planned" | "dry_run_ready" | "dry_run_blocked" | "dry_run_invalid" | "dry_run_superseded" = plan.attempt_plan_status === "plan_superseded" || outbox.outbox_status === "superseded_internal"
    ? "dry_run_superseded"
    : plan.attempt_plan_status === "plan_expired" || outbox.outbox_status === "cancelled_internal"
      ? "dry_run_invalid"
      : blockingReasonCodes.length === 0
        ? "dry_run_ready"
        : "dry_run_blocked";
  const readyBoundary = leaseStatus.lease_id && dryRunStatus === "dry_run_ready"
    ? buildReactionDispatchDryRunAdapterBoundary(plan, outbox, leaseStatus)
    : undefined;
  const requestPreviewHash = readyBoundary?.request_preview_hash ?? hashSafeMetadata({
    plan_id: plan.plan_id,
    outbox_id: outbox.outbox_id,
    lease_id: plan.lease_id,
    dry_run_status: dryRunStatus,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash
  });
  const dryRunBoundaryId = readyBoundary?.dry_run_boundary_id ?? `rddry_${createHash("sha256").update(`reaction_dispatch_dry_run_review:${plan.plan_id}:${requestPreviewHash}`).digest("hex").slice(0, 24)}`;
  return {
    dry_run_boundary_id: dryRunBoundaryId,
    plan_id: plan.plan_id,
    outbox_id: outbox.outbox_id,
    lease_id: plan.lease_id,
    candidate_id: outbox.candidate_id,
    boundary_id: outbox.boundary_id,
    support_event_id: outbox.support_event_id,
    stream_id: outbox.stream_id,
    character_id: outbox.character_id,
    source: outbox.source,
    adapter_kind: toReactionDispatchAttemptPlanAdapterKind(plan),
    dry_run_status: dryRunStatus,
    plan_status: plan.attempt_plan_status,
    outbox_status: outbox.outbox_status,
    lease_status: leaseStatus.lease_status,
    external_delivery_status: outbox.external_delivery_status,
    adapter_execution_status: outbox.adapter_execution_status,
    dispatch_attempt_count: outbox.dispatch_attempt_count,
    contract_version: outbox.contract_version,
    validation_status: outbox.candidate_status,
    safe_reason_codes: readyBoundary?.safe_reason_codes ?? blockers,
    safe_context_hash: outbox.safe_context_hash,
    constraints_hash: outbox.constraints_hash,
    request_preview_hash: requestPreviewHash,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    character_continuity_summary: {
      character_id: outbox.character_id,
      source: outbox.source,
      contract_version: outbox.contract_version
    },
    safe_context_summary_presence: {
      safe_context_hash_present: Boolean(outbox.safe_context_hash),
      constraints_hash_present: Boolean(outbox.constraints_hash),
      request_preview_hash_present: Boolean(requestPreviewHash)
    },
    reaction_constraints_summary: {
      external_delivery_status: outbox.external_delivery_status,
      adapter_execution_status: outbox.adapter_execution_status,
      dispatch_attempt_count: outbox.dispatch_attempt_count
    },
    operator_state_summary: {
      review_surface: "read_only",
      next_step: "dry_run_approval_gate",
      runtime_execution: "not_performed"
    },
    adapter_request_shape_summary: {
      adapter_kind: toReactionDispatchAttemptPlanAdapterKind(plan),
      execution_mode: "dry_run_preview_only",
      request_body_included: false,
      auth_material_included: false
    },
    blocking_reason_codes: [...new Set(blockingReasonCodes)]
  };
}

type ReactionDispatchDryRunReviewEntry = ReturnType<typeof toReactionDispatchDryRunReviewEntry>;

const ALLOWED_DRY_RUN_APPROVAL_ADAPTER_KINDS = new Set([
  "iris_core_reaction",
  "voxweave_voice",
  "overlay_effect",
  "future_internal_adapter"
]);

function toReactionDispatchDryRunApprovalBaseline(entry: ReactionDispatchDryRunReviewEntry): ReactionDispatchDryRunApprovalMetadata {
  return {
    dry_run_boundary_id: entry.dry_run_boundary_id,
    plan_id: entry.plan_id,
    outbox_id: entry.outbox_id,
    lease_id: entry.lease_id,
    candidate_id: entry.candidate_id,
    boundary_id: entry.boundary_id,
    support_event_id: entry.support_event_id,
    adapter_kind: entry.adapter_kind,
    dry_run_status: entry.dry_run_status,
    approval_status: entry.dry_run_status === "dry_run_ready" ? "dry_run_ready" : "approval_blocked",
    safe_reason_codes: entry.dry_run_status === "dry_run_ready"
      ? ["external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
      : toReactionDispatchDryRunApprovalBlockers(entry),
    external_delivery_status: entry.external_delivery_status,
    adapter_execution_status: entry.adapter_execution_status,
    dispatch_attempt_count: entry.dispatch_attempt_count,
    safe_context_hash: entry.safe_context_hash,
    constraints_hash: entry.constraints_hash,
    request_preview_hash: entry.request_preview_hash,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  };
}

function toReactionDispatchDryRunApprovalBlockers(entry: ReactionDispatchDryRunReviewEntry): ReactionDispatchDryRunApprovalReasonCode[] {
  const reasons = new Set<ReactionDispatchDryRunApprovalReasonCode>();
  if (entry.dry_run_status === "dry_run_blocked") reasons.add("dry_run_blocked");
  if (entry.dry_run_status === "dry_run_invalid") reasons.add("dry_run_invalid");
  if (entry.dry_run_status === "dry_run_superseded") reasons.add("dry_run_superseded");
  if (entry.dry_run_status !== "dry_run_ready") reasons.add("dry_run_not_ready");
  if (!ALLOWED_DRY_RUN_APPROVAL_ADAPTER_KINDS.has(entry.adapter_kind)) reasons.add("adapter_kind_not_allowed");
  if (entry.validation_status !== "candidate_ready") reasons.add("unsafe_context");
  if (entry.external_delivery_status !== "not_attempted") reasons.add("state_transition_blocked");
  if (entry.adapter_execution_status !== "not_executed") reasons.add("state_transition_blocked");
  if (entry.dispatch_attempt_count !== 0) reasons.add("dispatch_attempt_count_not_zero");
  if (entry.blocking_reason_codes.some((reason) => reason === "unsafe_context")) reasons.add("unsafe_context");
  if (entry.blocking_reason_codes.some((reason) => reason === "lease_required")) reasons.add("lease_required");
  reasons.add("external_execution_forbidden");
  return [...reasons];
}

function isReactionDispatchDryRunApprovalSafe(entry: ReactionDispatchDryRunReviewEntry) {
  return toReactionDispatchDryRunApprovalBlockers(entry).filter((reason) => reason !== "external_execution_forbidden").length === 0;
}

function toReactionDispatchDryRunApprovalSnapshotBlockers(
  entry: ReactionDispatchDryRunReviewEntry,
  approval: ReactionDispatchDryRunApprovalMetadata
): ReactionDispatchDryRunApprovalReasonCode[] {
  const reasons = new Set<ReactionDispatchDryRunApprovalReasonCode>();
  if (approval.plan_id !== entry.plan_id) reasons.add("state_transition_blocked");
  if (approval.outbox_id !== entry.outbox_id) reasons.add("state_transition_blocked");
  if (approval.lease_id !== entry.lease_id) reasons.add("state_transition_blocked");
  if (approval.candidate_id !== entry.candidate_id) reasons.add("unsafe_context");
  if (approval.boundary_id !== entry.boundary_id) reasons.add("unsafe_context");
  if (approval.support_event_id !== entry.support_event_id) reasons.add("unsafe_context");
  if (approval.adapter_kind !== entry.adapter_kind) reasons.add("adapter_kind_not_allowed");
  if (approval.dry_run_status !== "dry_run_ready") reasons.add("dry_run_not_ready");
  if (approval.external_delivery_status !== entry.external_delivery_status) reasons.add("state_transition_blocked");
  if (approval.adapter_execution_status !== entry.adapter_execution_status) reasons.add("state_transition_blocked");
  if (approval.dispatch_attempt_count !== entry.dispatch_attempt_count) reasons.add("dispatch_attempt_count_not_zero");
  if (approval.safe_context_hash !== entry.safe_context_hash) reasons.add("unsafe_context");
  if (approval.constraints_hash !== entry.constraints_hash) reasons.add("unsafe_context");
  if (approval.request_preview_hash !== entry.request_preview_hash) reasons.add("unsafe_context");
  reasons.add("external_execution_forbidden");
  return [...reasons];
}

function isReactionDispatchDryRunApprovalSnapshotCurrent(
  entry: ReactionDispatchDryRunReviewEntry,
  approval: ReactionDispatchDryRunApprovalMetadata
) {
  return toReactionDispatchDryRunApprovalSnapshotBlockers(entry, approval).filter((reason) => reason !== "external_execution_forbidden").length === 0;
}

function toReactionDispatchDryRunApprovalResponse(approval: ReactionDispatchDryRunApprovalMetadata) {
  return {
    dry_run_boundary_id: approval.dry_run_boundary_id,
    plan_id: approval.plan_id,
    outbox_id: approval.outbox_id,
    lease_id: approval.lease_id,
    candidate_id: approval.candidate_id,
    boundary_id: approval.boundary_id,
    support_event_id: approval.support_event_id,
    adapter_kind: approval.adapter_kind,
    dry_run_status: approval.dry_run_status,
    approval_status: approval.approval_status,
    approved_at: approval.approved_at,
    rejected_at: approval.rejected_at,
    approved_by_actor_type: approval.approved_by_actor_type,
    rejected_by_actor_type: approval.rejected_by_actor_type,
    safe_reason_codes: approval.safe_reason_codes,
    external_delivery_status: approval.external_delivery_status,
    adapter_execution_status: approval.adapter_execution_status,
    dispatch_attempt_count: approval.dispatch_attempt_count,
    created_at: approval.created_at,
    updated_at: approval.updated_at
  };
}

async function findReactionDispatchDryRunReviewEntry(
  candidateRepo: Required<ReactionDispatchCandidateRepository>,
  dryRunBoundaryId: string,
  now = new Date()
) {
  for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
    if (!outbox) continue;
    const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
    const entry = toReactionDispatchDryRunReviewEntry(plan, outbox, lease, now);
    if (entry.dry_run_boundary_id === dryRunBoundaryId) return { entry, outbox, lease, plan };
  }
  return undefined;
}

async function findReactionDispatchDryRunReviewEntryByHistoricalBoundaryId(
  candidateRepo: Required<ReactionDispatchCandidateRepository>,
  dryRunBoundaryId: string,
  now = new Date()
) {
  for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
    if (!outbox) continue;
    const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
    const adapterKinds = [...new Set([toReactionDispatchAttemptPlanAdapterKind(plan), "iris_core_reaction" as const])];
    const matchesHistoricalBoundary = adapterKinds.some((adapterKind) => {
      const requestPreview = {
        plan_id: plan.plan_id,
        outbox_id: outbox.outbox_id,
        lease_id: plan.lease_id,
        adapter_kind: adapterKind,
        support_event_id: outbox.support_event_id,
        stream_id: outbox.stream_id,
        character_id: outbox.character_id,
        contract_version: outbox.contract_version,
        safe_context_hash: outbox.safe_context_hash,
        constraints_hash: outbox.constraints_hash,
        plan_context_hash: plan.plan_context_hash
      };
      const requestPreviewHash = hashSafeMetadata(requestPreview);
      const historicalSeed = `reaction_dispatch_dry_run_adapter_boundary:${plan.plan_id}:${plan.lease_id}:${requestPreviewHash}`;
      const historicalDryRunBoundaryId = `rddry_${createHash("sha256").update(historicalSeed).digest("hex").slice(0, 24)}`;
      return historicalDryRunBoundaryId === dryRunBoundaryId;
    });
    if (!matchesHistoricalBoundary) continue;
    const entry = toReactionDispatchDryRunReviewEntry(plan, outbox, lease, now);
    return { entry: { ...entry, dry_run_boundary_id: dryRunBoundaryId }, outbox, lease, plan };
  }
  return undefined;
}

function toReactionDispatchDryRunApprovalAuditMetadata(approval: ReactionDispatchDryRunApprovalMetadata, beforeStatus: string) {
  return {
    dry_run_boundary_id: approval.dry_run_boundary_id,
    plan_id: approval.plan_id,
    outbox_id: approval.outbox_id,
    lease_id: approval.lease_id,
    candidate_id: approval.candidate_id,
    boundary_id: approval.boundary_id,
    support_event_id: approval.support_event_id,
    adapter_kind: approval.adapter_kind,
    dry_run_status: approval.dry_run_status,
    before_status: beforeStatus,
    after_status: approval.approval_status,
    approval_status: approval.approval_status,
    external_delivery_status: approval.external_delivery_status,
    adapter_execution_status: approval.adapter_execution_status,
    dispatch_attempt_count: approval.dispatch_attempt_count
  };
}

function buildReactionDispatchAdapterExecutionBoundaryPreview(entry: ReactionDispatchDryRunReviewEntry, approval: ReactionDispatchDryRunApprovalMetadata) {
  const envelope = {
    dry_run_boundary_id: entry.dry_run_boundary_id,
    approval_status: approval.approval_status,
    plan_id: entry.plan_id,
    outbox_id: entry.outbox_id,
    lease_id: entry.lease_id,
    adapter_kind: entry.adapter_kind,
    support_event_id: entry.support_event_id,
    safe_context_hash: entry.safe_context_hash,
    constraints_hash: entry.constraints_hash,
    request_preview_hash: entry.request_preview_hash
  };
  return {
    adapter_execution_boundary_preview_id: `rdexecprev_${createHash("sha256").update(`reaction_dispatch_adapter_execution_boundary_preview:${hashSafeMetadata(envelope)}`).digest("hex").slice(0, 24)}`,
    dry_run_boundary_id: entry.dry_run_boundary_id,
    plan_id: entry.plan_id,
    outbox_id: entry.outbox_id,
    lease_id: entry.lease_id,
    candidate_id: entry.candidate_id,
    boundary_id: entry.boundary_id,
    support_event_id: entry.support_event_id,
    adapter_kind: entry.adapter_kind,
    approval_status: approval.approval_status,
    preview_status: "adapter_execution_boundary_preview_ready",
    execution_mode: "preview_only",
    external_delivery_status: entry.external_delivery_status,
    adapter_execution_status: entry.adapter_execution_status,
    dispatch_attempt_count: entry.dispatch_attempt_count,
    request_envelope_hash: hashSafeMetadata(envelope),
    safe_context_hash: entry.safe_context_hash,
    constraints_hash: entry.constraints_hash,
    request_preview_hash: entry.request_preview_hash,
    safe_reason_codes: ["approved_for_adapter_execution", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"],
    created_at: approval.updated_at,
    snapshot_at: approval.updated_at,
    derived_from_approval_at: approval.approved_at ?? approval.updated_at,
    side_effect_summary: {
      adapter_execution: "skipped",
      external_delivery: "skipped",
      dispatch_attempt_count_increment: "skipped",
      outbox_mutation: "skipped",
      support_event_mutation: "skipped"
    }
  };
}

function buildReactionDispatchAdapterExecutionBoundaryPreviewBlocked(
  entry: ReactionDispatchDryRunReviewEntry,
  approvalStatus: ReactionDispatchDryRunApprovalStatus,
  safeReasonCodes: ReactionDispatchDryRunApprovalReasonCode[]
) {
  return {
    dry_run_boundary_id: entry.dry_run_boundary_id,
    plan_id: entry.plan_id,
    outbox_id: entry.outbox_id,
    lease_id: entry.lease_id,
    candidate_id: entry.candidate_id,
    boundary_id: entry.boundary_id,
    support_event_id: entry.support_event_id,
    adapter_kind: entry.adapter_kind,
    approval_status: approvalStatus,
    preview_status: "adapter_execution_boundary_preview_blocked" as const,
    execution_mode: "preview_only" as const,
    external_delivery_status: entry.external_delivery_status,
    adapter_execution_status: entry.adapter_execution_status,
    dispatch_attempt_count: entry.dispatch_attempt_count,
    safe_context_hash: entry.safe_context_hash,
    constraints_hash: entry.constraints_hash,
    request_preview_hash: entry.request_preview_hash,
    safe_reason_codes: safeReasonCodes,
    side_effect_summary: {
      adapter_execution: "skipped",
      external_delivery: "skipped",
      dispatch_attempt_count_increment: "skipped",
      outbox_mutation: "skipped",
      support_event_mutation: "skipped"
    }
  };
}

function buildReactionDispatchAdapterExecutionBoundaryPreviewReviewEntry(
  entry: ReactionDispatchDryRunReviewEntry,
  approval: ReactionDispatchDryRunApprovalMetadata | undefined
) {
  if (!approval || approval.approval_status !== "approved_for_adapter_execution") {
    return buildReactionDispatchAdapterExecutionBoundaryPreviewBlocked(entry, approval?.approval_status ?? "approval_blocked", [
      "state_transition_blocked",
      "external_execution_forbidden"
    ]);
  }
  if (!isReactionDispatchDryRunApprovalSafe(entry)) {
    return buildReactionDispatchAdapterExecutionBoundaryPreviewBlocked(
      entry,
      approval.approval_status,
      toReactionDispatchDryRunApprovalBlockers(entry)
    );
  }
  if (!isReactionDispatchDryRunApprovalSnapshotCurrent(entry, approval)) {
    return buildReactionDispatchAdapterExecutionBoundaryPreviewBlocked(
      entry,
      approval.approval_status,
      toReactionDispatchDryRunApprovalSnapshotBlockers(entry, approval)
    );
  }
  return buildReactionDispatchAdapterExecutionBoundaryPreview(entry, approval);
}

const LOCAL_SIMULATION_ADAPTER_KINDS = new Set(["iris_core_reaction", "voxweave_voice", "overlay_effect"]);

function toAdapterExecutionBoundaryApprovalSnapshotHash(preview: ReturnType<typeof buildReactionDispatchAdapterExecutionBoundaryPreview>) {
  return hashSafeMetadata({
    adapter_execution_boundary_preview_id: preview.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: preview.dry_run_boundary_id,
    plan_id: preview.plan_id,
    outbox_id: preview.outbox_id,
    lease_id: preview.lease_id,
    candidate_id: preview.candidate_id,
    boundary_id: preview.boundary_id,
    adapter_kind: preview.adapter_kind,
    request_envelope_hash: preview.request_envelope_hash,
    safe_context_hash: preview.safe_context_hash,
    constraints_hash: preview.constraints_hash,
    request_preview_hash: preview.request_preview_hash,
    external_delivery_status: preview.external_delivery_status,
    adapter_execution_status: preview.adapter_execution_status,
    dispatch_attempt_count: preview.dispatch_attempt_count
  });
}

function toAdapterExecutionBoundaryApprovalBaseline(
  preview: ReturnType<typeof buildReactionDispatchAdapterExecutionBoundaryPreview>
): ReactionDispatchAdapterExecutionBoundaryApprovalMetadata {
  const approvalSnapshotHash = toAdapterExecutionBoundaryApprovalSnapshotHash(preview);
  return {
    approval_id: `rdexecapproval_${createHash("sha256").update(`reaction_dispatch_adapter_execution_boundary_approval:${approvalSnapshotHash}`).digest("hex").slice(0, 24)}`,
    adapter_execution_boundary_preview_id: preview.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: preview.dry_run_boundary_id,
    plan_id: preview.plan_id,
    outbox_id: preview.outbox_id,
    lease_id: preview.lease_id,
    candidate_id: preview.candidate_id,
    boundary_id: preview.boundary_id,
    support_event_id: preview.support_event_id,
    adapter_kind: preview.adapter_kind,
    approval_status: "adapter_execution_boundary_preview_ready",
    approval_snapshot_hash: approvalSnapshotHash,
    request_envelope_hash: preview.request_envelope_hash,
    safe_context_hash: preview.safe_context_hash,
    constraints_hash: preview.constraints_hash,
    request_preview_hash: preview.request_preview_hash,
    external_delivery_status: preview.external_delivery_status,
    adapter_execution_status: preview.adapter_execution_status,
    dispatch_attempt_count: preview.dispatch_attempt_count,
    safe_reason_codes: ["external_execution_forbidden"],
    created_at: preview.snapshot_at,
    updated_at: preview.snapshot_at
  };
}

function toAdapterExecutionBoundaryApprovalResponse(approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata) {
  return {
    approval_id: approval.approval_id,
    adapter_execution_boundary_preview_id: approval.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: approval.dry_run_boundary_id,
    plan_id: approval.plan_id,
    outbox_id: approval.outbox_id,
    lease_id: approval.lease_id,
    candidate_id: approval.candidate_id,
    boundary_id: approval.boundary_id,
    support_event_id: approval.support_event_id,
    adapter_kind: approval.adapter_kind,
    approval_status: approval.approval_status,
    approval_snapshot_hash: approval.approval_snapshot_hash,
    request_envelope_hash: approval.request_envelope_hash,
    safe_context_hash: approval.safe_context_hash,
    constraints_hash: approval.constraints_hash,
    request_preview_hash: approval.request_preview_hash,
    approved_at: approval.approved_at,
    rejected_at: approval.rejected_at,
    approved_by_actor_type: approval.approved_by_actor_type,
    rejected_by_actor_type: approval.rejected_by_actor_type,
    safe_reason_codes: approval.safe_reason_codes,
    created_at: approval.created_at,
    updated_at: approval.updated_at
  };
}

function toAdapterExecutionBoundaryApprovalAuditMetadata(
  approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata,
  beforeStatus: ReactionDispatchAdapterExecutionBoundaryApprovalStatus
) {
  return {
    approval_id: approval.approval_id,
    dry_run_boundary_id: approval.dry_run_boundary_id,
    adapter_execution_boundary_preview_id: approval.adapter_execution_boundary_preview_id,
    approval_snapshot_hash: approval.approval_snapshot_hash,
    before_status: beforeStatus,
    after_status: approval.approval_status,
    approval_status: approval.approval_status,
    adapter_kind: approval.adapter_kind,
    safe_reason_codes: approval.safe_reason_codes
  };
}

function toAdapterExecutionBoundarySnapshotMismatchReasons(
  preview: ReturnType<typeof buildReactionDispatchAdapterExecutionBoundaryPreview>,
  input: z.infer<typeof AdminAdapterExecutionBoundaryApprovalRequestSchema>
): ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode[] {
  const reasons = new Set<ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode>();
  if (input.adapter_execution_boundary_preview_id !== preview.adapter_execution_boundary_preview_id) reasons.add("preview_snapshot_mismatch");
  if (input.request_envelope_hash !== preview.request_envelope_hash) reasons.add("preview_snapshot_mismatch");
  if (input.safe_context_hash !== preview.safe_context_hash) reasons.add("preview_snapshot_mismatch");
  if (input.constraints_hash !== preview.constraints_hash) reasons.add("preview_snapshot_mismatch");
  if (input.request_preview_hash !== preview.request_preview_hash) reasons.add("preview_snapshot_mismatch");
  reasons.add("external_execution_forbidden");
  return [...reasons];
}

async function findAdapterExecutionBoundaryReadyPreview(
  candidateRepo: Required<ReactionDispatchCandidateRepository>,
  dryRunBoundaryId: string
) {
  const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId)
    ?? await findReactionDispatchDryRunReviewEntryByHistoricalBoundaryId(candidateRepo, dryRunBoundaryId);
  if (!found) return undefined;
  const dryRunApproval = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
  const reviewEntry = buildReactionDispatchAdapterExecutionBoundaryPreviewReviewEntry(found.entry, dryRunApproval);
  if (reviewEntry.preview_status !== "adapter_execution_boundary_preview_ready") {
    return { found, dryRunApproval, reviewEntry, preview: undefined };
  }
  return { found, dryRunApproval, reviewEntry, preview: reviewEntry };
}

function toAdapterExecutionBoundaryApprovalPreconditionReasons(
  entry: ReactionDispatchDryRunReviewEntry,
  preview: ReturnType<typeof buildReactionDispatchAdapterExecutionBoundaryPreview>
): ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode[] {
  const reasons = new Set<ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode>();
  if (preview.preview_status !== "adapter_execution_boundary_preview_ready") reasons.add("preview_not_ready");
  if (entry.lease_status === "lease_expired") reasons.add("lease_expired");
  if (entry.lease_status === "lease_released") reasons.add("lease_released");
  if (entry.lease_status !== "leased_internal") reasons.add("lease_not_active");
  if (entry.outbox_status !== "queued_internal") reasons.add("outbox_not_queued");
  if (entry.external_delivery_status !== "not_attempted") reasons.add("external_delivery_already_attempted");
  if (entry.adapter_execution_status !== "not_executed") reasons.add("adapter_already_executed");
  if (entry.dispatch_attempt_count !== 0) reasons.add("dispatch_attempt_count_nonzero");
  if (entry.validation_status !== "candidate_ready") reasons.add("candidate_not_approved");
  if (entry.dry_run_status !== "dry_run_ready") reasons.add("boundary_not_ready");
  if (!LOCAL_SIMULATION_ADAPTER_KINDS.has(entry.adapter_kind)) reasons.add("adapter_kind_not_supported_for_simulation");
  reasons.add("external_execution_forbidden");
  return [...reasons];
}

function toAdapterExecutionBoundaryApprovalBlockersFromReviewEntry(
  entry: ReactionDispatchDryRunReviewEntry
): ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode[] {
  const reasons = new Set<ReactionDispatchAdapterExecutionBoundaryApprovalReasonCode>();
  if (entry.dry_run_status !== "dry_run_ready") reasons.add("preview_not_ready");
  if (entry.lease_status === "lease_expired") reasons.add("lease_expired");
  else if (entry.lease_status === "lease_released") reasons.add("lease_released");
  else if (entry.lease_status !== "leased_internal") reasons.add("lease_not_active");
  if (entry.outbox_status !== "queued_internal") reasons.add("outbox_not_queued");
  if (entry.external_delivery_status !== "not_attempted") reasons.add("external_delivery_already_attempted");
  if (entry.adapter_execution_status !== "not_executed") reasons.add("adapter_already_executed");
  if (entry.dispatch_attempt_count !== 0) reasons.add("dispatch_attempt_count_nonzero");
  if (entry.validation_status !== "candidate_ready") reasons.add("candidate_not_approved");
  if (entry.blocking_reason_codes.some((reason) => reason === "adapter_kind_not_allowed") || !LOCAL_SIMULATION_ADAPTER_KINDS.has(entry.adapter_kind)) {
    reasons.add("adapter_kind_not_supported_for_simulation");
  }
  reasons.add("external_execution_forbidden");
  return [...reasons];
}

function toLocalAdapterSimulationStatus(simulationCase: ReactionDispatchLocalAdapterSimulationCase) {
  if (simulationCase === "success") return "simulated_success" as const;
  if (simulationCase === "retryable_failure") return "simulated_retryable_failure" as const;
  return "simulated_terminal_failure" as const;
}

function toLocalAdapterSimulationReasonCodes(simulationCase: ReactionDispatchLocalAdapterSimulationCase): ReactionDispatchLocalAdapterSimulationReasonCode[] {
  if (simulationCase === "success") return ["simulation_success", "external_execution_forbidden"];
  if (simulationCase === "retryable_failure") return ["simulation_retryable_failure", "external_execution_forbidden"];
  return ["simulation_terminal_failure", "external_execution_forbidden"];
}

function toLocalAdapterSimulationSnapshotHash(
  approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata,
  simulationCase: ReactionDispatchLocalAdapterSimulationCase
) {
  return hashSafeMetadata({
    approval_id: approval.approval_id,
    adapter_execution_boundary_preview_id: approval.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: approval.dry_run_boundary_id,
    plan_id: approval.plan_id,
    outbox_id: approval.outbox_id,
    lease_id: approval.lease_id,
    candidate_id: approval.candidate_id,
    adapter_kind: approval.adapter_kind,
    approval_snapshot_hash: approval.approval_snapshot_hash,
    request_envelope_hash: approval.request_envelope_hash,
    safe_context_hash: approval.safe_context_hash,
    constraints_hash: approval.constraints_hash,
    request_preview_hash: approval.request_preview_hash,
    simulation_case: simulationCase
  });
}

function buildLocalAdapterSimulationResult(
  approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata,
  simulationCase: ReactionDispatchLocalAdapterSimulationCase,
  now = new Date().toISOString()
): ReactionDispatchLocalAdapterSimulationResultMetadata {
  const simulationSnapshotHash = toLocalAdapterSimulationSnapshotHash(approval, simulationCase);
  return {
    simulation_result_id: `rdsim_${createHash("sha256").update(`reaction_dispatch_local_adapter_simulation:${simulationSnapshotHash}`).digest("hex").slice(0, 24)}`,
    approval_id: approval.approval_id,
    adapter_execution_boundary_preview_id: approval.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: approval.dry_run_boundary_id,
    plan_id: approval.plan_id,
    outbox_id: approval.outbox_id,
    lease_id: approval.lease_id,
    candidate_id: approval.candidate_id,
    support_event_id: approval.support_event_id,
    adapter_kind: approval.adapter_kind,
    simulation_case: simulationCase,
    simulation_status: toLocalAdapterSimulationStatus(simulationCase),
    simulation_snapshot_hash: simulationSnapshotHash,
    approval_snapshot_hash: approval.approval_snapshot_hash,
    request_envelope_hash: approval.request_envelope_hash,
    safe_context_hash: approval.safe_context_hash,
    constraints_hash: approval.constraints_hash,
    request_preview_hash: approval.request_preview_hash,
    simulation_attempt_count: 1,
    safe_reason_codes: toLocalAdapterSimulationReasonCodes(simulationCase),
    created_at: now,
    updated_at: now
  };
}

function toLocalAdapterSimulationBlocked(
  dryRunBoundaryId: string,
  reasonCodes: ReactionDispatchLocalAdapterSimulationReasonCode[]
) {
  return {
    dry_run_boundary_id: dryRunBoundaryId,
    simulation_status: "simulated_blocked" as const,
    safe_reason_codes: reasonCodes,
    side_effect_summary: {
      adapter_execution: "skipped",
      external_delivery: "skipped",
      dispatch_attempt_count_increment: "skipped",
      outbox_mutation: "skipped",
      support_event_mutation: "skipped"
    }
  };
}

function toLocalAdapterSimulationResponse(result: ReactionDispatchLocalAdapterSimulationResultMetadata) {
  return {
    simulation_result_id: result.simulation_result_id,
    approval_id: result.approval_id,
    adapter_execution_boundary_preview_id: result.adapter_execution_boundary_preview_id,
    dry_run_boundary_id: result.dry_run_boundary_id,
    plan_id: result.plan_id,
    outbox_id: result.outbox_id,
    lease_id: result.lease_id,
    candidate_id: result.candidate_id,
    support_event_id: result.support_event_id,
    adapter_kind: result.adapter_kind,
    simulation_case: result.simulation_case,
    simulation_status: result.simulation_status,
    simulation_snapshot_hash: result.simulation_snapshot_hash,
    approval_snapshot_hash: result.approval_snapshot_hash,
    request_envelope_hash: result.request_envelope_hash,
    safe_context_hash: result.safe_context_hash,
    constraints_hash: result.constraints_hash,
    request_preview_hash: result.request_preview_hash,
    simulation_attempt_count: result.simulation_attempt_count,
    safe_reason_codes: result.safe_reason_codes,
    created_at: result.created_at,
    updated_at: result.updated_at
  };
}

function buildReactionDispatchSimulationFailureDlq(
  result: ReactionDispatchLocalAdapterSimulationResultMetadata,
  now = new Date().toISOString()
): ReactionDispatchSimulationFailureDlqMetadata | undefined {
  if (result.simulation_status !== "simulated_retryable_failure" && result.simulation_status !== "simulated_terminal_failure") return undefined;
  const failureClass = result.simulation_status === "simulated_retryable_failure" ? "retryable_failure" : "terminal_failure";
  const safeFailureFingerprint = hashSafeMetadata({
    simulation_result_id: result.simulation_result_id,
    preview_id: result.adapter_execution_boundary_preview_id,
    support_event_id: result.support_event_id,
    adapter_kind: result.adapter_kind,
    failure_class: failureClass,
    simulation_snapshot_hash: result.simulation_snapshot_hash,
    safe_reason_codes: result.safe_reason_codes
  });
  return {
    dlq_id: `rdsimdlq_${createHash("sha256").update(`reaction_dispatch_simulation_failure_dlq:${safeFailureFingerprint}`).digest("hex").slice(0, 24)}`,
    simulation_result_id: result.simulation_result_id,
    preview_id: result.adapter_execution_boundary_preview_id,
    support_event_id: result.support_event_id,
    adapter_kind: result.adapter_kind,
    failure_class: failureClass,
    retry_eligibility: failureClass === "retryable_failure" ? "retry_candidate" : "not_retryable",
    safe_failure_fingerprint: safeFailureFingerprint,
    safe_reason_codes: result.safe_reason_codes,
    created_at: now,
    updated_at: now
  };
}

function toReactionDispatchSimulationFailureDlqResponse(entry: ReactionDispatchSimulationFailureDlqMetadata) {
  return {
    dlq_id: entry.dlq_id,
    simulation_result_id: entry.simulation_result_id,
    preview_id: entry.preview_id,
    support_event_id: entry.support_event_id,
    adapter_kind: entry.adapter_kind,
    failure_class: entry.failure_class,
    retry_eligibility: entry.retry_eligibility,
    safe_failure_fingerprint: entry.safe_failure_fingerprint,
    safe_reason_codes: entry.safe_reason_codes,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  };
}

function getYouTubeLiveChatFixtureCursorStores(repo: CriptoTipRepository) {
  let cursors = youtubeLiveChatFixtureCursorFallbackByRepo.get(repo);
  if (!cursors) {
    cursors = new Map<string, YouTubeLiveChatFixtureCursorState>();
    youtubeLiveChatFixtureCursorFallbackByRepo.set(repo, cursors);
  }
  let identities = youtubeLiveChatFixtureCursorIdentityFallbackByRepo.get(repo);
  if (!identities) {
    identities = new Map<string, string>();
    youtubeLiveChatFixtureCursorIdentityFallbackByRepo.set(repo, identities);
  }
  return { cursors, identities };
}

function toYouTubeLiveChatFixtureCursorResponse(cursor: YouTubeLiveChatFixtureCursorState) {
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
    created_at: cursor.created_at,
    updated_at: cursor.updated_at
  };
}

function extractSafePageMessageIds(page: unknown) {
  const record = typeof page === "object" && page !== null && !Array.isArray(page) ? page as Record<string, unknown> : {};
  const items = Array.isArray(record.items) ? record.items : [];
  return items
    .map((item) => {
      const itemRecord = typeof item === "object" && item !== null && !Array.isArray(item) ? item as Record<string, unknown> : {};
      return typeof itemRecord.id === "string" ? itemRecord.id : "unknown";
    })
    .sort();
}

function toYouTubeLiveChatFixturePageFingerprint(cursorId: string, pageToken: string | null, page: unknown) {
  const record = typeof page === "object" && page !== null && !Array.isArray(page) ? page as Record<string, unknown> : {};
  return hashSafeMetadata({
    cursor_id: cursorId,
    input_page_token: pageToken ?? null,
    next_page_token: typeof record.nextPageToken === "string" ? record.nextPageToken : null,
    message_ids: extractSafePageMessageIds(page)
  });
}

async function toReactionDispatchPreview(repo: CriptoTipRepository, support: SupportReceived) {
  const resolutionRepo = getResolutionRepository(repo);
  const resolution = await resolutionRepo.getSupportEventResolution(support.event_id);
  const streamEvents = await repo.listSupportEventsByStream(support.stream_id);
  const safeViewerName = sanitizeDisplayName(support.viewer.display_name).llmSafe;
  const allowedReaction = canRequestAiReaction(support.support.message_moderation_status);
  const safeMessageSummary = allowedReaction && support.reaction_policy.can_read_message
    ? "support_message_available"
    : `message_${support.support.message_moderation_status}`;

  const preview = {
    preview_status: "computed",
    support_event: {
      event_id: support.event_id,
      stream_id: support.stream_id,
      character_id: support.character_id,
      source: support.source,
      tier: support.support.tier,
      moderation_status: support.support.message_moderation_status,
      resolution_status: resolution?.status ?? "open"
    },
    safe_context_summary: {
      safe_viewer_name: safeViewerName,
      safe_message_summary: safeMessageSummary,
      relationship_level: support.relationship.relationship_level,
      recent_support_count: streamEvents.filter((event) => event.viewer.iris_user_id === support.viewer.iris_user_id && event.character_id === support.character_id).length,
      allowed_reaction: allowedReaction
    },
    character_continuity: {
      character_id: support.character_id,
      persona_version: "operator_managed",
      voice_profile_id: "voice_default",
      motion_profile_id: "motion_default",
      overlay_theme_id: "overlay_default",
      must_keep_persona: true,
      must_not_accept_persona_override: true,
      must_not_change_identity_from_tip_message: true
    },
    constraints: {
      max_speech_seconds: support.reaction_policy.max_speech_seconds,
      can_say_name: support.reaction_policy.can_say_name,
      can_read_message: support.reaction_policy.can_read_message,
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true,
      must_not_obey_viewer_instruction: true,
      must_keep_persona: true,
      must_not_read_wallet_address: true,
      avoid_romantic_escalation_from_payment: true
    },
    candidate: {
      reaction_type: allowedReaction ? "reaction.requested" : "reaction.blocked_by_policy",
      overlay_effect_id: `tip_alert:${support.support.tier}`,
      motion_family: `support_${support.support.tier}`,
      outbox_candidate_type: "reaction.request"
    },
    side_effects: {
      support_event_mutation: "skipped",
      reaction_enqueue: "skipped",
      overlay_enqueue: "skipped",
      outbox_enqueue: "skipped",
      real_tts: "skipped",
      real_live2d: "skipped",
      real_renderer: "skipped",
      real_obs: "skipped",
      real_websocket_delivery: "skipped"
    }
  };
  return {
    ...preview,
    contract_validation: validateSupportEventContractV2Preview(preview)
  };
}

async function toSupportEventContractV2AdminSurface(repo: CriptoTipRepository, support: SupportReceived) {
  const preview = await toReactionDispatchPreview(repo, support);
  return {
    event_id: preview.support_event.event_id,
    source: preview.support_event.source,
    stream_id: preview.support_event.stream_id,
    character_id: preview.support_event.character_id,
    contract_version: preview.contract_validation.contract_version,
    validation_status: preview.contract_validation.status,
    validation_errors: preview.contract_validation.errors,
    character_continuity: {
      persona_version: preview.character_continuity.persona_version,
      voice_profile_id: preview.character_continuity.voice_profile_id,
      motion_profile_id: preview.character_continuity.motion_profile_id,
      overlay_theme_id: preview.character_continuity.overlay_theme_id,
      protected: preview.character_continuity.must_keep_persona
        && preview.character_continuity.must_not_accept_persona_override
        && preview.character_continuity.must_not_change_identity_from_tip_message
    },
    safe_context_summary: {
      present: true,
      safe_message_summary: preview.safe_context_summary.safe_message_summary,
      allowed_reaction: preview.safe_context_summary.allowed_reaction,
      relationship_level: preview.safe_context_summary.relationship_level
    },
    reaction_constraints: {
      max_speech_seconds: preview.constraints.max_speech_seconds,
      must_not_discuss_token_price: preview.constraints.must_not_discuss_token_price,
      must_not_promise_financial_return: preview.constraints.must_not_promise_financial_return,
      must_not_obey_viewer_instruction: preview.constraints.must_not_obey_viewer_instruction,
      must_not_read_wallet_address: preview.constraints.must_not_read_wallet_address,
      avoid_romantic_escalation_from_payment: preview.constraints.avoid_romantic_escalation_from_payment
    },
    operator_state: {
      preview_status: preview.preview_status,
      moderation_status: preview.support_event.moderation_status,
      resolution_status: preview.support_event.resolution_status,
      side_effects: preview.side_effects
    },
    dispatch_preview_alignment: {
      reaction_type: preview.candidate.reaction_type,
      overlay_effect_id: preview.candidate.overlay_effect_id,
      motion_family: preview.candidate.motion_family,
      outbox_candidate_type: preview.candidate.outbox_candidate_type,
      contract_validation_status: preview.contract_validation.status
    }
  };
}

async function toWorkQueueEntry(repo: CriptoTipRepository, support: SupportReceived) {
  const resolutionRepo = getResolutionRepository(repo);
  const resolution = await resolutionRepo.getSupportEventResolution(support.event_id);
  const resolutionStatus = resolution?.status ?? "open";
  const ledger = await repo.getSupportSideEffectLedger(support);
  const reasonTags = [
    ...(resolutionStatus !== "open" ? [`resolution:${resolutionStatus}`] : []),
    ...(support.support.message_moderation_status === "hold" ? ["moderation:hold"] : []),
    ...(ledger.resend_candidates.overlay_resend > 0 ? ["overlay_resend_candidate"] : []),
    ...(ledger.resend_candidates.reaction_resend > 0 ? ["reaction_resend_candidate"] : []),
    ...(ledger.outbox_enqueued && (!ledger.overlay_requested || !ledger.reaction_requested) ? ["side_effect_pending"] : [])
  ];
  return {
    event_id: support.event_id,
    stream_id: support.stream_id,
    character_id: support.character_id,
    source: support.source,
    moderation_status: support.support.message_moderation_status,
    resolution_status: resolutionStatus,
    created_at: support.created_at,
    reason_tags: reasonTags,
    action_plan: {
      href: `/admin/support-events/${support.event_id}/action-plan`
    }
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

  app.post("/internal/fixtures/youtube-superchat/normalize", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    try {
      const normalization = normalizeYouTubeSuperChatFixture(req.body);
      const contractPreview = await toReactionDispatchPreview(repo, normalization.normalized_event);
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
      const issuePaths = error instanceof z.ZodError
        ? error.issues.map((issue) => issue.path.join(".")).filter(Boolean)
        : [];
      return reply.code(400).send({
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
      });
    }
  });

  app.post("/internal/fixtures/youtube-superchat/ingest", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    try {
      const normalization = normalizeYouTubeSuperChatFixture(req.body);
      const contractPreview = await toReactionDispatchPreview(repo, normalization.normalized_event);
      if (contractPreview.contract_validation.status !== "valid") {
        return reply.code(409).send({
          error: "youtube_superchat_fixture_invalid",
          safe_reason_codes: contractPreview.contract_validation.errors,
          side_effects: normalization.side_effects
        });
      }
      const result = await applySupportReceivedSideEffects(repo, normalization.normalized_event);
      return {
        ...result,
        normalization_status: normalization.normalization_status,
        idempotency_key: normalization.idempotency_key,
        safe_reason_codes: normalization.safe_reason_codes,
        contract_validation: contractPreview.contract_validation
      };
    } catch (error) {
      const issuePaths = error instanceof z.ZodError
        ? error.issues.map((issue) => issue.path.join(".")).filter(Boolean)
        : [];
      return reply.code(400).send({
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
      });
    }
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const parsedInput = InternalYouTubeLiveChatFixtureCursorCreateSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return reply.code(400).send({ error: "youtube_live_chat_fixture_cursor_invalid", safe_reason_codes: ["character_id_required"] });
    }
    const input = parsedInput.data;
    const { cursors, identities } = getYouTubeLiveChatFixtureCursorStores(repo);
    const identity = `${input.stream_id}:${input.youtube_video_id}:${input.live_chat_id}:${input.character_id}`;
    const existingId = identities.get(identity);
    if (existingId) {
      const existing = cursors.get(existingId);
      if (existing) return { cursor: toYouTubeLiveChatFixtureCursorResponse(existing), idempotent: true, safe_reason_codes: ["cursor_created"] };
    }
    const now = new Date().toISOString();
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
      page_fingerprints: new Set<string>()
    };
    cursors.set(cursor.cursor_id, cursor);
    identities.set(identity, cursor.cursor_id);
    return { cursor: toYouTubeLiveChatFixtureCursorResponse(cursor), idempotent: false, safe_reason_codes: ["cursor_created"] };
  });

  app.post("/internal/fixtures/youtube-live-chat/cursors/:cursorId/pages", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const input = InternalYouTubeLiveChatFixtureCursorPageSchema.parse(req.body);
    const { cursors } = getYouTubeLiveChatFixtureCursorStores(repo);
    const cursor = cursors.get(cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    const pageToken = input.page_token ?? null;
    const fingerprint = toYouTubeLiveChatFixturePageFingerprint(cursor.cursor_id, pageToken, input.page);
    if (cursor.page_fingerprints.has(fingerprint)) {
      return {
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_fingerprint: fingerprint, page_status: "page_replayed", safe_reason_codes: ["page_replayed"] },
        idempotent: true
      };
    }
    const expectedToken = cursor.next_page_token;
    if ((expectedToken ?? "") !== (pageToken ?? "")) {
      return reply.code(409).send({
        cursor: toYouTubeLiveChatFixtureCursorResponse(cursor),
        page_result: { page_status: "page_blocked", safe_reason_codes: ["page_token_mismatch", "page_out_of_order"] }
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
    let acceptedNormalized = 0;
    for (const event of parsed.normalized_events) {
      if (cursor.seen_message_ids.has(event.source_event_id)) {
        crossPageDuplicates += 1;
        continue;
      }
      cursor.seen_message_ids.add(event.source_event_id);
      acceptedNormalized += 1;
      cursor.last_message_id = event.source_event_id;
      cursor.last_message_published_at = event.created_at;
    }
    for (const messageId of extractSafePageMessageIds(input.page)) {
      if (messageId !== "unknown") cursor.seen_message_ids.add(messageId);
    }
    cursor.current_page_token = pageToken;
    cursor.next_page_token = parsed.next_page_token;
    cursor.pages_ingested += 1;
    cursor.messages_seen = cursor.seen_message_ids.size;
    cursor.super_chats_normalized += acceptedNormalized;
    cursor.duplicates_skipped += parsed.page_summary.duplicate_count + crossPageDuplicates;
    cursor.cursor_status = parsed.next_page_token ? "page_ingested" : "caught_up_fixture";
    cursor.updated_at = new Date().toISOString();
    cursor.page_fingerprints.add(fingerprint);
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

  app.get("/internal/fixtures/youtube-live-chat/cursors/:cursorId", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { cursorId } = z.object({ cursorId: z.string() }).parse(req.params);
    const { cursors } = getYouTubeLiveChatFixtureCursorStores(repo);
    const cursor = cursors.get(cursorId);
    if (!cursor) return reply.code(404).send({ error: "youtube_live_chat_fixture_cursor_not_found" });
    return { cursor: toYouTubeLiveChatFixtureCursorResponse(cursor) };
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

  app.get("/admin/operator-notes", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminOperatorNoteSearchQuerySchema.parse(req.query);
    const noteRepo = getOperatorNoteRepository(repo);
    const searchFilter: Parameters<CriptoTipRepository["searchSupportEvents"]>[0] = { limit: 100, offset: 0 };
    if (query.stream_id) searchFilter.streamId = query.stream_id;
    if (query.character_id) searchFilter.characterId = query.character_id;
    const supportEvents = query.support_event_id
      ? [await repo.getSupportEventById(query.support_event_id)].filter((event): event is SupportReceived => Boolean(event))
      : (await repo.searchSupportEvents(searchFilter))
        .map((entry) => ({
          event_id: entry.event_id,
          stream_id: entry.stream_id,
          character_id: entry.character_id,
          source: entry.source
        }));
    const needle = query.q ? sanitizeOperatorNote(query.q).toLowerCase() : undefined;
    const entries = [];
    for (const event of supportEvents) {
      const notes = await noteRepo.listSupportEventOperatorNotes(event.event_id, { includeArchived: true });
      for (const note of notes) {
        if (query.archived !== undefined && note.archived !== query.archived) continue;
        if (query.created_after && note.created_at < query.created_after) continue;
        if (query.created_before && note.created_at > query.created_before) continue;
        if (needle && !note.note.toLowerCase().includes(needle)) continue;
        entries.push({
          ...toOperatorNoteSafeEntry(note),
          support_event: {
            event_id: event.event_id,
            stream_id: event.stream_id,
            character_id: event.character_id,
            source: event.source
          }
        });
      }
    }
    return {
      operator_notes: entries.slice(query.offset, query.offset + query.limit),
      page: { limit: query.limit, offset: query.offset, count: Math.max(0, Math.min(entries.length - query.offset, query.limit)) }
    };
  });

  app.get("/admin/support-events/work-queue", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminSupportEventWorkQueueQuerySchema.parse(req.query);
    const searchFilter: SupportEventSearchFilter = {
      limit: 100,
      offset: 0
    };
    if (query.stream_id) searchFilter.streamId = query.stream_id;
    if (query.character_id) searchFilter.characterId = query.character_id;
    if (query.source) searchFilter.source = query.source;
    if (query.message_moderation_status) searchFilter.moderationStatus = query.message_moderation_status;
    const summaries = await repo.searchSupportEvents(searchFilter);
    const entries = [];
    for (const summary of summaries) {
      const support = await repo.getSupportEventById(summary.event_id);
      if (!support) continue;
      const entry = await toWorkQueueEntry(repo, support);
      if (query.resolution_status && entry.resolution_status !== query.resolution_status) continue;
      if (!query.resolution_status && entry.resolution_status === "resolved") continue;
      entries.push(entry);
    }
    const supportEvents = entries.slice(query.offset, query.offset + query.limit);
    return {
      support_events: supportEvents,
      page: {
        limit: query.limit,
        offset: query.offset,
        count: supportEvents.length
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

  app.get("/admin/support-events/:eventId/reaction-dispatch", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    return toReactionDispatchPreview(repo, support);
  });

  app.post("/admin/support-events/:eventId/reaction-dispatch/preview", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    return toReactionDispatchPreview(repo, support);
  });

  app.post("/admin/support-events/:eventId/reaction-dispatch/candidates", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const result = await candidateRepo.createReactionDispatchCandidateIfAbsent(await buildReactionDispatchCandidate(repo, support));
    return {
      candidate: result.candidate,
      persistence: {
        status: result.created ? "candidate_created" : "candidate_existing",
        duplicate_safe: !result.created
      },
      side_effects: {
        support_event_mutation: "skipped",
        reaction_enqueue: "skipped",
        overlay_enqueue: "skipped",
        outbox_enqueue: "skipped",
        real_tts: "skipped",
        real_live2d: "skipped",
        real_renderer: "skipped",
        real_obs: "skipped",
        real_websocket_delivery: "skipped"
      }
    };
  });

  app.get("/admin/support-events/:eventId/reaction-dispatch/candidates", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    return {
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source
      },
      candidates: await candidateRepo.listReactionDispatchCandidatesBySupportEvent(eventId)
    };
  });

  app.get("/admin/support-events/:eventId/reaction-dispatch/candidates/:candidateId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId, candidateId } = z.object({ eventId: z.string(), candidateId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidate(eventId, candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    return { candidate };
  });

  app.post("/admin/reaction-dispatch/candidates/:candidateId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { candidateId } = z.object({ candidateId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidateById(candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    const existing = await candidateRepo.getReactionDispatchApproval(candidate.candidate_id);
    if (existing?.approval_status === "approved_for_dispatch") {
      return { approval: existing, idempotent: true, side_effects: toReactionDispatchApprovalSkippedSideEffects() };
    }
    if (existing?.approval_status === "rejected_by_admin") {
      return reply.code(409).send({ approval: toBlockedReactionDispatchApproval(candidate, "already_rejected", existing), error: "candidate_already_rejected", side_effects: toReactionDispatchApprovalSkippedSideEffects() });
    }
    const validation = await validateCandidateForApproval(repo, candidate);
    if (validation.status !== "valid" || candidate.candidate_status !== "candidate_ready") {
      const reason = candidate.candidate_status === "candidate_invalid"
        ? "candidate_invalid"
        : candidate.candidate_status === "candidate_blocked"
          ? "candidate_blocked"
          : candidate.candidate_status === "candidate_superseded"
            ? "candidate_superseded"
            : validation.reason;
      return reply.code(409).send({ approval: toBlockedReactionDispatchApproval(candidate, reason), error: "candidate_approval_blocked", side_effects: toReactionDispatchApprovalSkippedSideEffects() });
    }
    const result = await candidateRepo.setReactionDispatchApprovalIfAbsent(buildReactionDispatchApprovalMetadata(candidate, "approve", ["contract_v2_valid", "admin_approved", "external_execution_forbidden"]));
    if (result.created) {
      await repo.writeAuditLog({
        actor_type: "admin",
        actor_id: "admin_mock",
        action: "reaction_dispatch_candidate_approved",
        target_type: "reaction_dispatch_candidate",
        target_id: candidate.candidate_id,
        after_json: toReactionDispatchApprovalAuditMetadata(result.approval, "candidate_ready")
      });
    }
    return { approval: result.approval, idempotent: !result.created, side_effects: toReactionDispatchApprovalSkippedSideEffects() };
  });

  app.post("/admin/reaction-dispatch/candidates/:candidateId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { candidateId } = z.object({ candidateId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidateById(candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    const existing = await candidateRepo.getReactionDispatchApproval(candidate.candidate_id);
    if (existing?.approval_status === "rejected_by_admin") {
      return { approval: existing, idempotent: true, side_effects: toReactionDispatchApprovalSkippedSideEffects() };
    }
    if (existing?.approval_status === "approved_for_dispatch") {
      return reply.code(409).send({ approval: toBlockedReactionDispatchApproval(candidate, "state_transition_blocked", existing), error: "approved_candidate_reject_blocked", side_effects: toReactionDispatchApprovalSkippedSideEffects() });
    }
    if (candidate.candidate_status !== "candidate_ready") {
      const reason = candidate.candidate_status === "candidate_invalid"
        ? "candidate_invalid"
        : candidate.candidate_status === "candidate_blocked"
          ? "candidate_blocked"
          : "candidate_superseded";
      return reply.code(409).send({ approval: toBlockedReactionDispatchApproval(candidate, reason), error: "candidate_rejection_blocked", side_effects: toReactionDispatchApprovalSkippedSideEffects() });
    }
    const result = await candidateRepo.setReactionDispatchApprovalIfAbsent(buildReactionDispatchApprovalMetadata(candidate, "reject", ["admin_rejected", "external_execution_forbidden"]));
    if (result.created) {
      await repo.writeAuditLog({
        actor_type: "admin",
        actor_id: "admin_mock",
        action: "reaction_dispatch_candidate_rejected",
        target_type: "reaction_dispatch_candidate",
        target_id: candidate.candidate_id,
        after_json: toReactionDispatchApprovalAuditMetadata(result.approval, "candidate_ready")
      });
    }
    return { approval: result.approval, idempotent: !result.created, side_effects: toReactionDispatchApprovalSkippedSideEffects() };
  });

  app.get("/admin/reaction-dispatch/candidates/:candidateId/approval", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { candidateId } = z.object({ candidateId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidateById(candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    const approval = await candidateRepo.getReactionDispatchApproval(candidate.candidate_id);
    return {
      approval: approval ?? {
        candidate_id: candidate.candidate_id,
        support_event_id: candidate.support_event_id,
        candidate_status: candidate.candidate_status,
        approval_status: toInitialReactionDispatchApprovalStatus(candidate),
        safe_reason_codes: candidate.reason_codes.includes("contract_v2_valid") ? ["contract_v2_valid", "external_execution_forbidden"] : ["external_execution_forbidden"],
        contract_validation_status: candidate.validation_status,
        idempotency_key: `reaction_dispatch_approval:none:${candidate.candidate_id}`,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at
      },
      side_effects: toReactionDispatchApprovalSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/candidates/:candidateId/outbox-boundary", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { candidateId } = z.object({ candidateId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidateById(candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    const approval = await candidateRepo.getReactionDispatchApproval(candidate.candidate_id);
    if (!approval) {
      return reply.code(409).send({
        boundary: buildReactionDispatchOutboxBoundary(candidate, {
          candidate_id: candidate.candidate_id,
          support_event_id: candidate.support_event_id,
          candidate_status: candidate.candidate_status,
          approval_status: toInitialReactionDispatchApprovalStatus(candidate),
          safe_reason_codes: ["external_execution_forbidden"],
          contract_validation_status: candidate.validation_status,
          idempotency_key: `reaction_dispatch_approval:none:${candidate.candidate_id}`,
          created_at: candidate.created_at,
          updated_at: candidate.updated_at
        }, ["approval_not_found", "external_execution_forbidden"], "candidate_not_approved"),
        error: "candidate_not_approved",
        side_effects: toReactionDispatchOutboxBoundarySkippedSideEffects()
      });
    }
    const validation = await validateCandidateForApproval(repo, candidate);
    if (approval.approval_status !== "approved_for_dispatch" || validation.status !== "valid" || candidate.candidate_status !== "candidate_ready") {
      const reason: ReactionDispatchOutboxBoundaryReasonCode = approval.approval_status !== "approved_for_dispatch"
        ? "candidate_not_approved"
        : candidate.candidate_status === "candidate_invalid"
          ? "candidate_invalid"
          : candidate.candidate_status === "candidate_superseded"
            ? "candidate_superseded"
            : candidate.candidate_status === "candidate_blocked"
              ? "candidate_blocked"
              : "unsafe_context";
      return reply.code(409).send({
        boundary: buildReactionDispatchOutboxBoundary(candidate, approval, [reason, "external_execution_forbidden"], reason === "candidate_not_approved" ? "candidate_not_approved" : reason === "candidate_invalid" ? "candidate_invalid" : reason === "candidate_superseded" ? "candidate_superseded" : "boundary_blocked"),
        error: "outbox_boundary_blocked",
        side_effects: toReactionDispatchOutboxBoundarySkippedSideEffects()
      });
    }
    const result = await candidateRepo.setReactionDispatchOutboxBoundaryIfAbsent(buildReactionDispatchOutboxBoundary(candidate, approval, ["approved_for_dispatch", "external_execution_forbidden"], "boundary_ready"));
    if (result.created) {
      await repo.writeAuditLog({
        actor_type: "admin",
        actor_id: "admin_mock",
        action: "reaction_dispatch_outbox_boundary_recorded",
        target_type: "reaction_dispatch_outbox_boundary",
        target_id: result.boundary.boundary_id,
        after_json: toReactionDispatchOutboxBoundaryAuditMetadata(result.boundary)
      });
    }
    return { boundary: result.boundary, idempotent: !result.created, side_effects: toReactionDispatchOutboxBoundarySkippedSideEffects() };
  });

  app.get("/admin/reaction-dispatch/candidates/:candidateId/outbox-boundary", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { candidateId } = z.object({ candidateId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const candidate = await candidateRepo.getReactionDispatchCandidateById(candidateId);
    if (!candidate) return reply.code(404).send({ error: "reaction_dispatch_candidate_not_found" });
    const boundary = await candidateRepo.getReactionDispatchOutboxBoundary(candidate.candidate_id);
    if (!boundary) return reply.code(404).send({ error: "reaction_dispatch_outbox_boundary_not_found" });
    return { boundary, side_effects: toReactionDispatchOutboxBoundarySkippedSideEffects() };
  });

  app.post("/admin/reaction-dispatch/boundaries/:boundaryId/enqueue-internal-outbox", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { boundaryId } = z.object({ boundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const boundary = await candidateRepo.getReactionDispatchOutboxBoundaryById(boundaryId);
    if (!boundary) return reply.code(404).send({ error: "reaction_dispatch_outbox_boundary_not_found" });
    const candidate = await candidateRepo.getReactionDispatchCandidateById(boundary.candidate_id);
    if (!candidate) {
      return reply.code(409).send({
        outbox: {
          boundary_id: boundary.boundary_id,
          candidate_id: boundary.candidate_id,
          support_event_id: boundary.support_event_id,
          outbox_status: "blocked_internal",
          safe_reason_codes: ["candidate_invalid", "external_execution_forbidden"]
        },
        error: "internal_outbox_enqueue_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const approval = await candidateRepo.getReactionDispatchApproval(candidate.candidate_id);
    const validation = await validateCandidateForApproval(repo, candidate);
    let blockedReason: ReactionDispatchInternalOutboxReasonCode | undefined;
    if (boundary.boundary_status !== "boundary_ready") blockedReason = "boundary_not_ready";
    else if (approval?.approval_status !== "approved_for_dispatch") blockedReason = "candidate_not_approved";
    else if (candidate.candidate_status === "candidate_invalid" || validation.reason === "candidate_invalid") blockedReason = "candidate_invalid";
    else if (candidate.candidate_status === "candidate_blocked" || validation.reason === "candidate_blocked") blockedReason = "candidate_blocked";
    else if (candidate.candidate_status === "candidate_superseded" || validation.reason === "candidate_superseded") blockedReason = "candidate_superseded";
    else if (validation.status !== "valid" || candidate.candidate_status !== "candidate_ready") blockedReason = "unsafe_context";

    if (blockedReason) {
      return reply.code(409).send({
        outbox: buildReactionDispatchInternalOutbox(candidate, boundary, [blockedReason, "external_execution_forbidden"], "blocked_internal"),
        error: "internal_outbox_enqueue_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }

    const result = await candidateRepo.setReactionDispatchInternalOutboxIfAbsent(buildReactionDispatchInternalOutbox(
      candidate,
      boundary,
      ["boundary_ready", "approved_for_dispatch", "external_execution_forbidden"],
      "queued_internal"
    ));
    if (result.created) {
      await repo.writeAuditLog({
        actor_type: "admin",
        actor_id: "admin_mock",
        action: "reaction_dispatch_internal_outbox_queued",
        target_type: "reaction_dispatch_internal_outbox",
        target_id: result.outbox.outbox_id,
        after_json: toReactionDispatchInternalOutboxAuditMetadata(result.outbox)
      });
    }
    return { outbox: result.outbox, idempotent: !result.created, side_effects: toReactionDispatchInternalOutboxSkippedSideEffects() };
  });

  app.get("/admin/reaction-dispatch/outbox", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    return {
      outbox: await candidateRepo.listReactionDispatchInternalOutbox(),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox/:outboxId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    return { outbox, side_effects: toReactionDispatchInternalOutboxSkippedSideEffects() };
  });

  app.get("/admin/reaction-dispatch/attempt-plans", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminReactionDispatchAttemptPlanReviewQuerySchema.parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const now = new Date();
    const entries = [];
    for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
      const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
      if (!outbox) continue;
      const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
      entries.push(toReactionDispatchAttemptPlanReviewEntry(plan, outbox, lease, now));
    }
    const filtered = entries
      .filter((entry) => !query.support_event_id || entry.support_event_id === query.support_event_id)
      .filter((entry) => !query.outbox_id || entry.outbox_id === query.outbox_id)
      .filter((entry) => !query.lease_id || entry.lease_id === query.lease_id)
      .filter((entry) => !query.character_id || entry.character_id === query.character_id)
      .filter((entry) => !query.stream_id || entry.stream_id === query.stream_id)
      .filter((entry) => !query.plan_status || entry.plan_status === query.plan_status)
      .filter((entry) => !query.outbox_status || entry.outbox_status === query.outbox_status)
      .filter((entry) => !query.lease_status || entry.lease_status === query.lease_status)
      .filter((entry) => !query.adapter_kind || entry.adapter_kind === query.adapter_kind)
      .filter((entry) => !query.created_after || entry.created_at >= query.created_after)
      .filter((entry) => !query.created_before || entry.created_at <= query.created_before);
    const page = filtered.slice(query.offset, query.offset + query.limit);
    return {
      attempt_plans: page,
      page: { limit: query.limit, offset: query.offset, total: filtered.length },
      review_summary: {
        planned_internal: filtered.filter((entry) => entry.plan_status === "planned_internal").length,
        plan_blocked: filtered.filter((entry) => entry.plan_status === "plan_blocked").length,
        plan_superseded: filtered.filter((entry) => entry.plan_status === "plan_superseded").length,
        plan_expired: filtered.filter((entry) => entry.plan_status === "plan_expired").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/attempt-plans/:planId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { planId } = z.object({ planId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const plan = (await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()).find((entry) => entry.plan_id === planId);
    if (!plan) return reply.code(404).send({ error: "reaction_dispatch_attempt_plan_not_found" });
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
    return {
      attempt_plan: toReactionDispatchAttemptPlanReviewEntry(plan, outbox, lease),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/attempt-plans/:planId/dry-run-adapter-boundary", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { planId } = z.object({ planId: z.string() }).parse(req.params);
    const input = AdminReactionDispatchDryRunAdapterBoundaryRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const plan = (await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()).find((entry) => entry.plan_id === planId);
    if (!plan) return reply.code(404).send({ error: "reaction_dispatch_attempt_plan_not_found" });
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
    const now = new Date();
    const blockers = toReactionDispatchDryRunAdapterBoundaryBlockers(plan, outbox, lease, input.lease_id, now);
    const blocking = blockers.some((reason) => !["external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"].includes(reason));
    if (blocking || !lease?.lease_id) {
      return reply.code(409).send({
        dry_run_boundary: {
          plan_id: plan.plan_id,
          outbox_id: outbox.outbox_id,
          lease_id: input.lease_id,
          adapter_kind: toReactionDispatchAttemptPlanAdapterKind(plan),
          dry_run_boundary_status: "dry_run_blocked",
          external_delivery_status: outbox.external_delivery_status,
          adapter_execution_status: outbox.adapter_execution_status,
          dispatch_attempt_count: outbox.dispatch_attempt_count,
          safe_reason_codes: blockers,
          request_preview_hash: hashSafeMetadata({
            plan_id: plan.plan_id,
            outbox_id: outbox.outbox_id,
            lease_id: input.lease_id,
            dry_run_boundary_status: "dry_run_blocked"
          })
        },
        error: "dry_run_adapter_boundary_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    return {
      dry_run_boundary: buildReactionDispatchDryRunAdapterBoundary(plan, outbox, lease),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/dry-run-boundaries", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminReactionDispatchDryRunReviewQuerySchema.parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const now = new Date();
    const entries = [];
    for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
      const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
      if (!outbox) continue;
      const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
      entries.push(toReactionDispatchDryRunReviewEntry(plan, outbox, lease, now));
    }
    const filtered = entries
      .filter((entry) => !query.support_event_id || entry.support_event_id === query.support_event_id)
      .filter((entry) => !query.outbox_id || entry.outbox_id === query.outbox_id)
      .filter((entry) => !query.lease_id || entry.lease_id === query.lease_id)
      .filter((entry) => !query.plan_id || entry.plan_id === query.plan_id)
      .filter((entry) => !query.candidate_id || entry.candidate_id === query.candidate_id)
      .filter((entry) => !query.boundary_id || entry.boundary_id === query.boundary_id)
      .filter((entry) => !query.character_id || entry.character_id === query.character_id)
      .filter((entry) => !query.stream_id || entry.stream_id === query.stream_id)
      .filter((entry) => !query.adapter_kind || entry.adapter_kind === query.adapter_kind)
      .filter((entry) => !query.dry_run_status || entry.dry_run_status === query.dry_run_status)
      .filter((entry) => !query.plan_status || entry.plan_status === query.plan_status)
      .filter((entry) => !query.outbox_status || entry.outbox_status === query.outbox_status)
      .filter((entry) => !query.lease_status || entry.lease_status === query.lease_status)
      .filter((entry) => !query.created_after || entry.created_at >= query.created_after)
      .filter((entry) => !query.created_before || entry.created_at <= query.created_before);
    const page = filtered.slice(query.offset, query.offset + query.limit);
    return {
      dry_run_boundaries: page,
      page: { limit: query.limit, offset: query.offset, total: filtered.length },
      review_summary: {
        dry_run_ready: filtered.filter((entry) => entry.dry_run_status === "dry_run_ready").length,
        dry_run_blocked: filtered.filter((entry) => entry.dry_run_status === "dry_run_blocked").length,
        dry_run_planned: 0,
        dry_run_invalid: filtered.filter((entry) => entry.dry_run_status === "dry_run_invalid").length,
        dry_run_superseded: filtered.filter((entry) => entry.dry_run_status === "dry_run_superseded").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const now = new Date();
    for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
      const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
      if (!outbox) continue;
      const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
      const entry = toReactionDispatchDryRunReviewEntry(plan, outbox, lease, now);
      if (entry.dry_run_boundary_id === dryRunBoundaryId) {
        return {
          dry_run_boundary: entry,
          side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
        };
      }
    }
    return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
  });

  app.get("/admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId/approval", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId);
    if (!found) return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
    const stored = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
    return {
      approval: toReactionDispatchDryRunApprovalResponse(stored ?? toReactionDispatchDryRunApprovalBaseline(found.entry)),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId);
    if (!found) return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
    const existing = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
    if (existing?.approval_status === "approved_for_adapter_execution") {
      return {
        approval: toReactionDispatchDryRunApprovalResponse({ ...existing, safe_reason_codes: ["already_approved", "external_execution_forbidden"] }),
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (existing?.approval_status === "rejected_by_admin") {
      return reply.code(409).send({
        approval: toReactionDispatchDryRunApprovalResponse({ ...existing, safe_reason_codes: ["state_transition_blocked", "external_execution_forbidden"] }),
        error: "reaction_dispatch_dry_run_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!isReactionDispatchDryRunApprovalSafe(found.entry)) {
      const blocked = {
        ...toReactionDispatchDryRunApprovalBaseline(found.entry),
        approval_status: "approval_blocked" as const,
        safe_reason_codes: toReactionDispatchDryRunApprovalBlockers(found.entry)
      };
      return reply.code(409).send({
        approval: toReactionDispatchDryRunApprovalResponse(blocked),
        error: "reaction_dispatch_dry_run_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const now = new Date().toISOString();
    const approval: ReactionDispatchDryRunApprovalMetadata = {
      ...toReactionDispatchDryRunApprovalBaseline(found.entry),
      approval_status: "approved_for_adapter_execution",
      approved_at: now,
      approved_by_actor_type: "admin",
      safe_reason_codes: ["admin_approved", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"],
      updated_at: now
    };
    await candidateRepo.setReactionDispatchDryRunApproval(approval);
    await repo.writeAuditLog({
      actor_type: "admin",
      action: "reaction_dispatch_dry_run_boundary_approved",
      target_type: "reaction_dispatch_dry_run_boundary",
      target_id: approval.dry_run_boundary_id,
      before_json: toReactionDispatchDryRunApprovalAuditMetadata(toReactionDispatchDryRunApprovalBaseline(found.entry), existing?.approval_status ?? "dry_run_ready"),
      after_json: toReactionDispatchDryRunApprovalAuditMetadata(approval, existing?.approval_status ?? "dry_run_ready")
    });
    return {
      approval: toReactionDispatchDryRunApprovalResponse(approval),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId);
    if (!found) return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
    const existing = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
    if (existing?.approval_status === "rejected_by_admin") {
      return {
        approval: toReactionDispatchDryRunApprovalResponse({ ...existing, safe_reason_codes: ["already_rejected", "external_execution_forbidden"] }),
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (existing?.approval_status === "approved_for_adapter_execution") {
      return reply.code(409).send({
        approval: toReactionDispatchDryRunApprovalResponse({ ...existing, safe_reason_codes: ["state_transition_blocked", "external_execution_forbidden"] }),
        error: "reaction_dispatch_dry_run_rejection_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (["dry_run_invalid", "dry_run_superseded"].includes(found.entry.dry_run_status)) {
      const blocked = {
        ...toReactionDispatchDryRunApprovalBaseline(found.entry),
        approval_status: found.entry.dry_run_status as "dry_run_invalid" | "dry_run_superseded",
        safe_reason_codes: toReactionDispatchDryRunApprovalBlockers(found.entry)
      };
      return reply.code(409).send({
        approval: toReactionDispatchDryRunApprovalResponse(blocked),
        error: "reaction_dispatch_dry_run_rejection_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const now = new Date().toISOString();
    const approval: ReactionDispatchDryRunApprovalMetadata = {
      ...toReactionDispatchDryRunApprovalBaseline(found.entry),
      approval_status: "rejected_by_admin",
      rejected_at: now,
      rejected_by_actor_type: "admin",
      safe_reason_codes: ["admin_rejected", "external_execution_forbidden"],
      updated_at: now
    };
    await candidateRepo.setReactionDispatchDryRunApproval(approval);
    await repo.writeAuditLog({
      actor_type: "admin",
      action: "reaction_dispatch_dry_run_boundary_rejected",
      target_type: "reaction_dispatch_dry_run_boundary",
      target_id: approval.dry_run_boundary_id,
      before_json: toReactionDispatchDryRunApprovalAuditMetadata(toReactionDispatchDryRunApprovalBaseline(found.entry), existing?.approval_status ?? found.entry.dry_run_status),
      after_json: toReactionDispatchDryRunApprovalAuditMetadata(approval, existing?.approval_status ?? found.entry.dry_run_status)
    });
    return {
      approval: toReactionDispatchDryRunApprovalResponse(approval),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId/adapter-execution-boundary-preview", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId);
    const approval = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
    if (!found) {
      if (!approval) return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
      const outbox = await candidateRepo.getReactionDispatchInternalOutbox(approval.outbox_id);
      const plan = await candidateRepo.getReactionDispatchInternalOutboxAttemptPlan(approval.outbox_id);
      const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(approval.outbox_id);
      const safeReasonCodes = outbox && plan
        ? toReactionDispatchDryRunApprovalBlockers(toReactionDispatchDryRunReviewEntry(plan, outbox, lease))
        : ["unsafe_context", "external_execution_forbidden"] as ReactionDispatchDryRunApprovalReasonCode[];
      return reply.code(409).send({
        adapter_execution_boundary_preview: {
          dry_run_boundary_id: dryRunBoundaryId,
          plan_id: approval.plan_id,
          outbox_id: approval.outbox_id,
          lease_id: approval.lease_id,
          adapter_kind: approval.adapter_kind,
          approval_status: approval.approval_status,
          preview_status: "adapter_execution_boundary_preview_blocked",
          external_delivery_status: approval.external_delivery_status,
          adapter_execution_status: approval.adapter_execution_status,
          dispatch_attempt_count: approval.dispatch_attempt_count,
          safe_reason_codes: safeReasonCodes
        },
        error: "reaction_dispatch_adapter_execution_boundary_preview_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!approval || approval.approval_status !== "approved_for_adapter_execution") {
      return reply.code(409).send({
        adapter_execution_boundary_preview: {
          dry_run_boundary_id: dryRunBoundaryId,
          plan_id: found.entry.plan_id,
          outbox_id: found.entry.outbox_id,
          lease_id: found.entry.lease_id,
          adapter_kind: found.entry.adapter_kind,
          approval_status: approval?.approval_status ?? "approval_blocked",
          preview_status: "adapter_execution_boundary_preview_blocked",
          external_delivery_status: found.entry.external_delivery_status,
          adapter_execution_status: found.entry.adapter_execution_status,
          dispatch_attempt_count: found.entry.dispatch_attempt_count,
          safe_reason_codes: ["state_transition_blocked", "external_execution_forbidden"]
        },
        error: "reaction_dispatch_adapter_execution_boundary_preview_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!isReactionDispatchDryRunApprovalSafe(found.entry)) {
      return reply.code(409).send({
        adapter_execution_boundary_preview: {
          dry_run_boundary_id: dryRunBoundaryId,
          plan_id: found.entry.plan_id,
          outbox_id: found.entry.outbox_id,
          lease_id: found.entry.lease_id,
          adapter_kind: found.entry.adapter_kind,
          approval_status: approval.approval_status,
          preview_status: "adapter_execution_boundary_preview_blocked",
          external_delivery_status: found.entry.external_delivery_status,
          adapter_execution_status: found.entry.adapter_execution_status,
          dispatch_attempt_count: found.entry.dispatch_attempt_count,
          safe_reason_codes: toReactionDispatchDryRunApprovalBlockers(found.entry)
        },
        error: "reaction_dispatch_adapter_execution_boundary_preview_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!isReactionDispatchDryRunApprovalSnapshotCurrent(found.entry, approval)) {
      return reply.code(409).send({
        adapter_execution_boundary_preview: {
          dry_run_boundary_id: dryRunBoundaryId,
          plan_id: found.entry.plan_id,
          outbox_id: found.entry.outbox_id,
          lease_id: found.entry.lease_id,
          adapter_kind: found.entry.adapter_kind,
          approval_status: approval.approval_status,
          preview_status: "adapter_execution_boundary_preview_blocked",
          external_delivery_status: found.entry.external_delivery_status,
          adapter_execution_status: found.entry.adapter_execution_status,
          dispatch_attempt_count: found.entry.dispatch_attempt_count,
          safe_reason_codes: toReactionDispatchDryRunApprovalSnapshotBlockers(found.entry, approval)
        },
        error: "reaction_dispatch_adapter_execution_boundary_preview_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    return {
      adapter_execution_boundary_preview: buildReactionDispatchAdapterExecutionBoundaryPreview(found.entry, approval),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/adapter-execution-boundary-previews", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminAdapterExecutionBoundaryPreviewReviewQuerySchema.parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const now = new Date();
    const entries = [];
    for (const plan of await candidateRepo.listReactionDispatchInternalOutboxAttemptPlans()) {
      const outbox = await candidateRepo.getReactionDispatchInternalOutbox(plan.outbox_id);
      if (!outbox) continue;
      const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(plan.outbox_id);
      const entry = toReactionDispatchDryRunReviewEntry(plan, outbox, lease, now);
      const approval = await candidateRepo.getReactionDispatchDryRunApproval(entry.dry_run_boundary_id);
      entries.push(buildReactionDispatchAdapterExecutionBoundaryPreviewReviewEntry(entry, approval));
    }
    const filtered = entries
      .filter((entry) => !query.preview_status || entry.preview_status === query.preview_status)
      .filter((entry) => !query.adapter_kind || entry.adapter_kind === query.adapter_kind);
    return {
      review_entries: filtered.slice(query.offset, query.offset + query.limit),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: filtered.length
      },
      review_summary: {
        ready: filtered.filter((entry) => entry.preview_status === "adapter_execution_boundary_preview_ready").length,
        blocked: filtered.filter((entry) => entry.preview_status === "adapter_execution_boundary_preview_blocked").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/adapter-execution-boundary-previews/:dryRunBoundaryId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const found = await findReactionDispatchDryRunReviewEntry(candidateRepo, dryRunBoundaryId);
    if (!found) return reply.code(404).send({ error: "reaction_dispatch_dry_run_boundary_not_found" });
    const approval = await candidateRepo.getReactionDispatchDryRunApproval(dryRunBoundaryId);
    return {
      review_entry: buildReactionDispatchAdapterExecutionBoundaryPreviewReviewEntry(found.entry, approval),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/adapter-execution-boundary-previews/:dryRunBoundaryId/approval", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const current = await findAdapterExecutionBoundaryReadyPreview(candidateRepo, dryRunBoundaryId);
    const stored = await candidateRepo.getReactionDispatchAdapterExecutionBoundaryApproval(dryRunBoundaryId);
    if (!current && !stored) return reply.code(404).send({ error: "reaction_dispatch_adapter_execution_boundary_preview_not_found" });
    const baseline = current?.preview ? toAdapterExecutionBoundaryApprovalBaseline(current.preview) : stored;
    return {
      approval: toAdapterExecutionBoundaryApprovalResponse(stored ?? baseline!),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/adapter-execution-boundary-previews/:dryRunBoundaryId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const input = AdminAdapterExecutionBoundaryApprovalRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const current = await findAdapterExecutionBoundaryReadyPreview(candidateRepo, dryRunBoundaryId);
    const existing = await candidateRepo.getReactionDispatchAdapterExecutionBoundaryApproval(dryRunBoundaryId);
    if (!current) return reply.code(404).send({ error: "reaction_dispatch_adapter_execution_boundary_preview_not_found" });
    if (!current.preview) {
      return reply.code(409).send({
        approval: {
          dry_run_boundary_id: dryRunBoundaryId,
          approval_status: current.reviewEntry.preview_status === "adapter_execution_boundary_preview_blocked" ? "approval_blocked" : "preview_invalid",
          safe_reason_codes: toAdapterExecutionBoundaryApprovalBlockersFromReviewEntry(current.found.entry)
        },
        error: "reaction_dispatch_adapter_execution_boundary_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (existing?.approval_status === "approved_for_local_simulation") {
      return {
        approval: toAdapterExecutionBoundaryApprovalResponse({ ...existing, safe_reason_codes: ["already_approved", "external_execution_forbidden"] }),
        idempotent: true,
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (existing?.approval_status === "rejected_by_admin") {
      return reply.code(409).send({
        approval: toAdapterExecutionBoundaryApprovalResponse({ ...existing, safe_reason_codes: ["state_transition_blocked", "external_execution_forbidden"] }),
        error: "reaction_dispatch_adapter_execution_boundary_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const mismatchReasons = toAdapterExecutionBoundarySnapshotMismatchReasons(current.preview, input);
    if (mismatchReasons.some((reason) => reason !== "external_execution_forbidden")) {
      const blocked = {
        ...toAdapterExecutionBoundaryApprovalBaseline(current.preview),
        approval_status: "approval_blocked" as const,
        safe_reason_codes: mismatchReasons
      };
      return reply.code(409).send({
        approval: toAdapterExecutionBoundaryApprovalResponse(blocked),
        error: "reaction_dispatch_adapter_execution_boundary_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const preconditionReasons = toAdapterExecutionBoundaryApprovalPreconditionReasons(current.found.entry, current.preview);
    if (preconditionReasons.some((reason) => reason !== "external_execution_forbidden")) {
      const blocked = {
        ...toAdapterExecutionBoundaryApprovalBaseline(current.preview),
        approval_status: "approval_blocked" as const,
        safe_reason_codes: preconditionReasons
      };
      return reply.code(409).send({
        approval: toAdapterExecutionBoundaryApprovalResponse(blocked),
        error: "reaction_dispatch_adapter_execution_boundary_approval_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const now = new Date().toISOString();
    const approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata = {
      ...toAdapterExecutionBoundaryApprovalBaseline(current.preview),
      approval_status: "approved_for_local_simulation",
      approved_at: now,
      approved_by_actor_type: "admin",
      safe_reason_codes: ["admin_approved_for_local_simulation", "external_execution_forbidden"],
      updated_at: now
    };
    await candidateRepo.setReactionDispatchAdapterExecutionBoundaryApproval(approval);
    await repo.writeAuditLog({
      actor_type: "admin",
      action: "reaction_dispatch_adapter_execution_boundary_approved_for_local_simulation",
      target_type: "reaction_dispatch_dry_run_boundary",
      target_id: approval.dry_run_boundary_id,
      before_json: toAdapterExecutionBoundaryApprovalAuditMetadata(toAdapterExecutionBoundaryApprovalBaseline(current.preview), existing?.approval_status ?? "adapter_execution_boundary_preview_ready"),
      after_json: toAdapterExecutionBoundaryApprovalAuditMetadata(approval, existing?.approval_status ?? "adapter_execution_boundary_preview_ready")
    });
    return {
      approval: toAdapterExecutionBoundaryApprovalResponse(approval),
      idempotent: false,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/adapter-execution-boundary-previews/:dryRunBoundaryId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const current = await findAdapterExecutionBoundaryReadyPreview(candidateRepo, dryRunBoundaryId);
    const existing = await candidateRepo.getReactionDispatchAdapterExecutionBoundaryApproval(dryRunBoundaryId);
    if (!current) return reply.code(404).send({ error: "reaction_dispatch_adapter_execution_boundary_preview_not_found" });
    if (existing?.approval_status === "rejected_by_admin") {
      return {
        approval: toAdapterExecutionBoundaryApprovalResponse({ ...existing, safe_reason_codes: ["already_rejected", "external_execution_forbidden"] }),
        idempotent: true,
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (existing?.approval_status === "approved_for_local_simulation") {
      return reply.code(409).send({
        approval: toAdapterExecutionBoundaryApprovalResponse({ ...existing, safe_reason_codes: ["state_transition_blocked", "external_execution_forbidden"] }),
        error: "reaction_dispatch_adapter_execution_boundary_rejection_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!current.preview) {
      return reply.code(409).send({
        approval: {
          dry_run_boundary_id: dryRunBoundaryId,
          approval_status: "approval_blocked",
          safe_reason_codes: toAdapterExecutionBoundaryApprovalBlockersFromReviewEntry(current.found.entry)
        },
        error: "reaction_dispatch_adapter_execution_boundary_rejection_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const now = new Date().toISOString();
    const approval: ReactionDispatchAdapterExecutionBoundaryApprovalMetadata = {
      ...toAdapterExecutionBoundaryApprovalBaseline(current.preview),
      approval_status: "rejected_by_admin",
      rejected_at: now,
      rejected_by_actor_type: "admin",
      safe_reason_codes: ["admin_rejected", "external_execution_forbidden"],
      updated_at: now
    };
    await candidateRepo.setReactionDispatchAdapterExecutionBoundaryApproval(approval);
    await repo.writeAuditLog({
      actor_type: "admin",
      action: "reaction_dispatch_adapter_execution_boundary_rejected",
      target_type: "reaction_dispatch_dry_run_boundary",
      target_id: approval.dry_run_boundary_id,
      before_json: toAdapterExecutionBoundaryApprovalAuditMetadata(toAdapterExecutionBoundaryApprovalBaseline(current.preview), existing?.approval_status ?? "adapter_execution_boundary_preview_ready"),
      after_json: toAdapterExecutionBoundaryApprovalAuditMetadata(approval, existing?.approval_status ?? "adapter_execution_boundary_preview_ready")
    });
    return {
      approval: toAdapterExecutionBoundaryApprovalResponse(approval),
      idempotent: false,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/adapter-execution-boundary-previews/:dryRunBoundaryId/simulate", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dryRunBoundaryId } = z.object({ dryRunBoundaryId: z.string() }).parse(req.params);
    const input = AdminLocalAdapterSimulationRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const approval = await candidateRepo.getReactionDispatchAdapterExecutionBoundaryApproval(dryRunBoundaryId);
    if (!approval || approval.approval_status !== "approved_for_local_simulation") {
      return reply.code(409).send({
        simulation_result: toLocalAdapterSimulationBlocked(dryRunBoundaryId, ["approval_required", "external_execution_forbidden"]),
        error: "reaction_dispatch_local_adapter_simulation_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const current = await findAdapterExecutionBoundaryReadyPreview(candidateRepo, dryRunBoundaryId);
    if (!current?.preview) {
      return reply.code(409).send({
        simulation_result: toLocalAdapterSimulationBlocked(dryRunBoundaryId, ["approval_snapshot_stale", "external_execution_forbidden"]),
        error: "reaction_dispatch_local_adapter_simulation_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (approval.approval_snapshot_hash !== toAdapterExecutionBoundaryApprovalSnapshotHash(current.preview)) {
      return reply.code(409).send({
        simulation_result: toLocalAdapterSimulationBlocked(dryRunBoundaryId, ["approval_snapshot_stale", "external_execution_forbidden"]),
        error: "reaction_dispatch_local_adapter_simulation_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const preconditionReasons = toAdapterExecutionBoundaryApprovalPreconditionReasons(current.found.entry, current.preview)
      .filter((reason) => reason !== "external_execution_forbidden")
      .map((reason): ReactionDispatchLocalAdapterSimulationReasonCode => {
        if (reason === "adapter_kind_not_supported_for_simulation") return "adapter_kind_not_supported_for_simulation";
        if (reason === "candidate_not_approved") return "candidate_not_approved";
        if (reason === "boundary_not_ready") return "boundary_not_ready";
        if (reason === "outbox_not_queued") return "outbox_not_queued";
        if (reason === "lease_expired" || reason === "lease_released" || reason === "lease_not_active") return "lease_not_active";
        return "state_transition_blocked";
      });
    if (preconditionReasons.length > 0) {
      const blockedReasons: ReactionDispatchLocalAdapterSimulationReasonCode[] = [...new Set<ReactionDispatchLocalAdapterSimulationReasonCode>([
        ...preconditionReasons,
        "external_execution_forbidden"
      ])];
      return reply.code(409).send({
        simulation_result: toLocalAdapterSimulationBlocked(dryRunBoundaryId, blockedReasons),
        error: "reaction_dispatch_local_adapter_simulation_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const result = buildLocalAdapterSimulationResult(approval, input.simulation_case);
    const existing = await candidateRepo.getReactionDispatchLocalAdapterSimulationResult(result.simulation_result_id);
    const saved = existing ?? await candidateRepo.setReactionDispatchLocalAdapterSimulationResult(result);
    return {
      simulation_result: toLocalAdapterSimulationResponse(saved),
      idempotent: Boolean(existing),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/simulation-results", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminLocalAdapterSimulationReviewQuerySchema.parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const all = (await candidateRepo.listReactionDispatchLocalAdapterSimulationResults())
      .filter((result) => !query.support_event_id || result.support_event_id === query.support_event_id)
      .filter((result) => !query.preview_id || result.adapter_execution_boundary_preview_id === query.preview_id)
      .filter((result) => !query.dry_run_boundary_id || result.dry_run_boundary_id === query.dry_run_boundary_id)
      .filter((result) => !query.plan_id || result.plan_id === query.plan_id)
      .filter((result) => !query.outbox_id || result.outbox_id === query.outbox_id)
      .filter((result) => !query.lease_id || result.lease_id === query.lease_id)
      .filter((result) => !query.adapter_kind || result.adapter_kind === query.adapter_kind)
      .filter((result) => !query.simulation_case || result.simulation_case === query.simulation_case)
      .filter((result) => !query.simulation_status || result.simulation_status === query.simulation_status)
      .filter((result) => !query.created_after || result.created_at >= query.created_after)
      .filter((result) => !query.created_before || result.created_at <= query.created_before);
    const simulationResults = all.slice(query.offset, query.offset + query.limit).map(toLocalAdapterSimulationResponse);
    return {
      simulation_results: simulationResults,
      page: {
        limit: query.limit,
        offset: query.offset,
        total: all.length
      },
      review_summary: {
        simulated_success: all.filter((result) => result.simulation_status === "simulated_success").length,
        simulated_retryable_failure: all.filter((result) => result.simulation_status === "simulated_retryable_failure").length,
        simulated_terminal_failure: all.filter((result) => result.simulation_status === "simulated_terminal_failure").length,
        simulated_blocked: all.filter((result) => result.simulation_status === "simulated_blocked").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/simulation-results/:simulationResultId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { simulationResultId } = z.object({ simulationResultId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const result = await candidateRepo.getReactionDispatchLocalAdapterSimulationResult(simulationResultId);
    if (!result) return reply.code(404).send({ error: "reaction_dispatch_local_adapter_simulation_result_not_found" });
    return {
      simulation_result: toLocalAdapterSimulationResponse(result),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/simulation-results/:simulationResultId/dlq", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { simulationResultId } = z.object({ simulationResultId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const result = await candidateRepo.getReactionDispatchLocalAdapterSimulationResult(simulationResultId);
    if (!result) return reply.code(404).send({ error: "reaction_dispatch_local_adapter_simulation_result_not_found" });
    const entry = buildReactionDispatchSimulationFailureDlq(result);
    if (!entry) {
      return reply.code(409).send({
        error: "reaction_dispatch_simulation_failure_dlq_blocked",
        dlq_status: {
          simulation_result_id: simulationResultId,
          dlq_status: "dlq_blocked",
          safe_reason_codes: ["simulation_success", "external_execution_forbidden"]
        },
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const existing = await candidateRepo.getReactionDispatchSimulationFailureDlq(entry.dlq_id);
    const saved = existing ?? await candidateRepo.setReactionDispatchSimulationFailureDlq(entry);
    return {
      dlq_entry: toReactionDispatchSimulationFailureDlqResponse(saved),
      idempotent: Boolean(existing),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/simulation-dlq", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = z.object({
      failure_class: z.enum(["retryable_failure", "terminal_failure"]).optional(),
      retry_eligibility: z.enum(["retry_candidate", "not_retryable"]).optional(),
      adapter_kind: z.enum(["iris_core_reaction", "voxweave_voice", "overlay_effect", "future_internal_adapter"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0)
    }).parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const all = (await candidateRepo.listReactionDispatchSimulationFailureDlq())
      .filter((entry) => !query.failure_class || entry.failure_class === query.failure_class)
      .filter((entry) => !query.retry_eligibility || entry.retry_eligibility === query.retry_eligibility)
      .filter((entry) => !query.adapter_kind || entry.adapter_kind === query.adapter_kind);
    return {
      dlq_entries: all.slice(query.offset, query.offset + query.limit).map(toReactionDispatchSimulationFailureDlqResponse),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: all.length
      },
      dlq_summary: {
        retry_candidate: all.filter((entry) => entry.retry_eligibility === "retry_candidate").length,
        not_retryable: all.filter((entry) => entry.retry_eligibility === "not_retryable").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/simulation-dlq/:dlqId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { dlqId } = z.object({ dlqId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const entry = await candidateRepo.getReactionDispatchSimulationFailureDlq(dlqId);
    if (!entry) return reply.code(404).send({ error: "reaction_dispatch_simulation_failure_dlq_not_found" });
    return {
      dlq_entry: toReactionDispatchSimulationFailureDlqResponse(entry),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox/:outboxId/lease", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const lease = await candidateRepo.getReactionDispatchInternalOutboxLease(outboxId);
    return {
      lease_status: toReactionDispatchInternalOutboxLeaseStatus(outboxId, lease),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/outbox/:outboxId/lease", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const now = new Date();
    if (!isReactionDispatchInternalOutboxLeaseable(outbox)) {
      return reply.code(409).send({
        lease_status: {
          outbox_id: outbox.outbox_id,
          lease_status: "lease_blocked",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          safe_reason_codes: toReactionDispatchInternalOutboxLeaseBlockedReasons(outbox)
        },
        error: "internal_outbox_lease_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const existing = toReactionDispatchInternalOutboxLeaseStatus(outboxId, await candidateRepo.getReactionDispatchInternalOutboxLease(outboxId), now);
    if (isReactionDispatchInternalOutboxLeaseActive(existing, now)) {
      return reply.code(409).send({
        lease_status: { ...existing, safe_reason_codes: ["lease_active", "external_execution_forbidden"] },
        error: "internal_outbox_lease_active",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const lease = await candidateRepo.setReactionDispatchInternalOutboxLease(buildReactionDispatchInternalOutboxLease(outbox, now, existing));
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reaction_dispatch_internal_outbox_lease_created",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id,
      after_json: toReactionDispatchInternalOutboxLeaseAuditMetadata(lease, existing.lease_status)
    });
    return {
      lease_status: lease,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/outbox/:outboxId/lease/extend", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const input = AdminReactionDispatchOutboxLeaseRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const now = new Date();
    const existing = toReactionDispatchInternalOutboxLeaseStatus(outboxId, await candidateRepo.getReactionDispatchInternalOutboxLease(outboxId), now);
    if (!isReactionDispatchInternalOutboxLeaseable(outbox) || !isReactionDispatchInternalOutboxLeaseActive(existing, now)) {
      return reply.code(409).send({
        lease_status: { ...existing, safe_reason_codes: existing.lease_status === "lease_expired" ? ["lease_expired", "external_execution_forbidden"] : toReactionDispatchInternalOutboxLeaseBlockedReasons(outbox) },
        error: "internal_outbox_lease_extend_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!input.lease_id || input.lease_id !== existing.lease_id) {
      return reply.code(409).send({
        lease_status: { ...existing, safe_reason_codes: ["lease_id_mismatch", "external_execution_forbidden"] },
        error: "internal_outbox_lease_id_mismatch",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const extended = await candidateRepo.setReactionDispatchInternalOutboxLease({
      ...existing,
      lease_expires_at: new Date(now.getTime() + REACTION_DISPATCH_INTERNAL_OUTBOX_LEASE_TTL_MS).toISOString(),
      updated_at: now.toISOString(),
      safe_reason_codes: ["lease_extended", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reaction_dispatch_internal_outbox_lease_extended",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id,
      after_json: toReactionDispatchInternalOutboxLeaseAuditMetadata(extended, existing.lease_status)
    });
    return {
      lease_status: extended,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/outbox/:outboxId/lease/release", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const input = AdminReactionDispatchOutboxLeaseRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const now = new Date();
    const existing = toReactionDispatchInternalOutboxLeaseStatus(outboxId, await candidateRepo.getReactionDispatchInternalOutboxLease(outboxId), now);
    if (existing.lease_status === "lease_released") {
      return {
        lease_status: existing,
        idempotent: true,
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (!isReactionDispatchInternalOutboxLeaseActive(existing, now)) {
      return reply.code(409).send({
        lease_status: existing,
        error: "internal_outbox_lease_release_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    if (!input.lease_id || input.lease_id !== existing.lease_id) {
      return reply.code(409).send({
        lease_status: { ...existing, safe_reason_codes: ["lease_id_mismatch", "external_execution_forbidden"] },
        error: "internal_outbox_lease_id_mismatch",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const released = await candidateRepo.setReactionDispatchInternalOutboxLease({
      ...existing,
      lease_status: "lease_released",
      updated_at: now.toISOString(),
      safe_reason_codes: ["lease_released", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reaction_dispatch_internal_outbox_lease_released",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id,
      after_json: toReactionDispatchInternalOutboxLeaseAuditMetadata(released, existing.lease_status)
    });
    return {
      lease_status: released,
      idempotent: false,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox/:outboxId/attempt-plan", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const plan = await candidateRepo.getReactionDispatchInternalOutboxAttemptPlan(outboxId);
    return {
      attempt_plan: toReactionDispatchInternalOutboxAttemptPlanStatus(outboxId, plan),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/outbox/:outboxId/attempt-plan", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const input = AdminReactionDispatchOutboxAttemptPlanRequestSchema.parse(req.body);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    const now = new Date();
    const lease = toReactionDispatchInternalOutboxLeaseStatus(outboxId, await candidateRepo.getReactionDispatchInternalOutboxLease(outboxId), now);
    const existing = await candidateRepo.getReactionDispatchInternalOutboxAttemptPlan(outboxId);
    if (existing?.attempt_plan_status === "planned_internal") {
      return {
        attempt_plan: { ...existing, safe_reason_codes: ["attempt_plan_active", "external_execution_forbidden"] },
        idempotent: true,
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (!isReactionDispatchInternalOutboxAttemptPlannable(outbox, lease, input.lease_id, now)) {
      return reply.code(409).send({
        attempt_plan: {
          outbox_id: outbox.outbox_id,
          lease_id: input.lease_id,
          attempt_plan_status: "plan_blocked",
          planned_adapter_type: "iris_core_reaction_dispatch",
          planned_action: "reaction_dispatch",
          plan_id: "none",
          plan_context_hash: hashSafeMetadata({
            outbox_id: outbox.outbox_id,
            outbox_status: outbox.outbox_status,
            external_delivery_status: outbox.external_delivery_status,
            adapter_execution_status: outbox.adapter_execution_status,
            dispatch_attempt_count: outbox.dispatch_attempt_count,
            lease_status: lease.lease_status
          }),
          created_by_actor_type: "admin",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          safe_reason_codes: toReactionDispatchInternalOutboxAttemptPlanBlockedReasons(outbox, lease, input.lease_id, now)
        },
        error: "internal_outbox_attempt_plan_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const plan = await candidateRepo.setReactionDispatchInternalOutboxAttemptPlan(buildReactionDispatchInternalOutboxAttemptPlan(outbox, lease, now));
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reaction_dispatch_internal_outbox_attempt_plan_created",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id,
      after_json: toReactionDispatchInternalOutboxAttemptPlanAuditMetadata(plan, existing?.attempt_plan_status ?? "not_planned")
    });
    return {
      attempt_plan: plan,
      idempotent: false,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.post("/admin/reaction-dispatch/outbox/:outboxId/cancel", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    if (outbox.outbox_status === "cancelled_internal") {
      return {
        cancel_status: toReactionDispatchInternalOutboxCancelStatus(outbox),
        idempotent: true,
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      };
    }
    if (!isReactionDispatchInternalOutboxCancellable(outbox)) {
      return reply.code(409).send({
        cancel_status: toReactionDispatchInternalOutboxCancelStatus({
          ...outbox,
          safe_reason_codes: [
            outbox.external_delivery_status === "not_attempted" ? "external_delivery_not_attempted" : "state_transition_blocked",
            outbox.adapter_execution_status === "not_executed" ? "adapter_not_executed" : "state_transition_blocked",
            "not_cancellable",
            "external_execution_forbidden"
          ]
        }),
        error: "internal_outbox_cancel_blocked",
        side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
      });
    }
    const now = new Date().toISOString();
    const cancelled: ReactionDispatchInternalOutboxMetadata = {
      ...outbox,
      outbox_status: "cancelled_internal",
      cancelled_at: now,
      cancelled_by_actor_type: "admin",
      updated_at: now,
      safe_reason_codes: ["cancelled_by_admin", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    };
    const updated = await candidateRepo.updateReactionDispatchInternalOutbox(cancelled);
    if (!updated) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "reaction_dispatch_internal_outbox_cancelled",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: updated.outbox_id,
      after_json: toReactionDispatchInternalOutboxCancelAuditMetadata(updated, outbox.outbox_status)
    });
    return {
      cancel_status: toReactionDispatchInternalOutboxCancelStatus(updated),
      idempotent: false,
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox/:outboxId/cancel-status", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    return {
      cancel_status: toReactionDispatchInternalOutboxCancelStatus(outbox),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox-review", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const query = AdminReactionDispatchOutboxReviewQuerySchema.parse(req.query);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const all = (await candidateRepo.listReactionDispatchInternalOutbox())
      .filter((outbox) => !query.outbox_status || outbox.outbox_status === query.outbox_status)
      .filter((outbox) => !query.stream_id || outbox.stream_id === query.stream_id)
      .filter((outbox) => !query.character_id || outbox.character_id === query.character_id)
      .filter((outbox) => !query.source || outbox.source === query.source);
    const entries = all.slice(query.offset, query.offset + query.limit).map(toReactionDispatchOutboxReviewEntry);
    return {
      review_entries: entries,
      page: {
        limit: query.limit,
        offset: query.offset,
        total: all.length
      },
      review_summary: {
        ready_for_operator_review: all.filter((outbox) => toReactionDispatchOutboxReviewEntry(outbox).review_status === "ready_for_operator_review").length,
        blocked_for_operator_review: all.filter((outbox) => toReactionDispatchOutboxReviewEntry(outbox).review_status === "blocked_for_operator_review").length
      },
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/reaction-dispatch/outbox-review/:outboxId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { outboxId } = z.object({ outboxId: z.string() }).parse(req.params);
    const candidateRepo = getReactionDispatchCandidateRepository(repo);
    const outbox = await candidateRepo.getReactionDispatchInternalOutbox(outboxId);
    if (!outbox) return reply.code(404).send({ error: "reaction_dispatch_internal_outbox_not_found" });
    return {
      review_entry: toReactionDispatchOutboxReviewEntry(outbox),
      side_effects: toReactionDispatchInternalOutboxSkippedSideEffects()
    };
  });

  app.get("/admin/support-events/:eventId/contract-v2", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    return toSupportEventContractV2AdminSurface(repo, support);
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

  app.get("/admin/support-events/:eventId/resolution", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const resolutionRepo = getResolutionRepository(repo);
    const existing = await resolutionRepo.getSupportEventResolution(support.event_id);
    const resolution: AdminSupportEventResolution = existing ?? {
      event_id: support.event_id,
      status: "open",
      created_at: support.created_at,
      updated_at: support.created_at
    };
    return {
      resolution: toResolutionSafeEntry(resolution),
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        moderation_status: support.support.message_moderation_status
      }
    };
  });

  app.patch("/admin/support-events/:eventId/resolution", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const parsed = AdminSupportEventResolutionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_resolution" });
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const operatorNote = parsed.data.operator_note === undefined ? undefined : sanitizeOperatorNote(parsed.data.operator_note);
    const resolutionRepo = getResolutionRepository(repo);
    const resolution = await resolutionRepo.setSupportEventResolution(support.event_id, {
      status: parsed.data.status,
      ...(operatorNote !== undefined ? { operator_note: operatorNote } : {})
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "support_event_resolution_update",
      target_type: "support_event",
      target_id: support.event_id,
      after_json: toResolutionAuditMetadata(support, resolution)
    });
    return {
      resolution: toResolutionSafeEntry(resolution),
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        moderation_status: support.support.message_moderation_status
      }
    };
  });

  app.post("/admin/support-events/:eventId/operator-notes", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const parsed = AdminSupportEventOperatorNoteSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_operator_note" });
    const input = parsed.data;
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const note: AdminSupportEventOperatorNote = {
      id: stableId("opnote", `${support.event_id}:${Date.now()}:${input.note}`),
      event_id: support.event_id,
      note: sanitizeOperatorNote(input.note),
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const noteRepo = getOperatorNoteRepository(repo);
    const created = await noteRepo.createSupportEventOperatorNote(note);
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "create_operator_note",
      target_type: "support_event",
      target_id: support.event_id,
      after_json: toOperatorNoteAuditMetadata(support, created)
    });
    return {
      status: "created",
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        moderation_status: support.support.message_moderation_status
      },
      operator_note: toOperatorNoteSafeEntry(created)
    };
  });

  app.get("/admin/support-events/:eventId/operator-notes", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId } = z.object({ eventId: z.string() }).parse(req.params);
    const query = z.object({ include_archived: z.coerce.boolean().default(false) }).parse(req.query);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const noteRepo = getOperatorNoteRepository(repo);
    const notes = await noteRepo.listSupportEventOperatorNotes(support.event_id, { includeArchived: query.include_archived });
    return {
      support_event: {
        event_id: support.event_id,
        stream_id: support.stream_id,
        character_id: support.character_id,
        source: support.source,
        moderation_status: support.support.message_moderation_status
      },
      operator_notes: notes.map(toOperatorNoteSafeEntry)
    };
  });

  app.patch("/admin/support-events/:eventId/operator-notes/:noteId", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId, noteId } = z.object({ eventId: z.string(), noteId: z.string() }).parse(req.params);
    const parsed = AdminSupportEventOperatorNotePatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_operator_note_patch" });
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const noteRepo = getOperatorNoteRepository(repo);
    const existing = await noteRepo.getSupportEventOperatorNote(support.event_id, noteId);
    if (!existing) return reply.code(404).send({ error: "operator_note_not_found" });
    const patch: Partial<Pick<AdminSupportEventOperatorNote, "note" | "archived">> = {};
    if (parsed.data.note !== undefined) patch.note = sanitizeOperatorNote(parsed.data.note);
    if (parsed.data.archived !== undefined) patch.archived = parsed.data.archived;
    const updated = await noteRepo.updateSupportEventOperatorNote(support.event_id, noteId, patch);
    if (!updated) return reply.code(404).send({ error: "operator_note_not_found" });
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "update_operator_note",
      target_type: "support_event",
      target_id: support.event_id,
      after_json: toOperatorNoteAuditMetadata(support, updated)
    });
    return {
      status: "updated",
      operator_note: toOperatorNoteSafeEntry(updated)
    };
  });

  app.post("/admin/support-events/:eventId/operator-notes/:noteId/archive", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { eventId, noteId } = z.object({ eventId: z.string(), noteId: z.string() }).parse(req.params);
    const support = await repo.getSupportEventById(eventId);
    if (!support) return reply.code(404).send({ error: "support_event_not_found" });
    const noteRepo = getOperatorNoteRepository(repo);
    const existing = await noteRepo.getSupportEventOperatorNote(support.event_id, noteId);
    if (!existing) return reply.code(404).send({ error: "operator_note_not_found" });
    const updated = await noteRepo.updateSupportEventOperatorNote(support.event_id, noteId, { archived: true });
    if (!updated) return reply.code(404).send({ error: "operator_note_not_found" });
    if (!existing.archived) {
      await repo.writeAuditLog({
        actor_type: "admin",
        actor_id: "admin_mock",
        action: "archive_operator_note",
        target_type: "support_event",
        target_id: support.event_id,
        after_json: toOperatorNoteAuditMetadata(support, updated)
      });
    }
    return {
      status: existing.archived ? "already_archived" : "archived",
      operator_note: toOperatorNoteSafeEntry(updated)
    };
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
