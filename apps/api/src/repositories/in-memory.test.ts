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

  it("audit log repository can write admin action", async () => {
    const repo = new InMemoryRepository();
    await repo.writeAuditLog({ actor_type: "admin", action: "reject_tip", target_type: "support_event", target_id: "evt" });
    expect(repo.auditLogs).toHaveLength(1);
  });
});
