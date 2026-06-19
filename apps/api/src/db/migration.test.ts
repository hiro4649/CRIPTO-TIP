import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(resolve(here, "../../../../migrations/0001_durable_events.sql"), "utf8").toLowerCase();
const chainSql = readFileSync(resolve(here, "../../../../migrations/0002_chain_listener_reorg.sql"), "utf8").toLowerCase();
const supportIdentitySql = readFileSync(resolve(here, "../../../../migrations/0005_support_side_effect_source_identity.sql"), "utf8").toLowerCase();
const supportDataFidelitySql = readFileSync(resolve(here, "../../../../migrations/0006_support_event_data_fidelity_columns.sql"), "utf8").toLowerCase();

describe("migration 0001", () => {
  it("contains required tables", () => {
    for (const table of ["live_sessions", "viewer_identities", "wallet_links", "youtube_viewer_links", "tip_intents", "tip_transactions", "support_events", "affinity_ledger", "overlay_events", "reaction_requests", "outbox_events", "dead_letter_events", "audit_logs"]) {
      expect(sql).toContain(`create table ${table}`);
    }
  });

  it("contains required unique constraints", () => {
    expect(sql).toContain("unique(chain_id, contract_address, tx_hash, log_index)");
    expect(sql).toContain("unique(source, source_event_id)");
    expect(sql).toContain("unique(source_event_id, iris_user_id, character_id)");
    expect(sql).toContain("unique(source_event_id, stream_id)");
    expect(sql).toContain("unique(source_event_id, character_id)");
    expect(sql).toContain("idempotency_key text not null unique");
    expect(sql).toContain("client_tip_id text not null unique");
    expect(sql).toContain("normalized_wallet_address text not null unique");
  });
});

describe("migration 0002", () => {
  it("adds chain cursor persistence for listener catch-up", () => {
    expect(chainSql).toContain("create table chain_cursors");
    expect(chainSql).toContain("unique(chain_id, contract_address)");
    expect(chainSql).toContain("last_scanned_block bigint not null");
    expect(chainSql).toContain("last_finalized_block bigint not null");
  });

  it("indexes pending transaction confirmation scans", () => {
    expect(chainSql).toContain("tip_transactions_confirmation_idx");
    expect(chainSql).toContain("chain_id, contract_address, status, block_number");
  });
});

describe("migration 0005", () => {
  it("makes support side-effect identity source-aware without destructive data operations", () => {
    expect(supportIdentitySql).toContain("alter table affinity_ledger add column if not exists source text");
    expect(supportIdentitySql).toContain("alter table overlay_events add column if not exists source text");
    expect(supportIdentitySql).toContain("alter table reaction_requests add column if not exists source text");
    expect(supportIdentitySql).toContain("unique(source, source_event_id, iris_user_id, character_id)");
    expect(supportIdentitySql).toContain("unique(source, source_event_id, stream_id)");
    expect(supportIdentitySql).toContain("unique(source, source_event_id, character_id)");
    expect(supportIdentitySql).not.toContain("drop table");
    expect(supportIdentitySql).not.toContain("truncate");
  });
});

describe("migration 0006", () => {
  it("adds support event data-fidelity columns without destructive data operations", () => {
    for (const column of ["previous_affinity", "new_affinity", "relationship_level", "reaction_can_say_name", "reaction_can_read_message", "reaction_max_speech_seconds"]) {
      expect(supportDataFidelitySql).toContain(`alter table support_events add column if not exists ${column}`);
    }
    expect(supportDataFidelitySql).toContain("coalesce(previous_affinity, 0)");
    expect(supportDataFidelitySql).toContain("coalesce(new_affinity, affinity_delta)");
    expect(supportDataFidelitySql).not.toContain("drop table");
    expect(supportDataFidelitySql).not.toContain("truncate");
  });
});
