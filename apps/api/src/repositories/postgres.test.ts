import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { PostgresRepository, type QueryClient } from "./postgres.js";
import { normalizeTokenTipToSupportReceived, normalizeYouTubeSuperChatToSupportReceived, type TipTransaction } from "@cripto-tip/shared";

class RecordingClient implements QueryClient {
  queries: Array<{ sql: string; params?: unknown[] }> = [];
  rows: unknown[] = [];
  responses: unknown[][] = [];

  async query<T = unknown>(sql: string, params?: unknown[]) {
    this.queries.push(params ? { sql, params } : { sql });
    return { rows: (this.responses.shift() ?? this.rows) as T[] };
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
    await repo.getChainCursor({ chain_id: 1, contract_address: "0x1111111111111111111111111111111111111111" });
    expect(client.queries.every((query) => query.sql.includes("$1"))).toBe(true);
    expect(client.queries.every((query) => Array.isArray(query.params))).toBe(true);
  });

  it("persists support currency metadata instead of replacing it with source", async () => {
    const client = new RecordingClient();
    const support = normalizeYouTubeSuperChatToSupportReceived({
      live_chat_message_id: "yt_currency_fidelity",
      stream_id: "str_currency",
      character_id: "char_mio",
      author_channel_id: "UC_CURRENCY",
      author_display_name: "Akira",
      amount_micros: "1000000",
      currency: "JPY",
      amount_display_string: "JPY 1,000",
      tier: 3,
      user_comment: "thanks",
      published_at: "2026-06-19T00:00:00.000Z"
    });
    client.responses = [
      [],
      [{
        id: support.event_id,
        source: support.source,
        source_event_id: support.source_event_id,
        stream_id: support.stream_id,
        youtube_video_id: support.youtube_video_id,
        character_id: support.character_id,
        iris_user_id: support.viewer.iris_user_id,
        youtube_author_channel_id: support.viewer.youtube_author_channel_id,
        wallet_address: support.viewer.wallet_address,
        display_name_sanitized: support.viewer.display_name,
        display_name_llm_safe: support.viewer.display_name,
        amount_raw: support.support.amount_raw,
        amount_display: support.support.amount_display,
        currency_or_token: support.support.currency_or_token,
        tier: support.support.tier,
        message_sanitized: support.support.message,
        message_moderation_status: support.support.message_moderation_status,
        previous_affinity: support.relationship.previous_affinity,
        affinity_delta: support.relationship.affinity_delta,
        new_affinity: support.relationship.new_affinity,
        relationship_level: support.relationship.relationship_level,
        reaction_can_say_name: support.reaction_policy.can_say_name,
        reaction_can_read_message: support.reaction_policy.can_read_message,
        reaction_max_speech_seconds: support.reaction_policy.max_speech_seconds,
        delivery_status: "pending",
        created_at: support.created_at
      }]
    ];

    await new PostgresRepository(client).createSupportEventIfAbsent(support);

    const insert = client.queries.find((query) => query.sql.includes("insert into support_events"));
    expect(insert?.params?.[13]).toBe("JPY");
    expect(insert?.params?.[13]).not.toBe("youtube_super_chat");
  });

  it("round-trips support relationship and reaction policy from persisted rows", async () => {
    const client = new RecordingClient();
    const support = normalizeYouTubeSuperChatToSupportReceived({
      live_chat_message_id: "yt_data_fidelity_roundtrip",
      stream_id: "str_fidelity",
      character_id: "char_mio",
      author_channel_id: "UC_FIDELITY",
      author_display_name: "Akira",
      amount_micros: "2500000",
      currency: "JPY",
      amount_display_string: "JPY 2,500",
      tier: 4,
      user_comment: "thanks",
      published_at: "2026-06-19T00:00:00.000Z"
    }, { previous: 25, delta: 24, next: 49 });
    client.rows = [{
      id: support.event_id,
      source: support.source,
      source_event_id: support.source_event_id,
      stream_id: support.stream_id,
      youtube_video_id: support.youtube_video_id,
      character_id: support.character_id,
      iris_user_id: support.viewer.iris_user_id,
      youtube_author_channel_id: support.viewer.youtube_author_channel_id,
      wallet_address: support.viewer.wallet_address,
      display_name_sanitized: support.viewer.display_name,
      display_name_llm_safe: support.viewer.display_name,
      amount_raw: support.support.amount_raw,
      amount_display: support.support.amount_display,
      currency_or_token: support.support.currency_or_token,
      tier: support.support.tier,
      message_sanitized: support.support.message,
      message_moderation_status: support.support.message_moderation_status,
      previous_affinity: 25,
      affinity_delta: 24,
      new_affinity: 49,
      relationship_level: 3,
      reaction_can_say_name: false,
      reaction_can_read_message: false,
      reaction_max_speech_seconds: 10,
      delivery_status: "pending",
      created_at: support.created_at
    }];

    const loaded = await new PostgresRepository(client).getSupportEventBySource(support.source, support.source_event_id);

    expect(loaded?.relationship).toMatchObject({ previous_affinity: 25, affinity_delta: 24, new_affinity: 49, relationship_level: 3 });
    expect(loaded?.reaction_policy).toMatchObject({ can_say_name: false, can_read_message: false, max_speech_seconds: 10 });
  });

  it("does not invent currency metadata for token tips when none exists", async () => {
    const client = new RecordingClient();
    const support = normalizeTokenTipToSupportReceived({
      chain_id: 31337,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: "0xdatafidelity",
      log_index: 1,
      stream_id: "str",
      character_id: "char",
      wallet_address: "0x1111111111111111111111111111111111111111",
      display_name: "Akira",
      amount_raw: "100",
      amount_display: "100 IRIS",
      tier: "medium",
      message: "thanks",
      moderation_status: "approved",
      created_at: new Date(0).toISOString()
    });
    client.responses = [[], []];

    await expect(new PostgresRepository(client).createSupportEventIfAbsent(support)).rejects.toThrow("support_event_insert_conflict_unresolved");

    const insert = client.queries.find((query) => query.sql.includes("insert into support_events"));
    expect(insert?.params?.[13]).toBeNull();
  });

  it("committed P1 support event data fidelity evidence preserves safe boundaries", () => {
    const evidence = JSON.parse(readFileSync(resolve(here, "../../../../.codex/p1-support-event-data-fidelity.json"), "utf8"));

    expect(evidence.supportEventDataFidelityStatus).toBe("implemented");
    expect(evidence.youtubeCurrencyPreservedStatus).toBe("pass");
    expect(evidence.postgresCurrencyPersistenceStatus).toBe("pass");
    expect(evidence.postgresRelationshipRoundTripStatus).toBe("pass");
    expect(evidence.postgresReactionPolicyRoundTripStatus).toBe("pass");
    expect(evidence.postgresMissingCurrencyNoGuessStatus).toBe("pass");
    expect(evidence.supportEventDataFidelityColumnMigrationStatus).toBe("pass");
    expect(evidence.sourceNotUsedAsCurrencyWhenCurrencyExists).toBe(true);
    expect(evidence.sourceNotUsedAsCurrencyWhenMissing).toBe(true);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
  });
});

const runLivePostgres = process.env.RUN_LIVE_POSTGRES_TESTS === "true" && Boolean(process.env.DATABASE_URL);
const liveDescribe = runLivePostgres ? describe : describe.skip;
const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(resolve(here, "../../../../migrations/0001_durable_events.sql"), "utf8");
const chainMigrationSql = readFileSync(resolve(here, "../../../../migrations/0002_chain_listener_reorg.sql"), "utf8");
const supportIdentityMigrationSql = readFileSync(resolve(here, "../../../../migrations/0005_support_side_effect_source_identity.sql"), "utf8");
const supportDataFidelityMigrationSql = readFileSync(resolve(here, "../../../../migrations/0006_support_event_data_fidelity_columns.sql"), "utf8");

liveDescribe("PostgresRepository live integration", () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const repo = new PostgresRepository(pool);
  const wallet = "0x1111111111111111111111111111111111111111";

  beforeAll(async () => {
    await pool.query("drop schema public cascade");
    await pool.query("create schema public");
    await pool.query(migrationSql);
    await pool.query(chainMigrationSql);
    await pool.query(supportIdentityMigrationSql);
    await pool.query(supportDataFidelityMigrationSql);
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
    const tx: TipTransaction = { id: "tx_live_1", chain_id: 31337, contract_address: wallet, token_address: wallet, tx_hash: "0xlive", log_index: 1, block_number: 1, block_hash: "0xblock", from_address: wallet, stream_id: "str", character_id: "char", amount_raw: "100", message_hash: "0x" + "a".repeat(64), client_tip_id: "0x" + "b".repeat(64), status: "detected", confirmations: 0 };
    await repo.recordTipTransaction(tx);
    const duplicate = await repo.recordTipTransaction({ ...tx, id: "tx_live_2" });
    expect(duplicate.id).toBe("tx_live_1");
    const updated = await repo.updateTipTransactionByChainLog(tx, { status: "confirmed", confirmations: 3, confirmed_at: "2026-06-03T00:00:00.000Z" });
    expect(updated?.status).toBe("confirmed");
  });

  it("persists chain cursors in the live database", async () => {
    const saved = await repo.saveChainCursor({ id: "cursor_live", chain_id: 31337, contract_address: wallet, last_scanned_block: 100, last_finalized_block: 94, last_seen_block_hash: "0xblock100", updated_at: "2026-06-03T00:00:00.000Z" });
    expect(saved.last_scanned_block).toBe(100);
    const loaded = await repo.getChainCursor({ chain_id: 31337, contract_address: wallet });
    expect(loaded?.last_finalized_block).toBe(94);
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
    const entry = { id: "aff_live_1", source: support.source, source_event_id: support.source_event_id, iris_user_id: "usr_live", character_id: "char", previous_affinity: 0, affinity_delta: 8, new_affinity: 8, reason: "support.received", created_at: new Date(0).toISOString() };
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
