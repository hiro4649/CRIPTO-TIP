import { describe, expect, it } from "vitest";
import { PostgresRepository, type QueryClient } from "./postgres.js";

class RecordingClient implements QueryClient {
  queries: Array<{ sql: string; params?: unknown[] }> = [];
  rows: unknown[] = [];

  async query<T = unknown>(sql: string, params?: unknown[]) {
    this.queries.push(params ? { sql, params } : { sql });
    return { rows: this.rows as T[] };
  }
}

describe("PostgresRepository", () => {
  it("exposes required server-path methods", () => {
    const repo = new PostgresRepository(new RecordingClient());
    expect(repo.getRecentTipCountByWallet).toBeTypeOf("function");
    expect(repo.recordRecentTipByWallet).toBeTypeOf("function");
    expect(repo.getCurrentAffinity).toBeTypeOf("function");
    expect(repo.listSupportEventsByStream).toBeTypeOf("function");
  });

  it("getTipIntentPublic does not expose raw fields", async () => {
    const client = new RecordingClient();
    client.rows = [{ id: "tip", stream_id: "str", character_id: "char", display_name: "Akira", message: "safe", amount_display: "100 IRIS", tier: "small", moderation_status: "approved", created_at: "2026-06-03T00:00:00.000Z" }];
    const result = await new PostgresRepository(client).getTipIntentPublic("tip");
    expect(result).toEqual(client.rows[0]);
    expect(result).not.toHaveProperty("wallet_address");
    expect(result).not.toHaveProperty("display_name_raw");
    expect(result).not.toHaveProperty("message_raw");
    expect(result).not.toHaveProperty("message_hash");
    expect(result).not.toHaveProperty("client_tip_id");
  });

  it("getCurrentAffinity returns 0 when no ledger row", async () => {
    const client = new RecordingClient();
    await expect(new PostgresRepository(client).getCurrentAffinity("usr", "char")).resolves.toBe(0);
  });

  it("uses parameterized query placeholders", async () => {
    const client = new RecordingClient();
    const repo = new PostgresRepository(client);
    await repo.getRecentTipCountByWallet("0x1111111111111111111111111111111111111111");
    await repo.getCurrentAffinity("usr", "char");
    await repo.listSupportEventsByStream("str");
    expect(client.queries.every((query) => query.sql.includes("$1"))).toBe(true);
    expect(client.queries.every((query) => Array.isArray(query.params))).toBe(true);
  });
});
