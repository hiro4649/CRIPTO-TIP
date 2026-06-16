import type { LiveSession, OverlayTipAlert, SupportReceived, TipIntent, TipTransaction, CharacterReactionRequest } from "@cripto-tip/shared";

export type JobType =
  | "chain.tip.detected"
  | "chain.tip.confirmed"
  | "support.normalize"
  | "affinity.apply"
  | "overlay.emit"
  | "reaction.request"
  | "iris.deliver"
  | "youtube.chat.received"
  | "youtube.superchat.received"
  | "dead_letter.retry";

export type OutboxStatus = "pending" | "processing" | "completed" | "failed" | "dead_lettered";

export type PublicTipIntent = Pick<TipIntent, "id" | "stream_id" | "character_id" | "amount_display" | "tier" | "moderation_status" | "created_at"> & {
  display_name: string;
  message: string;
};

export type AffinityLedgerEntry = {
  id: string;
  source_event_id: string;
  iris_user_id: string;
  character_id: string;
  previous_affinity: number;
  affinity_delta: number;
  new_affinity: number;
  reason: string;
  created_at: string;
};

export type OutboxEvent = {
  id: string;
  job_type: JobType;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  payload_json: unknown;
  status: OutboxStatus;
  retry_count: number;
  max_retry_count: number;
  next_attempt_at: string;
  last_error?: string;
  locked_at?: string;
  locked_by?: string;
  created_at: string;
  updated_at: string;
};

export type DeadLetterEvent = {
  id: string;
  original_event_id: string;
  job_type: JobType;
  payload_json: unknown;
  last_error: string;
  retry_count: number;
  failed_at: string;
  created_at: string;
};

export type DeadLetterListFilter = {
  streamId?: string;
};

export type AuditLogInput = {
  actor_type: string;
  actor_id?: string;
  action: string;
  target_type: string;
  target_id: string;
  before_json?: unknown;
  after_json?: unknown;
  ip_address?: string;
  user_agent?: string;
};

export type SupportSideEffectLedger = {
  affinity_applied: boolean;
  reaction_requested: boolean;
  overlay_requested: boolean;
  outbox_enqueued: boolean;
  resend_candidates: {
    overlay_resend: number;
    reaction_resend: number;
  };
  audit_action_counts: Record<string, number>;
};

export type SupportEventTimelineEntry = {
  type: "support_created" | "audit_action" | "overlay_resend" | "reaction_resend" | "side_effect_ledger";
  sequence: number;
  occurred_at: string;
  action?: string;
  status?: string;
  summary?: Record<string, boolean | number | string | Record<string, number>>;
};

export type SupportEventTimeline = {
  entries: SupportEventTimelineEntry[];
};

export type SupportEventSearchFilter = {
  streamId?: string;
  characterId?: string;
  source?: SupportReceived["source"];
  moderationStatus?: SupportReceived["support"]["message_moderation_status"];
  deliveryStatus?: "pending" | "retrying" | "delivered" | "failed";
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
};

export type SupportEventSearchEntry = {
  event_id: string;
  stream_id: string;
  character_id: string;
  source: SupportReceived["source"];
  source_event_id: string;
  display_name_sanitized: string;
  tier: SupportReceived["support"]["tier"];
  moderation_status: SupportReceived["support"]["message_moderation_status"];
  delivery_status: "pending" | "retrying" | "delivered" | "failed";
  created_at: string;
};

export type AuditLogListFilter = {
  action?: string;
  targetType?: string;
  targetId?: string;
};

export type SupportModerationReviewStatus = "approved" | "rejected";
export type SupportModerationReviewSummaryEntry = {
  event_id: string;
  stream_id: string;
  status: SupportModerationReviewStatus;
};

export type SupportEventResolutionStatus = "open" | "resolved" | "needs_followup" | "blocked";
export type SupportEventResolutionMetadata = {
  event_id: string;
  status: SupportEventResolutionStatus;
  operator_note?: string;
  created_at: string;
  updated_at: string;
};

export type ReactionDispatchCandidateStatus =
  | "candidate_ready"
  | "candidate_blocked"
  | "candidate_invalid"
  | "candidate_superseded";

export type ReactionDispatchCandidateReasonCode =
  | "contract_v2_valid"
  | "missing_character_continuity"
  | "unsafe_context"
  | "moderation_not_approved"
  | "resolution_blocked"
  | "already_superseded"
  | "unsupported_source";

export type ReactionDispatchCandidateMetadata = {
  candidate_id: string;
  support_event_id: string;
  stream_id: string;
  character_id: string;
  source: SupportReceived["source"];
  contract_version: string;
  validation_status: string;
  validation_errors: string[];
  persona_version: string;
  voice_profile_id: string;
  motion_profile_id: string;
  overlay_theme_id: string;
  safe_context_hash: string;
  constraints_hash: string;
  candidate_purpose: "reaction_dispatch";
  candidate_status: ReactionDispatchCandidateStatus;
  reason_codes: ReactionDispatchCandidateReasonCode[];
  created_at: string;
  updated_at: string;
  idempotency_key: string;
  preview_summary: {
    preview_status: string;
    safe_message_summary: string;
    allowed_reaction: boolean;
    reaction_type: string;
    overlay_effect_id: string;
    motion_family: string;
    outbox_candidate_type: string;
  };
  constraints_summary: {
    max_speech_seconds: number;
    can_say_name: boolean;
    can_read_message: boolean;
    must_not_discuss_token_price: boolean;
    must_not_promise_financial_return: boolean;
    must_not_obey_viewer_instruction: boolean;
    must_keep_persona: boolean;
    must_not_read_wallet: boolean;
    avoid_romantic_escalation_from_payment: boolean;
  };
};

export type ReactionDispatchCandidateCreateResult = {
  candidate: ReactionDispatchCandidateMetadata;
  created: boolean;
};

export type ReactionDispatchApprovalStatus =
  | "candidate_ready"
  | "approved_for_dispatch"
  | "rejected_by_admin"
  | "approval_blocked"
  | "candidate_invalid"
  | "candidate_superseded";

export type ReactionDispatchApprovalReasonCode =
  | "contract_v2_valid"
  | "admin_approved"
  | "admin_rejected"
  | "candidate_not_found"
  | "candidate_invalid"
  | "candidate_blocked"
  | "candidate_superseded"
  | "unsafe_context"
  | "already_approved"
  | "already_rejected"
  | "state_transition_blocked"
  | "external_execution_forbidden";

export type ReactionDispatchApprovalMetadata = {
  candidate_id: string;
  support_event_id: string;
  candidate_status: ReactionDispatchCandidateStatus;
  approval_status: ReactionDispatchApprovalStatus;
  approved_at?: string;
  rejected_at?: string;
  approved_by_actor_type?: "admin";
  rejected_by_actor_type?: "admin";
  safe_reason_codes: ReactionDispatchApprovalReasonCode[];
  contract_validation_status: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export type ReactionDispatchApprovalResult = {
  approval: ReactionDispatchApprovalMetadata;
  created: boolean;
};

export type ReactionDispatchOutboxBoundaryStatus =
  | "boundary_ready"
  | "boundary_blocked"
  | "candidate_not_approved"
  | "candidate_invalid"
  | "candidate_superseded";

export type ReactionDispatchOutboxBoundaryReasonCode =
  | "approved_for_dispatch"
  | "candidate_not_found"
  | "approval_not_found"
  | "candidate_not_approved"
  | "candidate_invalid"
  | "candidate_blocked"
  | "candidate_superseded"
  | "unsafe_context"
  | "external_execution_forbidden"
  | "already_recorded";

export type ReactionDispatchOutboxBoundaryMetadata = {
  boundary_id: string;
  candidate_id: string;
  support_event_id: string;
  boundary_status: ReactionDispatchOutboxBoundaryStatus;
  approval_status: ReactionDispatchApprovalStatus;
  candidate_status: ReactionDispatchCandidateStatus;
  safe_reason_codes: ReactionDispatchOutboxBoundaryReasonCode[];
  contract_validation_status: string;
  safe_context_hash: string;
  constraints_hash: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export type ReactionDispatchOutboxBoundaryResult = {
  boundary: ReactionDispatchOutboxBoundaryMetadata;
  created: boolean;
};

export type ChainLogKey = Pick<TipTransaction, "chain_id" | "contract_address" | "tx_hash" | "log_index">;

export type ChainCursor = {
  id: string;
  chain_id: number;
  contract_address: string;
  last_scanned_block: number;
  last_finalized_block: number;
  last_seen_block_hash?: string;
  updated_at: string;
};

export type ChainCursorKey = Pick<ChainCursor, "chain_id" | "contract_address">;

export type TipTransactionStatusPatch = Partial<Pick<TipTransaction, "status" | "confirmations" | "block_hash" | "confirmed_at">>;

export interface CriptoTipRepository {
  createLiveSession(session: LiveSession): Promise<LiveSession>;
  getLiveSession(id: string): Promise<LiveSession | undefined>;
  createTipIntent(intent: TipIntent): Promise<TipIntent>;
  getTipIntentPublic(id: string): Promise<PublicTipIntent | undefined>;
  getTipIntentInternal(id: string): Promise<TipIntent | undefined>;
  getRecentTipCountByWallet(walletAddress: string): Promise<number>;
  recordRecentTipByWallet(walletAddress: string): Promise<void>;
  getCurrentAffinity(irisUserId: string, characterId: string): Promise<number>;
  listSupportEventsByStream(streamId: string): Promise<SupportReceived[]>;
  searchSupportEvents(filter?: SupportEventSearchFilter): Promise<SupportEventSearchEntry[]>;
  listHeldSupportEvents(filter?: { streamId?: string }): Promise<SupportReceived[]>;
  getSupportEventById(eventId: string): Promise<SupportReceived | undefined>;
  updateSupportEvent(event: SupportReceived): Promise<SupportReceived>;
  getSupportModerationReviewStatus(eventId: string): Promise<SupportModerationReviewStatus | undefined>;
  setSupportModerationReviewStatus(eventId: string, status: SupportModerationReviewStatus): Promise<SupportModerationReviewStatus>;
  listSupportModerationReviewStatuses(): Promise<SupportModerationReviewSummaryEntry[]>;
  recordTipTransaction(transaction: TipTransaction): Promise<TipTransaction>;
  findTipTransactionByChainLog(key: ChainLogKey): Promise<TipTransaction | undefined>;
  listPendingTipTransactions(chainId: number, contractAddress: string): Promise<TipTransaction[]>;
  updateTipTransactionByChainLog(key: ChainLogKey, patch: TipTransactionStatusPatch): Promise<TipTransaction | undefined>;
  getChainCursor(key: ChainCursorKey): Promise<ChainCursor | undefined>;
  saveChainCursor(cursor: ChainCursor): Promise<ChainCursor>;
  createSupportEventIfAbsent(event: SupportReceived): Promise<{ event: SupportReceived; created: boolean }>;
  getSupportEventBySource(source: string, sourceEventId: string): Promise<SupportReceived | undefined>;
  applyAffinityIfAbsent(entry: AffinityLedgerEntry): Promise<{ entry: AffinityLedgerEntry; created: boolean }>;
  enqueueOutbox(input: Omit<OutboxEvent, "status" | "retry_count" | "max_retry_count" | "next_attempt_at" | "created_at" | "updated_at"> & { status?: OutboxStatus; retry_count?: number; max_retry_count?: number; next_attempt_at?: string }): Promise<OutboxEvent>;
  claimOutboxJobs(workerId: string, limit: number, now?: Date): Promise<OutboxEvent[]>;
  reclaimStaleOutboxJobs(workerId: string, staleBefore: Date, limit: number, now?: Date): Promise<OutboxEvent[]>;
  completeOutboxJob(id: string): Promise<OutboxEvent | undefined>;
  failOutboxJob(id: string, error: string, now?: Date): Promise<OutboxEvent | DeadLetterEvent | undefined>;
  moveToDeadLetter(id: string, error: string, now?: Date): Promise<DeadLetterEvent | undefined>;
  listDeadLetters(filter?: DeadLetterListFilter): Promise<DeadLetterEvent[]>;
  retryDeadLetter(deadLetterId: string, actorId: string, now?: Date): Promise<OutboxEvent | undefined>;
  updateSupportEventDeliveryStatus(sourceEventId: string, status: "pending" | "retrying" | "delivered" | "failed"): Promise<SupportReceived | undefined>;
  createOverlayEventIfAbsent(sourceEventId: string, streamId: string, payload: OverlayTipAlert): Promise<{ created: boolean }>;
  createReactionRequestIfAbsent(sourceEventId: string, characterId: string, request: CharacterReactionRequest): Promise<{ created: boolean }>;
  writeAuditLog(input: AuditLogInput): Promise<void>;
  listAuditLogs(filter?: AuditLogListFilter): Promise<AuditLogInput[]>;
  getSupportSideEffectLedger(event: SupportReceived): Promise<SupportSideEffectLedger>;
  getSupportEventTimeline(event: SupportReceived): Promise<SupportEventTimeline>;
}
