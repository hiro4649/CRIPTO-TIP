import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "../repositories/in-memory.js";
import { processOutboxBatch, reclaimStaleOutboxLocks, TerminalOutboxError } from "./worker.js";

describe("outbox worker boundary", () => {
  it("processes claimed jobs and completes them", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "job", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "job", payload_json: {} });
    const count = await processOutboxBatch({ repository: repo, workerId: "worker", limit: 1, handler: async () => undefined });
    expect(count).toBe(1);
    expect(repo.outboxEvents.get("job")?.status).toBe("completed");
  });

  it("reclaims stale locks through the worker boundary", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "stale-worker", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "stale-worker", payload_json: {}, status: "processing", locked_at: "2026-06-03T00:00:00.000Z", locked_by: "old-worker" });
    const reclaimed = await reclaimStaleOutboxLocks({ repository: repo, workerId: "new-worker", staleLockMs: 60_000, limit: 5, now: new Date("2026-06-03T00:05:00.000Z") });
    expect(reclaimed.map((job) => job.id)).toEqual(["stale-worker"]);
    expect(repo.outboxEvents.get("stale-worker")?.status).toBe("pending");
  });

  it("moves terminal handler errors to DLQ without completing or retrying", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "terminal", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "terminal", payload_json: {}, max_retry_count: 5 });
    await processOutboxBatch({ repository: repo, workerId: "worker", limit: 1, handler: async () => { throw new TerminalOutboxError("terminal auth failure"); } });

    expect(repo.outboxEvents.get("terminal")?.status).toBe("dead_lettered");
    expect(repo.outboxEvents.get("terminal")?.retry_count).toBe(0);
    expect([...repo.deadLetterEvents.values()]).toHaveLength(1);
    expect([...repo.deadLetterEvents.values()][0]?.last_error).toContain("terminal auth failure");
  });
});
