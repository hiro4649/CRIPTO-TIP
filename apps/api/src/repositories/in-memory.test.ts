import { describe, expect, it } from "vitest";
import { createPublicId, normalizeTokenTipToSupportReceived, type TipTransaction } from "@cripto-tip/shared";
import { InMemoryRepository } from "./in-memory.js";

const wallet = "0x1111111111111111111111111111111111111111";

function support(txHash = "0xrepo") {
  return normalizeTokenTipToSupportReceived({
    chain_id: 1,
    contract_address: "0x2222222222222222222222222222222222222222",
    tx_hash: txHash,
    log_index: 1,
    stream_id: "str",
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
}

describe("InMemoryRepository", () => {
  it("preserves support event idempotency", async () => {
    const repo = new InMemoryRepository();
    const event = support();
    expect((await repo.createSupportEventIfAbsent(event)).created).toBe(true);
    expect((await repo.createSupportEventIfAbsent(event)).created).toBe(false);
  });

  it("duplicate support event does not double-apply affinity", async () => {
    const repo = new InMemoryRepository();
    const event = support();
    await repo.createSupportEventIfAbsent(event);
    await repo.applyAffinityIfAbsent({ id: createPublicId("aff"), source_event_id: event.source_event_id, iris_user_id: "usr", character_id: "char", previous_affinity: 0, affinity_delta: 8, new_affinity: 8, reason: "support.received", created_at: new Date().toISOString() });
    const second = await repo.applyAffinityIfAbsent({ id: createPublicId("aff"), source_event_id: event.source_event_id, iris_user_id: "usr", character_id: "char", previous_affinity: 8, affinity_delta: 8, new_affinity: 16, reason: "support.received", created_at: new Date().toISOString() });
    expect(second.created).toBe(false);
    expect(repo.affinityByUser.get("usr")).toBe(8);
  });

  it("duplicate chain log does not create duplicate tip transaction", async () => {
    const repo = new InMemoryRepository();
    const tx: TipTransaction = { id: "tx1", chain_id: 1, contract_address: wallet, token_address: wallet, tx_hash: "0xhash", log_index: 1, block_number: 1, from_address: wallet, stream_id: "str", character_id: "char", amount_raw: "100", message_hash: "0x" + "a".repeat(64), client_tip_id: "0x" + "b".repeat(64), status: "detected", confirmations: 0 };
    await repo.recordTipTransaction(tx);
    await repo.recordTipTransaction({ ...tx, id: "tx2" });
    expect(repo.tipTransactions.size).toBe(1);
  });

  it("updates pending chain transactions and persists chain cursors", async () => {
    const repo = new InMemoryRepository();
    const tx: TipTransaction = { id: "tx_cursor", chain_id: 1, contract_address: wallet, token_address: wallet, tx_hash: "0xhash2", log_index: 2, block_number: 9, block_hash: "0xblock", from_address: wallet, stream_id: "str", character_id: "char", amount_raw: "100", message_hash: "0x" + "a".repeat(64), client_tip_id: "0x" + "b".repeat(64), status: "pending_confirmation", confirmations: 0 };
    await repo.recordTipTransaction(tx);
    expect(await repo.listPendingTipTransactions(1, wallet)).toHaveLength(1);
    const updated = await repo.updateTipTransactionByChainLog(tx, { status: "confirmed", confirmations: 3, confirmed_at: "2026-06-03T00:00:00.000Z" });
    expect(updated?.status).toBe("confirmed");
    await repo.saveChainCursor({ id: "cursor1", chain_id: 1, contract_address: wallet, last_scanned_block: 12, last_finalized_block: 9, last_seen_block_hash: "0xblock12", updated_at: "2026-06-03T00:00:00.000Z" });
    expect(await repo.getChainCursor({ chain_id: 1, contract_address: wallet })).toEqual(expect.objectContaining({ last_scanned_block: 12 }));
  });

  it("outbox retry increments retry_count and moves to DLQ after max retry", async () => {
    const repo = new InMemoryRepository();
    const job = await repo.enqueueOutbox({ id: "job1", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "iris.deliver:evt", payload_json: {}, max_retry_count: 2 });
    await repo.failOutboxJob(job.id, "first");
    expect(repo.outboxEvents.get(job.id)?.retry_count).toBe(1);
    const dead = await repo.failOutboxJob(job.id, "second");
    expect(dead?.job_type).toBe("iris.deliver");
    expect(repo.outboxEvents.get(job.id)?.status).toBe("dead_lettered");
  });

  it("worker claim does not claim completed jobs and respects locked_at", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "completed", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt1", idempotency_key: "done", payload_json: {}, status: "completed" });
    await repo.enqueueOutbox({ id: "locked", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt2", idempotency_key: "locked", payload_json: {}, locked_at: new Date().toISOString() });
    await repo.enqueueOutbox({ id: "pending", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt3", idempotency_key: "pending", payload_json: {} });
    const jobs = await repo.claimOutboxJobs("worker", 10);
    expect(jobs.map((job) => job.id)).toEqual(["pending"]);
  });

  it("reclaims stale locks but preserves active locks", async () => {
    const repo = new InMemoryRepository();
    const now = new Date("2026-06-03T00:10:00.000Z");
    await repo.enqueueOutbox({ id: "stale", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt1", idempotency_key: "stale", payload_json: {}, status: "processing", locked_at: "2026-06-03T00:00:00.000Z", locked_by: "old-worker" });
    await repo.enqueueOutbox({ id: "active", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt2", idempotency_key: "active", payload_json: {}, status: "processing", locked_at: "2026-06-03T00:09:30.000Z", locked_by: "active-worker" });
    const reclaimed = await repo.reclaimStaleOutboxJobs("reclaimer", new Date("2026-06-03T00:05:00.000Z"), 10, now);
    expect(reclaimed.map((job) => job.id)).toEqual(["stale"]);
    expect(repo.outboxEvents.get("stale")?.status).toBe("pending");
    expect(repo.outboxEvents.get("stale")?.locked_at).toBeUndefined();
    expect(repo.outboxEvents.get("active")?.status).toBe("processing");
  });

  it("requeues dead letter jobs and writes audit log", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "job-dlq", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "job-dlq", payload_json: {}, max_retry_count: 1 });
    const dead = await repo.failOutboxJob("job-dlq", "terminal failure");
    if (!dead || !("original_event_id" in dead)) throw new Error("missing dead letter");
    const retried = await repo.retryDeadLetter(dead.id, "admin-1");
    expect(retried?.status).toBe("pending");
    expect(retried?.retry_count).toBe(0);
    expect(repo.auditLogs).toContainEqual(expect.objectContaining({ action: "retry_dead_letter", target_id: dead.id }));
  });

  it("audit log repository can write admin action", async () => {
    const repo = new InMemoryRepository();
    await repo.writeAuditLog({ actor_type: "admin", action: "reject_tip", target_type: "support_event", target_id: "evt" });
    expect(repo.auditLogs).toHaveLength(1);
  });
});
