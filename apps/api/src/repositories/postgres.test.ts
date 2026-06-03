import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { PostgresRepository, type QueryClient } from "./postgres.js";
import { normalizeTokenTipToSupportReceived, type TipTransaction } from "@cripto-tip/shared";

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

const runLivePostgres = process.env.RUN_LIVE_POSTGRES_TESTS === "true" && Boolean(process.env.DATABASE_URL);
const liveDescribe = runLivePostgres ? describe : describe.skip;
const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(resolve(here, "../../../../migrations/0001_durable_events.sql"), "utf8");

liveDescribe("PostgresRepository live integration", () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const repo = new PostgresRepository(pool);
  const wallet = "0x1111111111111111111111111111111111111111";

  beforeAll(async () => {
    await pool.query("drop schema public cascade");
    await pool.query("create schema public");
    await pool.query(migrationSql);
  }, 30_000);

  afterAll(async () => {
    await pool.end();
  });

  it("applies migration to a live PostgreSQL database", async () => {
    const result = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = 'support_events'`
    );
    expect(result.rows[0]?.table_name).toBe("support_events");
  });

  it("preserves tip transaction chain-log uniqueness in the live database", async () => {
    const tx: TipTransaction = { id: "tx_live_1", chain_id: 31337, contract_address: wallet, token_address: wallet, tx_hash: "0xlive", log_index: 1, block_number: 1, from_address: wallet, stream_id: "str", character_id: "char", amount_raw: "100", message_hash: "0x" + "a".repeat(64), client_tip_id: "0x" + "b".repeat(64), status: "detected", confirmations: 0 };
    await repo.recordTipTransaction(tx);
    const duplicate = await repo.recordTipTransaction({ ...tx, id: "tx_live_2" });
    expect(duplicate.id).toBe("tx_live_1");
  });

  it("preserves support event and affinity idempotency in the live database", async () => {
    const support = normalizeTokenTipToSupportReceived({
      chain_id: 31337,
      contract_address: wallet,
      tx_hash: "0xsupport",
      log_index: 1,
      stream_id: "str_live",
      character_id: "char",
      wallet_address: wallet,
      display_name: "Akira",
      amount_raw: "100",
      amount_display: "100 IRIS",
      tier: "medium",
      message: "thanks",
      moderation_status: "approved",
      created_at: new Date(0).toISOString()
    }, { previous: 0, delta: 8, next: 8 });
    expect((await repo.createSupportEventIfAbsent(support)).created).toBe(true);
    expect((await repo.createSupportEventIfAbsent({ ...support, event_id: "different" })).created).toBe(false);
    const entry = { id: "aff_live_1", source_event_id: support.source_event_id, iris_user_id: "usr_live", character_id: "char", previous_affinity: 0, affinity_delta: 8, new_affinity: 8, reason: "support.received", created_at: new Date(0).toISOString() };
    expect((await repo.applyAffinityIfAbsent(entry)).created).toBe(true);
    expect((await repo.applyAffinityIfAbsent({ ...entry, id: "aff_live_2", new_affinity: 16 })).created).toBe(false);
  });

  it("preserves outbox idempotency and reclaims stale locks in the live database", async () => {
    const first = await repo.enqueueOutbox({ id: "outbox_live_1", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "outbox-live-key", payload_json: {}, max_retry_count: 2 });
    const duplicate = await repo.enqueueOutbox({ id: "outbox_live_2", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "outbox-live-key", payload_json: {}, max_retry_count: 2 });
    expect(duplicate.id).toBe(first.id);
    await pool.query("update outbox_events set next_attempt_at = $1 where id = $2", ["2026-06-03T00:00:00.000Z", first.id]);
    const claimed = await repo.claimOutboxJobs("worker-live", 1, new Date("2026-06-03T00:01:00.000Z"));
    expect(claimed.map((job) => job.id)).toEqual([first.id]);
    await pool.query("update outbox_events set locked_at = $1 where id = $2", ["2026-06-03T00:00:00.000Z", first.id]);
    const reclaimed = await repo.reclaimStaleOutboxJobs("worker-reclaim", new Date("2026-06-03T00:05:00.000Z"), 1, new Date("2026-06-03T00:10:00.000Z"));
    expect(reclaimed.map((job) => job.id)).toEqual([first.id]);
    expect(reclaimed[0]?.status).toBe("pending");
  });

  it("moves a live outbox job to DLQ and admin retry requeues it with audit log", async () => {
    await repo.enqueueOutbox({ id: "outbox_dlq_live", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "outbox-dlq-live", payload_json: {}, max_retry_count: 1 });
    const dead = await repo.failOutboxJob("outbox_dlq_live", "terminal failure");
    if (!dead || !("id" in dead)) throw new Error("missing dead letter");
    const retried = await repo.retryDeadLetter(dead.id, "admin-live");
    expect(retried?.status).toBe("pending");
    const audit = await pool.query<{ action: string }>("select action from audit_logs where target_id = $1 limit 1", [dead.id]);
    expect(audit.rows[0]?.action).toBe("retry_dead_letter");
  });
});
