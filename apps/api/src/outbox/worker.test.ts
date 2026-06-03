import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "../repositories/in-memory.js";
import { processOutboxBatch } from "./worker.js";

describe("outbox worker boundary", () => {
  it("processes claimed jobs and completes them", async () => {
    const repo = new InMemoryRepository();
    await repo.enqueueOutbox({ id: "job", job_type: "iris.deliver", aggregate_type: "support_event", aggregate_id: "evt", idempotency_key: "job", payload_json: {} });
    const count = await processOutboxBatch({ repository: repo, workerId: "worker", limit: 1, handler: async () => undefined });
    expect(count).toBe(1);
    expect(repo.outboxEvents.get("job")?.status).toBe("completed");
  });
});
