import { createPublicId, createIdempotencyKeyForChainLog, type LiveSession, type OverlayTipAlert, type SupportReceived, type TipIntent, type TipTransaction, type CharacterReactionRequest } from "@cripto-tip/shared";
import type { AffinityLedgerEntry, AuditLogInput, AuditLogListFilter, ChainCursor, ChainCursorKey, ChainLogKey, CriptoTipRepository, DeadLetterEvent, DeadLetterListFilter, OutboxEvent, PublicTipIntent, ReactionDispatchApprovalMetadata, ReactionDispatchApprovalResult, ReactionDispatchCandidateCreateResult, ReactionDispatchCandidateMetadata, ReactionDispatchInternalOutboxAttemptPlanMetadata, ReactionDispatchInternalOutboxLeaseMetadata, ReactionDispatchInternalOutboxMetadata, ReactionDispatchInternalOutboxResult, ReactionDispatchOutboxBoundaryMetadata, ReactionDispatchOutboxBoundaryResult, SupportEventResolutionMetadata, SupportEventResolutionStatus, SupportEventSearchFilter, SupportEventTimelineEntry, SupportModerationReviewStatus, SupportModerationReviewSummaryEntry, TipTransactionStatusPatch } from "./types.js";

export function toPublicTipIntent(intent: TipIntent): PublicTipIntent {
  return {
    id: intent.id,
    stream_id: intent.stream_id,
    character_id: intent.character_id,
    display_name: intent.display_name_sanitized,
    message: intent.message_sanitized,
    amount_display: intent.amount_display,
    tier: intent.tier,
    moderation_status: intent.moderation_status,
    created_at: intent.created_at
  };
}

export class InMemoryRepository implements CriptoTipRepository {
  liveSessions = new Map<string, LiveSession>();
  tipIntents = new Map<string, TipIntent>();
  tipTransactions = new Map<string, TipTransaction>();
  chainCursors = new Map<string, ChainCursor>();
  supportEvents = new Map<string, SupportReceived>();
  affinityLedger = new Map<string, AffinityLedgerEntry>();
  outboxEvents = new Map<string, OutboxEvent>();
  deadLetterEvents = new Map<string, DeadLetterEvent>();
  overlayEvents = new Map<string, OverlayTipAlert>();
  reactionRequests = new Map<string, CharacterReactionRequest>();
  auditLogs: AuditLogInput[] = [];
  supportEventOperatorNotes = new Map<string, { id: string; event_id: string; note: string; archived: boolean; created_at: string; updated_at: string }[]>();
  supportModerationReviewStates = new Map<string, SupportModerationReviewStatus>();
  supportEventResolutions = new Map<string, SupportEventResolutionMetadata>();
  reactionDispatchCandidates = new Map<string, ReactionDispatchCandidateMetadata>();
  reactionDispatchApprovals = new Map<string, ReactionDispatchApprovalMetadata>();
  reactionDispatchOutboxBoundaries = new Map<string, ReactionDispatchOutboxBoundaryMetadata>();
  reactionDispatchInternalOutbox = new Map<string, ReactionDispatchInternalOutboxMetadata>();
  reactionDispatchInternalOutboxLeases = new Map<string, ReactionDispatchInternalOutboxLeaseMetadata>();
  reactionDispatchInternalOutboxAttemptPlans = new Map<string, ReactionDispatchInternalOutboxAttemptPlanMetadata>();
  affinityByUser = new Map<string, number>();
  recentTipsByWallet = new Map<string, number>();
  supportEventDeliveryStatus = new Map<string, "pending" | "retrying" | "delivered" | "failed">();

  clear() {
    this.liveSessions.clear();
    this.tipIntents.clear();
    this.tipTransactions.clear();
    this.chainCursors.clear();
    this.supportEvents.clear();
    this.affinityLedger.clear();
    this.outboxEvents.clear();
    this.deadLetterEvents.clear();
    this.overlayEvents.clear();
    this.reactionRequests.clear();
    this.auditLogs = [];
    this.supportEventOperatorNotes.clear();
    this.supportModerationReviewStates.clear();
    this.supportEventResolutions.clear();
    this.reactionDispatchCandidates.clear();
    this.reactionDispatchApprovals.clear();
    this.reactionDispatchOutboxBoundaries.clear();
    this.reactionDispatchInternalOutbox.clear();
    this.reactionDispatchInternalOutboxLeases.clear();
    this.reactionDispatchInternalOutboxAttemptPlans.clear();
    this.affinityByUser.clear();
    this.recentTipsByWallet.clear();
    this.supportEventDeliveryStatus.clear();
  }

  async createLiveSession(session: LiveSession) { this.liveSessions.set(session.id, session); return session; }
  async getLiveSession(id: string) { return this.liveSessions.get(id); }
  async createTipIntent(intent: TipIntent) { this.tipIntents.set(intent.id, intent); return intent; }
  async getTipIntentPublic(id: string) { const intent = this.tipIntents.get(id); return intent ? toPublicTipIntent(intent) : undefined; }
  async getTipIntentInternal(id: string) { return this.tipIntents.get(id); }
  async getRecentTipCountByWallet(walletAddress: string) { return this.recentTipsByWallet.get(walletAddress.toLowerCase()) ?? 0; }
  async recordRecentTipByWallet(walletAddress: string) {
    const key = walletAddress.toLowerCase();
    this.recentTipsByWallet.set(key, (this.recentTipsByWallet.get(key) ?? 0) + 1);
  }
  async getCurrentAffinity(irisUserId: string, characterId: string) {
    return this.affinityLedger.get([...this.affinityLedger.keys()].find((key) => key.includes(`:${irisUserId}:${characterId}`)) ?? "")?.new_affinity ?? this.affinityByUser.get(`${irisUserId}:${characterId}`) ?? this.affinityByUser.get(irisUserId) ?? 0;
  }
  async listSupportEventsByStream(streamId: string) {
    return [...this.supportEvents.values()].filter((event) => event.stream_id === streamId);
  }
  async searchSupportEvents(filter: SupportEventSearchFilter = {}) {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);
    return [...this.supportEvents.values()]
      .filter((event) => !filter.streamId || event.stream_id === filter.streamId)
      .filter((event) => !filter.characterId || event.character_id === filter.characterId)
      .filter((event) => !filter.source || event.source === filter.source)
      .filter((event) => !filter.moderationStatus || event.support.message_moderation_status === filter.moderationStatus)
      .filter((event) => !filter.deliveryStatus || (this.supportEventDeliveryStatus.get(event.source_event_id) ?? "pending") === filter.deliveryStatus)
      .filter((event) => !filter.createdAfter || event.created_at >= filter.createdAfter)
      .filter((event) => !filter.createdBefore || event.created_at <= filter.createdBefore)
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.event_id.localeCompare(b.event_id))
      .slice(offset, offset + limit)
      .map((event) => ({
        event_id: event.event_id,
        stream_id: event.stream_id,
        character_id: event.character_id,
        source: event.source,
        source_event_id: event.source_event_id,
        display_name_sanitized: event.viewer.display_name,
        tier: event.support.tier,
        moderation_status: event.support.message_moderation_status,
        delivery_status: this.supportEventDeliveryStatus.get(event.source_event_id) ?? "pending",
        created_at: event.created_at
      }));
  }
  async listHeldSupportEvents(filter: { streamId?: string } = {}) {
    return [...this.supportEvents.values()].filter((event) =>
      event.support.message_moderation_status === "hold" &&
      (!filter.streamId || event.stream_id === filter.streamId)
    );
  }
  async getSupportEventById(eventId: string) {
    return [...this.supportEvents.values()].find((event) => event.event_id === eventId);
  }
  async updateSupportEvent(event: SupportReceived) {
    this.supportEvents.set(`${event.source}:${event.source_event_id}`, event);
    return event;
  }
  async getSupportModerationReviewStatus(eventId: string) {
    return this.supportModerationReviewStates.get(eventId);
  }
  async setSupportModerationReviewStatus(eventId: string, status: SupportModerationReviewStatus) {
    const existing = this.supportModerationReviewStates.get(eventId);
    if (existing) return existing;
    this.supportModerationReviewStates.set(eventId, status);
    return status;
  }
  async listSupportModerationReviewStatuses() {
    const entries: SupportModerationReviewSummaryEntry[] = [];
    for (const [eventId, status] of this.supportModerationReviewStates.entries()) {
      const event = [...this.supportEvents.values()].find((support) => support.event_id === eventId);
      if (!event) continue;
      entries.push({ event_id: eventId, stream_id: event.stream_id, status });
    }
    return entries;
  }
  async getSupportEventResolution(eventId: string) {
    return this.supportEventResolutions.get(eventId);
  }
  async setSupportEventResolution(eventId: string, patch: { status: SupportEventResolutionStatus; operator_note?: string }) {
    const now = new Date().toISOString();
    const existing = this.supportEventResolutions.get(eventId);
    const next: SupportEventResolutionMetadata = {
      event_id: eventId,
      status: patch.status,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    if (patch.operator_note !== undefined) next.operator_note = patch.operator_note;
    else if (existing?.operator_note !== undefined) next.operator_note = existing.operator_note;
    this.supportEventResolutions.set(eventId, next);
    return next;
  }
  async createReactionDispatchCandidateIfAbsent(candidate: ReactionDispatchCandidateMetadata): Promise<ReactionDispatchCandidateCreateResult> {
    const existing = [...this.reactionDispatchCandidates.values()].find((entry) => entry.idempotency_key === candidate.idempotency_key);
    if (existing) return { candidate: existing, created: false };
    this.reactionDispatchCandidates.set(candidate.candidate_id, candidate);
    return { candidate, created: true };
  }
  async listReactionDispatchCandidatesBySupportEvent(eventId: string) {
    return [...this.reactionDispatchCandidates.values()]
      .filter((candidate) => candidate.support_event_id === eventId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.candidate_id.localeCompare(b.candidate_id));
  }
  async getReactionDispatchCandidate(eventId: string, candidateId: string) {
    const candidate = this.reactionDispatchCandidates.get(candidateId);
    return candidate?.support_event_id === eventId ? candidate : undefined;
  }
  async getReactionDispatchCandidateById(candidateId: string) {
    return this.reactionDispatchCandidates.get(candidateId);
  }
  async setReactionDispatchApprovalIfAbsent(approval: ReactionDispatchApprovalMetadata): Promise<ReactionDispatchApprovalResult> {
    const existing = this.reactionDispatchApprovals.get(approval.candidate_id);
    if (existing) return { approval: existing, created: false };
    this.reactionDispatchApprovals.set(approval.candidate_id, approval);
    return { approval, created: true };
  }
  async getReactionDispatchApproval(candidateId: string) {
    return this.reactionDispatchApprovals.get(candidateId);
  }
  async setReactionDispatchOutboxBoundaryIfAbsent(boundary: ReactionDispatchOutboxBoundaryMetadata): Promise<ReactionDispatchOutboxBoundaryResult> {
    const existing = this.reactionDispatchOutboxBoundaries.get(boundary.candidate_id);
    if (existing) return { boundary: existing, created: false };
    this.reactionDispatchOutboxBoundaries.set(boundary.candidate_id, boundary);
    return { boundary, created: true };
  }
  async getReactionDispatchOutboxBoundary(candidateId: string) {
    return this.reactionDispatchOutboxBoundaries.get(candidateId);
  }
  async getReactionDispatchOutboxBoundaryById(boundaryId: string) {
    return [...this.reactionDispatchOutboxBoundaries.values()].find((boundary) => boundary.boundary_id === boundaryId);
  }
  async setReactionDispatchInternalOutboxIfAbsent(outbox: ReactionDispatchInternalOutboxMetadata): Promise<ReactionDispatchInternalOutboxResult> {
    const existing = this.reactionDispatchInternalOutbox.get(`${outbox.boundary_id}:${outbox.candidate_id}`);
    if (existing) return { outbox: existing, created: false };
    this.reactionDispatchInternalOutbox.set(`${outbox.boundary_id}:${outbox.candidate_id}`, outbox);
    return { outbox, created: true };
  }
  async getReactionDispatchInternalOutboxByBoundary(boundaryId: string) {
    return [...this.reactionDispatchInternalOutbox.values()].find((outbox) => outbox.boundary_id === boundaryId);
  }
  async getReactionDispatchInternalOutbox(outboxId: string) {
    return [...this.reactionDispatchInternalOutbox.values()].find((outbox) => outbox.outbox_id === outboxId);
  }
  async updateReactionDispatchInternalOutbox(outbox: ReactionDispatchInternalOutboxMetadata) {
    const key = `${outbox.boundary_id}:${outbox.candidate_id}`;
    if (!this.reactionDispatchInternalOutbox.has(key)) return undefined;
    this.reactionDispatchInternalOutbox.set(key, outbox);
    return outbox;
  }
  async listReactionDispatchInternalOutbox() {
    return [...this.reactionDispatchInternalOutbox.values()]
      .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.outbox_id.localeCompare(right.outbox_id));
  }
  async setReactionDispatchInternalOutboxLease(lease: ReactionDispatchInternalOutboxLeaseMetadata) {
    this.reactionDispatchInternalOutboxLeases.set(lease.outbox_id, lease);
    return lease;
  }
  async getReactionDispatchInternalOutboxLease(outboxId: string) {
    return this.reactionDispatchInternalOutboxLeases.get(outboxId);
  }
  async setReactionDispatchInternalOutboxAttemptPlan(plan: ReactionDispatchInternalOutboxAttemptPlanMetadata) {
    this.reactionDispatchInternalOutboxAttemptPlans.set(plan.outbox_id, plan);
    return plan;
  }
  async getReactionDispatchInternalOutboxAttemptPlan(outboxId: string) {
    return this.reactionDispatchInternalOutboxAttemptPlans.get(outboxId);
  }
  async recordTipTransaction(transaction: TipTransaction) {
    const key = createIdempotencyKeyForChainLog(transaction);
    const existing = this.tipTransactions.get(key);
    if (existing) return existing;
    this.tipTransactions.set(key, transaction);
    return transaction;
  }
  async findTipTransactionByChainLog(key: ChainLogKey) { return this.tipTransactions.get(createIdempotencyKeyForChainLog(key)); }
  async listPendingTipTransactions(chainId: number, contractAddress: string) {
    return [...this.tipTransactions.values()].filter((transaction) =>
      transaction.chain_id === chainId &&
      transaction.contract_address.toLowerCase() === contractAddress.toLowerCase() &&
      (transaction.status === "detected" || transaction.status === "pending_confirmation")
    );
  }
  async updateTipTransactionByChainLog(key: ChainLogKey, patch: TipTransactionStatusPatch) {
    const idempotencyKey = createIdempotencyKeyForChainLog(key);
    const existing = this.tipTransactions.get(idempotencyKey);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.tipTransactions.set(idempotencyKey, updated);
    return updated;
  }
  async getChainCursor(key: ChainCursorKey) {
    return this.chainCursors.get(`${key.chain_id}:${key.contract_address.toLowerCase()}`);
  }
  async saveChainCursor(cursor: ChainCursor) {
    const normalized = { ...cursor, contract_address: cursor.contract_address.toLowerCase() };
    this.chainCursors.set(`${normalized.chain_id}:${normalized.contract_address}`, normalized);
    return normalized;
  }
  async createSupportEventIfAbsent(event: SupportReceived) {
    const key = `${event.source}:${event.source_event_id}`;
    const existing = this.supportEvents.get(key);
    if (existing) return { event: existing, created: false };
    this.supportEvents.set(key, event);
    return { event, created: true };
  }
  async getSupportEventBySource(source: string, sourceEventId: string) { return this.supportEvents.get(`${source}:${sourceEventId}`); }
  async applyAffinityIfAbsent(entry: AffinityLedgerEntry) {
    const key = `${entry.source_event_id}:${entry.iris_user_id}:${entry.character_id}`;
    const existing = this.affinityLedger.get(key);
    if (existing) return { entry: existing, created: false };
    this.affinityLedger.set(key, entry);
    this.affinityByUser.set(`${entry.iris_user_id}:${entry.character_id}`, entry.new_affinity);
    this.affinityByUser.set(entry.iris_user_id, entry.new_affinity);
    return { entry, created: true };
  }
  async enqueueOutbox(input: Parameters<CriptoTipRepository["enqueueOutbox"]>[0]) {
    const existing = [...this.outboxEvents.values()].find((event) => event.idempotency_key === input.idempotency_key);
    if (existing) return existing;
    const now = new Date().toISOString();
    const event: OutboxEvent = { status: "pending", retry_count: 0, max_retry_count: 5, next_attempt_at: now, created_at: now, updated_at: now, ...input };
    this.outboxEvents.set(event.id, event);
    return event;
  }
  async claimOutboxJobs(workerId: string, limit: number, now = new Date()) {
    const claimed: OutboxEvent[] = [];
    for (const event of this.outboxEvents.values()) {
      if (claimed.length >= limit) break;
      if (event.status !== "pending") continue;
      if (event.locked_at) continue;
      if (new Date(event.next_attempt_at).getTime() > now.getTime()) continue;
      const updated = { ...event, status: "processing" as const, locked_at: now.toISOString(), locked_by: workerId, updated_at: now.toISOString() };
      this.outboxEvents.set(event.id, updated);
      claimed.push(updated);
    }
    return claimed;
  }
  async reclaimStaleOutboxJobs(workerId: string, staleBefore: Date, limit: number, now = new Date()) {
    const reclaimed: OutboxEvent[] = [];
    for (const event of this.outboxEvents.values()) {
      if (reclaimed.length >= limit) break;
      if (event.status !== "processing") continue;
      if (!event.locked_at || new Date(event.locked_at).getTime() >= staleBefore.getTime()) continue;
      const updated = {
        ...event,
        status: "pending" as const,
        last_error: `reclaimed stale lock by ${workerId}`,
        next_attempt_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      delete updated.locked_at;
      delete updated.locked_by;
      this.outboxEvents.set(event.id, updated);
      reclaimed.push(updated);
    }
    return reclaimed;
  }
  async completeOutboxJob(id: string) {
    const event = this.outboxEvents.get(id);
    if (!event) return undefined;
    const { locked_at: _lockedAt, locked_by: _lockedBy, ...rest } = event;
    const updated = { ...rest, status: "completed" as const, updated_at: new Date().toISOString() };
    this.outboxEvents.set(id, updated);
    return updated;
  }
  async failOutboxJob(id: string, error: string, now = new Date()) {
    const event = this.outboxEvents.get(id);
    if (!event) return undefined;
    if (event.retry_count + 1 >= event.max_retry_count) return this.moveToDeadLetter(id, error, now);
    const retry = event.retry_count + 1;
    const { locked_at: _lockedAt, locked_by: _lockedBy, ...rest } = event;
    const updated = { ...rest, status: "pending" as const, retry_count: retry, last_error: error, next_attempt_at: new Date(now.getTime() + retry * 1000).toISOString(), updated_at: now.toISOString() };
    this.outboxEvents.set(id, updated);
    return updated;
  }
  async moveToDeadLetter(id: string, error: string, now = new Date()) {
    const event = this.outboxEvents.get(id);
    if (!event) return undefined;
    const dead: DeadLetterEvent = { id: createPublicId("dlq"), original_event_id: event.id, job_type: event.job_type, payload_json: event.payload_json, last_error: error, retry_count: event.retry_count + 1, failed_at: now.toISOString(), created_at: now.toISOString() };
    this.deadLetterEvents.set(dead.id, dead);
    const { locked_at: _lockedAt, locked_by: _lockedBy, ...rest } = event;
    this.outboxEvents.set(id, { ...rest, status: "dead_lettered", last_error: error, updated_at: now.toISOString() });
    return dead;
  }
  async listDeadLetters(filter: DeadLetterListFilter = {}) {
    return [...this.deadLetterEvents.values()].filter((event) => {
      if (!filter.streamId) return true;
      const payload = event.payload_json;
      return typeof payload === "object" && payload !== null && (payload as { stream_id?: unknown }).stream_id === filter.streamId;
    });
  }
  async retryDeadLetter(deadLetterId: string, actorId: string, now = new Date()) {
    const dead = this.deadLetterEvents.get(deadLetterId);
    if (!dead) return undefined;
    const original = this.outboxEvents.get(dead.original_event_id);
    if (!original) return undefined;
    const alreadyQueued = original.status === "pending" && original.last_error?.startsWith("DLQ retry requested");
    const { locked_at: _lockedAt, locked_by: _lockedBy, ...rest } = original;
    const updated: OutboxEvent = {
      ...rest,
      status: "pending",
      retry_count: 0,
      last_error: `DLQ retry requested by ${actorId}`,
      next_attempt_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    this.outboxEvents.set(updated.id, updated);
    if (!alreadyQueued) {
      await this.writeAuditLog({ actor_type: "admin", actor_id: actorId, action: "retry_dead_letter", target_type: "dead_letter_event", target_id: deadLetterId, after_json: { outbox_event_id: updated.id } });
    }
    return updated;
  }
  async updateSupportEventDeliveryStatus(sourceEventId: string, status: "pending" | "retrying" | "delivered" | "failed") {
    this.supportEventDeliveryStatus.set(sourceEventId, status);
    return [...this.supportEvents.values()].find((event) => event.source_event_id === sourceEventId);
  }
  async createOverlayEventIfAbsent(sourceEventId: string, streamId: string, payload: OverlayTipAlert) {
    const key = `${sourceEventId}:${streamId}`;
    if (this.overlayEvents.has(key)) return { created: false };
    this.overlayEvents.set(key, payload);
    return { created: true };
  }
  async createReactionRequestIfAbsent(sourceEventId: string, characterId: string, request: CharacterReactionRequest) {
    const key = `${sourceEventId}:${characterId}`;
    if (this.reactionRequests.has(key)) return { created: false };
    this.reactionRequests.set(key, request);
    return { created: true };
  }
  async writeAuditLog(input: AuditLogInput) { this.auditLogs.push(input); }
  async createSupportEventOperatorNote(note: { id: string; event_id: string; note: string; archived: boolean; created_at: string; updated_at: string }) {
    const notes = this.supportEventOperatorNotes.get(note.event_id) ?? [];
    notes.push(note);
    this.supportEventOperatorNotes.set(note.event_id, notes);
    return note;
  }
  async listSupportEventOperatorNotes(eventId: string, options: { includeArchived?: boolean } = {}) {
    return [...(this.supportEventOperatorNotes.get(eventId) ?? [])].filter((note) => options.includeArchived || !note.archived);
  }
  async getSupportEventOperatorNote(eventId: string, noteId: string) {
    return (this.supportEventOperatorNotes.get(eventId) ?? []).find((note) => note.id === noteId);
  }
  async updateSupportEventOperatorNote(eventId: string, noteId: string, patch: Partial<{ note: string; archived: boolean }>) {
    const notes = this.supportEventOperatorNotes.get(eventId) ?? [];
    const index = notes.findIndex((note) => note.id === noteId);
    if (index < 0) return undefined;
    const existing = notes[index];
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
    notes[index] = updated;
    this.supportEventOperatorNotes.set(eventId, notes);
    return updated;
  }
  async listAuditLogs(filter: AuditLogListFilter = {}) {
    return this.auditLogs.filter((log) => {
      if (filter.action && log.action !== filter.action) return false;
      if (filter.targetType && log.target_type !== filter.targetType) return false;
      if (filter.targetId && log.target_id !== filter.targetId) return false;
      return true;
    });
  }
  async getSupportSideEffectLedger(event: SupportReceived) {
    const auditLogs = await this.listAuditLogs({ targetType: "support_event", targetId: event.event_id });
    const audit_action_counts: Record<string, number> = {};
    for (const log of auditLogs) audit_action_counts[log.action] = (audit_action_counts[log.action] ?? 0) + 1;
    const sourceKey = event.source_event_id;
    return {
      affinity_applied: [...this.affinityLedger.values()].some((entry) => entry.source_event_id === sourceKey && entry.character_id === event.character_id),
      reaction_requested: this.reactionRequests.has(`${sourceKey}:${event.character_id}`),
      overlay_requested: this.overlayEvents.has(`${sourceKey}:${event.stream_id}`),
      outbox_enqueued: [...this.outboxEvents.values()].some((outbox) => outbox.aggregate_type === "support_event" && outbox.aggregate_id === event.event_id),
      resend_candidates: {
        overlay_resend: [...this.outboxEvents.values()].filter((outbox) => outbox.aggregate_id === event.event_id && outbox.idempotency_key.startsWith(`overlay.resend:${event.event_id}:`)).length,
        reaction_resend: [...this.outboxEvents.values()].filter((outbox) => outbox.aggregate_id === event.event_id && outbox.idempotency_key.startsWith(`reaction.resend:${event.event_id}:`)).length
      },
      audit_action_counts
    };
  }
  async getSupportEventTimeline(event: SupportReceived) {
    const ledger = await this.getSupportSideEffectLedger(event);
    const auditLogs = await this.listAuditLogs({ targetType: "support_event", targetId: event.event_id });
    const entries: SupportEventTimelineEntry[] = [
      {
        type: "support_created" as const,
        sequence: 0,
        occurred_at: event.created_at,
        status: event.support.message_moderation_status,
        summary: {
          stream_id: event.stream_id,
          character_id: event.character_id,
          source: event.source
        }
      }
    ];
    auditLogs.forEach((log, index) => entries.push({
      type: "audit_action" as const,
      sequence: index + 1,
      occurred_at: event.created_at,
      action: log.action
    }));
    const resendOutbox = [...this.outboxEvents.values()]
      .filter((outbox) => outbox.aggregate_type === "support_event" && outbox.aggregate_id === event.event_id)
      .filter((outbox) => outbox.idempotency_key.startsWith(`overlay.resend:${event.event_id}:`) || outbox.idempotency_key.startsWith(`reaction.resend:${event.event_id}:`));
    resendOutbox.forEach((outbox, index) => entries.push({
      type: outbox.idempotency_key.startsWith("overlay.resend:") ? "overlay_resend" as const : "reaction_resend" as const,
      sequence: auditLogs.length + index + 1,
      occurred_at: outbox.created_at,
      status: outbox.status
    }));
    entries.push({
      type: "side_effect_ledger" as const,
      sequence: auditLogs.length + resendOutbox.length + 1,
      occurred_at: event.created_at,
      summary: {
        affinity_applied: ledger.affinity_applied,
        reaction_requested: ledger.reaction_requested,
        overlay_requested: ledger.overlay_requested,
        outbox_enqueued: ledger.outbox_enqueued,
        overlay_resend: ledger.resend_candidates.overlay_resend,
        reaction_resend: ledger.resend_candidates.reaction_resend,
        audit_action_counts: ledger.audit_action_counts
      }
    });
    entries.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.sequence - b.sequence);
    return { entries: entries.map((entry, index) => ({ ...entry, sequence: index })) };
  }
}
