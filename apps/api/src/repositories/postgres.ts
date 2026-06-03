import { SupportReceivedSchema, type CharacterReactionRequest, type LiveSession, type OverlayTipAlert, type SupportReceived, type TipIntent, type TipTransaction } from "@cripto-tip/shared";
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

function rowToSupportReceived(row: SupportEventRow): SupportReceived {
  return SupportReceivedSchema.parse({
    event_type: "support.received",
    event_id: row.id,
    source: row.source,
    source_event_id: row.source_event_id,
    stream_id: row.stream_id,
    youtube_video_id: row.youtube_video_id,
    character_id: row.character_id,
    viewer: {
      iris_user_id: row.iris_user_id,
      display_name: row.display_name_sanitized,
      youtube_author_channel_id: row.youtube_author_channel_id,
      wallet_address: row.wallet_address
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
    created_at: row.created_at
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

  async recordTipTransaction(transaction: TipTransaction) { return transaction; }
  async findTipTransactionByChainLog(_key: ChainLogKey) { return undefined; }
  async createSupportEventIfAbsent(event: SupportReceived) { return { event, created: true }; }
  async getSupportEventBySource(source: string, sourceEventId: string) {
    const result = await this.db.query<SupportEventRow>("select * from support_events where source = $1 and source_event_id = $2 limit 1", [source, sourceEventId]);
    return result.rows[0] ? rowToSupportReceived(result.rows[0]) : undefined;
  }
  async applyAffinityIfAbsent(entry: AffinityLedgerEntry) { return { entry, created: true }; }
  async enqueueOutbox(input: Parameters<CriptoTipRepository["enqueueOutbox"]>[0]) {
    const now = new Date().toISOString();
    const event: OutboxEvent = { status: "pending", retry_count: 0, max_retry_count: 5, next_attempt_at: now, created_at: now, updated_at: now, ...input };
    return event;
  }
  async claimOutboxJobs() { return []; }
  async completeOutboxJob(_id: string) { return undefined; }
  async failOutboxJob(_id: string, _error: string) { return undefined; }
  async moveToDeadLetter(_id: string, _error: string): Promise<DeadLetterEvent | undefined> { return undefined; }
  async createOverlayEventIfAbsent(_sourceEventId: string, _streamId: string, _payload: OverlayTipAlert) { return { created: true }; }
  async createReactionRequestIfAbsent(_sourceEventId: string, _characterId: string, _request: CharacterReactionRequest) { return { created: true }; }
  async writeAuditLog(_input: AuditLogInput) {}
}
