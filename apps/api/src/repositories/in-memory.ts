import { createPublicId, createIdempotencyKeyForChainLog, type LiveSession, type OverlayTipAlert, type SupportReceived, type TipIntent, type TipTransaction, type CharacterReactionRequest } from "@cripto-tip/shared";
import type { AffinityLedgerEntry, AuditLogInput, ChainCursor, ChainCursorKey, ChainLogKey, CriptoTipRepository, DeadLetterEvent, DeadLetterListFilter, OutboxEvent, PublicTipIntent, TipTransactionStatusPatch } from "./types.js";

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
}
