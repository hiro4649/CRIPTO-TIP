import { createPublicId, createIdempotencyKeyForChainLog, type LiveSession, type OverlayTipAlert, type SupportReceived, type TipIntent, type TipTransaction, type CharacterReactionRequest } from "@cripto-tip/shared";
import type { AffinityLedgerEntry, AuditLogInput, ChainLogKey, CriptoTipRepository, DeadLetterEvent, OutboxEvent, PublicTipIntent } from "./types.js";

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
  supportEvents = new Map<string, SupportReceived>();
  affinityLedger = new Map<string, AffinityLedgerEntry>();
  outboxEvents = new Map<string, OutboxEvent>();
  deadLetterEvents = new Map<string, DeadLetterEvent>();
  overlayEvents = new Map<string, OverlayTipAlert>();
  reactionRequests = new Map<string, CharacterReactionRequest>();
  auditLogs: AuditLogInput[] = [];
  affinityByUser = new Map<string, number>();
  recentTipsByWallet = new Map<string, number>();

  clear() {
    this.liveSessions.clear();
    this.tipIntents.clear();
    this.tipTransactions.clear();
    this.supportEvents.clear();
    this.affinityLedger.clear();
    this.outboxEvents.clear();
    this.deadLetterEvents.clear();
    this.overlayEvents.clear();
    this.reactionRequests.clear();
    this.auditLogs = [];
    this.affinityByUser.clear();
    this.recentTipsByWallet.clear();
  }

  async createLiveSession(session: LiveSession) { this.liveSessions.set(session.id, session); return session; }
  async getLiveSession(id: string) { return this.liveSessions.get(id); }
  async createTipIntent(intent: TipIntent) { this.tipIntents.set(intent.id, intent); return intent; }
  async getTipIntentPublic(id: string) { const intent = this.tipIntents.get(id); return intent ? toPublicTipIntent(intent) : undefined; }
  async getTipIntentInternal(id: string) { return this.tipIntents.get(id); }
  async recordTipTransaction(transaction: TipTransaction) {
    const key = createIdempotencyKeyForChainLog(transaction);
    const existing = this.tipTransactions.get(key);
    if (existing) return existing;
    this.tipTransactions.set(key, transaction);
    return transaction;
  }
  async findTipTransactionByChainLog(key: ChainLogKey) { return this.tipTransactions.get(createIdempotencyKeyForChainLog(key)); }
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
