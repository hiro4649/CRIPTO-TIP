import type { CriptoTipRepository } from "./types.js";

export type QueryClient = {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export class PostgresRepository implements Partial<CriptoTipRepository> {
  constructor(private readonly db: QueryClient) {}

  async getLiveSession(id: string) {
    const result = await this.db.query("select * from live_sessions where id = $1 limit 1", [id]);
    return result.rows[0] as never;
  }

  async getTipIntentPublic(id: string) {
    const result = await this.db.query(
      `select id, stream_id, character_id, display_name_sanitized as display_name,
        message_sanitized as message, amount_display, tier, moderation_status, created_at
       from tip_intents where id = $1 limit 1`,
      [id]
    );
    return result.rows[0] as never;
  }

  async getSupportEventBySource(source: string, sourceEventId: string) {
    const result = await this.db.query("select * from support_events where source = $1 and source_event_id = $2 limit 1", [source, sourceEventId]);
    return result.rows[0] as never;
  }
}
