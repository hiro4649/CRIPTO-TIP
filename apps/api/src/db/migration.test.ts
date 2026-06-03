import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(resolve(here, "../../../../migrations/0001_durable_events.sql"), "utf8").toLowerCase();

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
