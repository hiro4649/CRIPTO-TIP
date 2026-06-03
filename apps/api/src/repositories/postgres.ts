import { createPublicId, SupportReceivedSchema, type CharacterReactionRequest, type LiveSession, type OverlayTipAlert, type SupportReceived, type TipIntent, type TipTransaction } from "@cripto-tip/shared";
import type { AffinityLedgerEntry, AuditLogInput, ChainLogKey, CriptoTipRepository, DeadLetterEvent, OutboxEvent, PublicTipIntent } from "./types.js";

export type QueryClient = {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type SupportEventRow = {
  id: string;
  source: SupportReceived["source"];
  source_event_id: string;
  stream_id: string;
  youtube_video_id?: string;
  character_id: string;
  iris_user_id?: string;
  youtube_author_channel_id?: string;
  wallet_address?: string;
  display_name_sanitized: string;
  display_name_llm_safe: string;
  amount_raw?: string;
  amount_display?: string;
  tier: SupportReceived["support"]["tier"];
  message_sanitized?: string;
  message_moderation_status: SupportReceived["support"]["message_moderation_status"];
  affinity_delta: number;
  created_at: string;
};

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function optionalString(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function rowToOutboxEvent(row: Record<string, unknown>): OutboxEvent {
  const event: OutboxEvent = {
    id: String(row.id),
    job_type: row.job_type as OutboxEvent["job_type"],
    aggregate_type: String(row.aggregate_type),
    aggregate_id: String(row.aggregate_id),
    idempotency_key: String(row.idempotency_key),
    payload_json: row.payload_json,
    status: row.status as OutboxEvent["status"],
    retry_count: Number(row.retry_count),
    max_retry_count: Number(row.max_retry_count),
    next_attempt_at: iso(row.next_attempt_at),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at)
  };
  if (row.last_error) event.last_error = String(row.last_error);
  if (row.locked_at) event.locked_at = iso(row.locked_at);
  if (row.locked_by) event.locked_by = String(row.locked_by);
  return event;
}

function rowToDeadLetterEvent(row: Record<string, unknown>): DeadLetterEvent {
  return {
    id: String(row.id),
    original_event_id: String(row.original_event_id),
    job_type: row.job_type as DeadLetterEvent["job_type"],
    payload_json: row.payload_json,
    last_error: String(row.last_error),
    retry_count: Number(row.retry_count),
    failed_at: iso(row.failed_at),
    created_at: iso(row.created_at)
  };
}

function rowToSupportReceived(row: SupportEventRow): SupportReceived {
  return SupportReceivedSchema.parse({
    event_type: "support.received",
    event_id: row.id,
    source: row.source,
    source_event_id: row.source_event_id,
    stream_id: row.stream_id,
    youtube_video_id: optionalString(row.youtube_video_id),
    character_id: row.character_id,
    viewer: {
      iris_user_id: optionalString(row.iris_user_id),
      display_name: row.display_name_sanitized,
      youtube_author_channel_id: optionalString(row.youtube_author_channel_id),
      wallet_address: optionalString(row.wallet_address)
    },
    support: {
      amount_raw: row.amount_raw ?? "0",
      amount_display: row.amount_display ?? "",
      tier: row.tier,
      message: row.message_sanitized ?? "",
      message_moderation_status: row.message_moderation_status
    },
    relationship: {
      previous_affinity: 0,
      affinity_delta: row.affinity_delta,
      new_affinity: row.affinity_delta,
      relationship_level: 0
    },
    reaction_policy: {
      can_say_name: row.message_moderation_status === "approved",
      can_read_message: row.message_moderation_status === "approved",
      max_speech_seconds: 12,
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true
    },
    created_at: iso(row.created_at)
  });
}

export class PostgresRepository implements CriptoTipRepository {
  constructor(private readonly db: QueryClient) {}

  async createLiveSession(session: LiveSession) {
    await this.db.query(
      `insert into live_sessions (id, youtube_video_id, youtube_live_chat_id, youtube_channel_id, character_id, title, status, companion_url, overlay_url, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do nothing`,
      [session.id, session.youtube_video_id, session.youtube_live_chat_id, session.youtube_channel_id, session.character_id, session.title, session.status, session.companion_url, session.overlay_url, session.created_at]
    );
    return session;
  }

  async getLiveSession(id: string) {
    const result = await this.db.query<LiveSession>("select * from live_sessions where id = $1 limit 1", [id]);
    return result.rows[0];
  }

  async createTipIntent(intent: TipIntent) {
    await this.db.query(
      `insert into tip_intents (id, client_tip_id, stream_id, character_id, iris_user_id, wallet_address, normalized_wallet_address,
        display_name_raw, display_name_sanitized, display_name_llm_safe, message_raw, message_sanitized, message_hash,
        amount_raw, amount_display, tier, moderation_status, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       on conflict (client_tip_id) do nothing`,
      [intent.id, intent.client_tip_id, intent.stream_id, intent.character_id, intent.iris_user_id, intent.wallet_address, intent.wallet_address?.toLowerCase(), intent.display_name_raw, intent.display_name_sanitized, intent.display_name_llm_safe, intent.message_raw, intent.message_sanitized, intent.message_hash, intent.amount_raw, intent.amount_display, intent.tier, intent.moderation_status, "created", intent.created_at]
    );
    return intent;
  }

  async getTipIntentPublic(id: string) {
    const result = await this.db.query<PublicTipIntent>(
      `select id, stream_id, character_id, display_name_sanitized as display_name,
        message_sanitized as message, amount_display, tier, moderation_status, created_at
       from tip_intents where id = $1 limit 1`,
      [id]
    );
    return result.rows[0];
  }

  async getTipIntentInternal(id: string) {
    const result = await this.db.query<TipIntent>("select * from tip_intents where id = $1 limit 1", [id]);
    return result.rows[0];
  }

  async getRecentTipCountByWallet(walletAddress: string) {
    const result = await this.db.query<{ count: string }>(
      `select count(*)::text as count
       from tip_intents
       where normalized_wallet_address = $1
         and created_at >= now() - interval '1 hour'`,
      [walletAddress.toLowerCase()]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async recordRecentTipByWallet(_walletAddress: string) {
    // No-op: createTipIntent inserts the durable row used by getRecentTipCountByWallet.
  }

  async getCurrentAffinity(irisUserId: string, characterId: string) {
    const result = await this.db.query<{ new_affinity: number }>(
      `select new_affinity
       from affinity_ledger
       where iris_user_id = $1 and character_id = $2
       order by created_at desc
       limit 1`,
      [irisUserId, characterId]
    );
    return result.rows[0]?.new_affinity ?? 0;
  }

  async listSupportEventsByStream(streamId: string) {
    const result = await this.db.query<SupportEventRow>("select * from support_events where stream_id = $1 order by created_at desc", [streamId]);
    return result.rows.map(rowToSupportReceived);
  }

  async recordTipTransaction(transaction: TipTransaction) {
    const existing = await this.findTipTransactionByChainLog(transaction);
    if (existing) return existing;
    await this.db.query(
      `insert into tip_transactions (id, chain_id, contract_address, token_address, tx_hash, log_index, block_number,
        block_hash, from_address, normalized_from_address, stream_id, character_id, amount_raw, message_hash,
        client_tip_id, status, confirmations, detected_at, confirmed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       on conflict (chain_id, contract_address, tx_hash, log_index) do nothing`,
      [transaction.id, transaction.chain_id, transaction.contract_address, transaction.token_address, transaction.tx_hash, transaction.log_index, transaction.block_number, null, transaction.from_address, transaction.from_address.toLowerCase(), transaction.stream_id, transaction.character_id, transaction.amount_raw, transaction.message_hash, transaction.client_tip_id, transaction.status, transaction.confirmations, null, null]
    );
    return (await this.findTipTransactionByChainLog(transaction)) ?? transaction;
  }
  async findTipTransactionByChainLog(key: ChainLogKey) {
    const result = await this.db.query<TipTransaction>(
      `select * from tip_transactions
       where chain_id = $1 and contract_address = $2 and tx_hash = $3 and log_index = $4
       limit 1`,
      [key.chain_id, key.contract_address, key.tx_hash, key.log_index]
    );
    return result.rows[0];
  }
  async createSupportEventIfAbsent(event: SupportReceived) {
    const existing = await this.getSupportEventBySource(event.source, event.source_event_id);
    if (existing) return { event: existing, created: false };
    await this.db.query(
      `insert into support_events (id, source, source_event_id, stream_id, youtube_video_id, character_id, iris_user_id,
        youtube_author_channel_id, wallet_address, display_name_sanitized, display_name_llm_safe, amount_raw,
        amount_display, currency_or_token, tier, message_sanitized, message_moderation_status, affinity_delta, delivery_status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       on conflict (source, source_event_id) do nothing`,
      [event.event_id, event.source, event.source_event_id, event.stream_id, event.youtube_video_id, event.character_id, event.viewer.iris_user_id, event.viewer.youtube_author_channel_id, event.viewer.wallet_address, event.viewer.display_name, event.viewer.display_name, event.support.amount_raw, event.support.amount_display, event.source, event.support.tier, event.support.message, event.support.message_moderation_status, event.relationship.affinity_delta, "pending", event.created_at]
    );
    return { event: (await this.getSupportEventBySource(event.source, event.source_event_id)) ?? event, created: true };
  }
  async getSupportEventBySource(source: string, sourceEventId: string) {
    const result = await this.db.query<SupportEventRow>("select * from support_events where source = $1 and source_event_id = $2 limit 1", [source, sourceEventId]);
    return result.rows[0] ? rowToSupportReceived(result.rows[0]) : undefined;
  }
  async applyAffinityIfAbsent(entry: AffinityLedgerEntry) {
    const result = await this.db.query<AffinityLedgerEntry>(
      `insert into affinity_ledger (id, source_event_id, iris_user_id, character_id, previous_affinity,
        affinity_delta, new_affinity, reason, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (source_event_id, iris_user_id, character_id) do nothing
       returning *`,
      [entry.id, entry.source_event_id, entry.iris_user_id, entry.character_id, entry.previous_affinity, entry.affinity_delta, entry.new_affinity, entry.reason, entry.created_at]
    );
    if (result.rows[0]) return { entry: result.rows[0], created: true };
    const existing = await this.db.query<AffinityLedgerEntry>(
      `select * from affinity_ledger where source_event_id = $1 and iris_user_id = $2 and character_id = $3 limit 1`,
      [entry.source_event_id, entry.iris_user_id, entry.character_id]
    );
    return { entry: existing.rows[0] ?? entry, created: false };
  }
  async enqueueOutbox(input: Parameters<CriptoTipRepository["enqueueOutbox"]>[0]) {
    const now = new Date().toISOString();
    const event: OutboxEvent = { status: "pending", retry_count: 0, max_retry_count: 5, next_attempt_at: now, created_at: now, updated_at: now, ...input };
    const result = await this.db.query<Record<string, unknown>>(
      `insert into outbox_events (id, job_type, aggregate_type, aggregate_id, idempotency_key, payload_json, status,
        retry_count, max_retry_count, next_attempt_at, last_error, locked_at, locked_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (idempotency_key) do update set updated_at = outbox_events.updated_at
       returning *`,
      [event.id, event.job_type, event.aggregate_type, event.aggregate_id, event.idempotency_key, JSON.stringify(event.payload_json), event.status, event.retry_count, event.max_retry_count, event.next_attempt_at, event.last_error, event.locked_at, event.locked_by, event.created_at, event.updated_at]
    );
    const row = result.rows[0];
    if (!row) throw new Error("outbox insert did not return a row");
    return rowToOutboxEvent(row);
  }
  async claimOutboxJobs(workerId: string, limit: number, now = new Date()) {
    const result = await this.db.query<Record<string, unknown>>(
      `update outbox_events
       set status = 'processing', locked_at = $1, locked_by = $2, updated_at = $1
       where id in (
         select id from outbox_events
         where status = 'pending' and locked_at is null and next_attempt_at <= $1
         order by next_attempt_at asc, created_at asc
         limit $3
         for update skip locked
       )
       returning *`,
      [now.toISOString(), workerId, limit]
    );
    return result.rows.map(rowToOutboxEvent);
  }
  async reclaimStaleOutboxJobs(workerId: string, staleBefore: Date, limit: number, now = new Date()) {
    const result = await this.db.query<Record<string, unknown>>(
      `update outbox_events
       set status = 'pending',
           locked_at = null,
           locked_by = null,
           last_error = $1,
           next_attempt_at = $2,
           updated_at = $2
       where id in (
         select id from outbox_events
         where status = 'processing' and locked_at < $3
         order by locked_at asc
         limit $4
         for update skip locked
       )
       returning *`,
      [`reclaimed stale lock by ${workerId}`, now.toISOString(), staleBefore.toISOString(), limit]
    );
    return result.rows.map(rowToOutboxEvent);
  }
  async completeOutboxJob(id: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `update outbox_events
       set status = 'completed', locked_at = null, locked_by = null, updated_at = now()
       where id = $1
       returning *`,
      [id]
    );
    return result.rows[0] ? rowToOutboxEvent(result.rows[0]) : undefined;
  }
  async failOutboxJob(id: string, error: string, now = new Date()) {
    const current = await this.db.query<Record<string, unknown>>("select * from outbox_events where id = $1 limit 1", [id]);
    const event = current.rows[0] ? rowToOutboxEvent(current.rows[0]) : undefined;
    if (!event) return undefined;
    if (event.retry_count + 1 >= event.max_retry_count) return this.moveToDeadLetter(id, error, now);
    const retry = event.retry_count + 1;
    const result = await this.db.query<Record<string, unknown>>(
      `update outbox_events
       set status = 'pending', retry_count = $1, last_error = $2, next_attempt_at = $3,
           locked_at = null, locked_by = null, updated_at = $4
       where id = $5
       returning *`,
      [retry, error, new Date(now.getTime() + retry * 1000).toISOString(), now.toISOString(), id]
    );
    return result.rows[0] ? rowToOutboxEvent(result.rows[0]) : undefined;
  }
  async moveToDeadLetter(id: string, error: string, now = new Date()): Promise<DeadLetterEvent | undefined> {
    const current = await this.db.query<Record<string, unknown>>("select * from outbox_events where id = $1 limit 1", [id]);
    const event = current.rows[0] ? rowToOutboxEvent(current.rows[0]) : undefined;
    if (!event) return undefined;
    const dead = await this.db.query<Record<string, unknown>>(
      `insert into dead_letter_events (id, original_event_id, job_type, payload_json, last_error, retry_count, failed_at, created_at)
       values ($1,$2,$3,$4::jsonb,$5,$6,$7,$7)
       returning *`,
      [createPublicId("dlq"), event.id, event.job_type, JSON.stringify(event.payload_json), error, event.retry_count + 1, now.toISOString()]
    );
    await this.db.query(
      `update outbox_events
       set status = 'dead_lettered', last_error = $1, locked_at = null, locked_by = null, updated_at = $2
       where id = $3`,
      [error, now.toISOString(), id]
    );
    const row = dead.rows[0];
    if (!row) throw new Error("dead letter insert did not return a row");
    return rowToDeadLetterEvent(row);
  }
  async retryDeadLetter(deadLetterId: string, actorId: string, now = new Date()) {
    const deadResult = await this.db.query<Record<string, unknown>>("select * from dead_letter_events where id = $1 limit 1", [deadLetterId]);
    const dead = deadResult.rows[0] ? rowToDeadLetterEvent(deadResult.rows[0]) : undefined;
    if (!dead) return undefined;
    const result = await this.db.query<Record<string, unknown>>(
      `update outbox_events
       set status = 'pending', retry_count = 0, last_error = $1, next_attempt_at = $2,
           locked_at = null, locked_by = null, updated_at = $2
       where id = $3
       returning *`,
      [`DLQ retry requested by ${actorId}`, now.toISOString(), dead.original_event_id]
    );
    const retried = result.rows[0] ? rowToOutboxEvent(result.rows[0]) : undefined;
    if (retried) {
      await this.writeAuditLog({ actor_type: "admin", actor_id: actorId, action: "retry_dead_letter", target_type: "dead_letter_event", target_id: deadLetterId, after_json: { outbox_event_id: retried.id } });
    }
    return retried;
  }
  async createOverlayEventIfAbsent(sourceEventId: string, streamId: string, payload: OverlayTipAlert) {
    const result = await this.db.query<{ id: string }>(
      `insert into overlay_events (id, source_event_id, stream_id, payload_json, delivery_status)
       values ($1,$2,$3,$4::jsonb,$5)
       on conflict (source_event_id, stream_id) do nothing
       returning id`,
      [createPublicId("ovl"), sourceEventId, streamId, JSON.stringify(payload), "pending"]
    );
    return { created: result.rows.length > 0 };
  }
  async createReactionRequestIfAbsent(sourceEventId: string, characterId: string, request: CharacterReactionRequest) {
    const result = await this.db.query<{ id: string }>(
      `insert into reaction_requests (id, source_event_id, character_id, stream_id, payload_json, status)
       values ($1,$2,$3,$4,$5::jsonb,$6)
       on conflict (source_event_id, character_id) do nothing
       returning id`,
      [createPublicId("rxn"), sourceEventId, characterId, request.stream_id, JSON.stringify(request), "pending"]
    );
    return { created: result.rows.length > 0 };
  }
  async writeAuditLog(input: AuditLogInput) {
    await this.db.query(
      `insert into audit_logs (id, actor_type, actor_id, action, target_type, target_id, before_json, after_json, ip_address, user_agent)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)`,
      [createPublicId("aud"), input.actor_type, input.actor_id, input.action, input.target_type, input.target_id, input.before_json ? JSON.stringify(input.before_json) : null, input.after_json ? JSON.stringify(input.after_json) : null, input.ip_address, input.user_agent]
    );
  }
}
