import { describe, expect, it } from "vitest";
import { buildCharacterReactionRequest, normalizeTokenTipToSupportReceived } from "@cripto-tip/shared";
import { processOutboxBatch } from "../outbox/worker.js";
import { InMemoryRepository } from "../repositories/in-memory.js";
import { buildIrisDeliveryJobsForSupportEvent, createIrisDeliverOutboxHandler } from "./delivery-worker.js";
import { IrisCoreHttpError, MockIrisCoreClient, type IrisDeliveryPayload } from "./core-client.js";

const wallet = "0x1111111111111111111111111111111111111111";

function supportEvent() {
  return normalizeTokenTipToSupportReceived({
    chain_id: 1,
    contract_address: "0x2222222222222222222222222222222222222222",
    tx_hash: "0xiris",
    log_index: 1,
    stream_id: "str_iris",
    character_id: "char_mio",
    iris_user_id: "usr_iris",
    wallet_address: wallet,
    display_name: "Akira",
    amount_raw: "100",
    amount_display: "100 IRIS",
    tier: "medium",
    message: "応援しています",
    moderation_status: "approved",
    created_at: new Date(0).toISOString()
  }, { previous: 10, delta: 8, next: 18 });
}

function firstDelivery(deliveries: IrisDeliveryPayload[]) {
  const delivery = deliveries[0];
  if (!delivery) throw new Error("missing delivery");
  return delivery;
}

async function enqueueDelivery(repo: InMemoryRepository, delivery: IrisDeliveryPayload, maxRetryCount = 3) {
  return repo.enqueueOutbox({
    id: delivery.idempotency_key,
    job_type: "iris.deliver",
    aggregate_type: "iris_delivery",
    aggregate_id: delivery.source_event_id,
    idempotency_key: delivery.idempotency_key,
    payload_json: delivery,
    max_retry_count: maxRetryCount
  });
}

describe("IRIS Core delivery adapter", () => {
  it("delivers support.received, affinity.apply, and memory.write_candidate without wallet address", async () => {
    const repo = new InMemoryRepository();
    const support = supportEvent();
    await repo.createSupportEventIfAbsent(support);
    const client = new MockIrisCoreClient();
    for (const delivery of buildIrisDeliveryJobsForSupportEvent(support)) await enqueueDelivery(repo, delivery);

    await processOutboxBatch({ repository: repo, workerId: "iris-worker", limit: 10, handler: createIrisDeliverOutboxHandler({ repository: repo, client }) });

    expect(client.deliveries.map((item) => item.delivery_type)).toEqual(["support.received", "affinity.apply", "memory.write_candidate"]);
    expect(JSON.stringify(client.deliveries)).not.toContain(wallet);
    expect(repo.outboxEvents.get("iris.deliver:support.received:1:0x2222222222222222222222222222222222222222:0xiris:1")?.status).toBe("completed");
  });

  it("delivers character.reaction.requested without unsafe wording or wallet address", async () => {
    const repo = new InMemoryRepository();
    const request = buildCharacterReactionRequest(supportEvent());
    const client = new MockIrisCoreClient();
    await enqueueDelivery(repo, {
      delivery_type: "character.reaction.requested",
      source_event_id: request.source_event_id,
      idempotency_key: `iris.deliver:reaction:${request.source_event_id}:${request.character_id}`,
      payload: request
    });

    await processOutboxBatch({ repository: repo, workerId: "iris-worker", limit: 1, handler: createIrisDeliverOutboxHandler({ repository: repo, client }) });

    const serialized = JSON.stringify(client.deliveries);
    expect(serialized).not.toContain(wallet);
    expect(serialized).not.toMatch(/token price|profit|investment/i);
    expect(serialized).toContain("must_avoid_crypto_asset_valuation_discussion");
  });

  it("keeps delivery idempotent by outbox idempotency key", async () => {
    const repo = new InMemoryRepository();
    const delivery = firstDelivery(buildIrisDeliveryJobsForSupportEvent(supportEvent()));
    await enqueueDelivery(repo, delivery);
    await enqueueDelivery(repo, delivery);
    expect([...repo.outboxEvents.values()].filter((event) => event.idempotency_key === delivery.idempotency_key)).toHaveLength(1);
  });

  it("retries timeout and 5xx failures with backoff state instead of immediate DLQ", async () => {
    for (const error of [new Error("timeout"), new IrisCoreHttpError(503)]) {
      const repo = new InMemoryRepository();
      const support = supportEvent();
      await repo.createSupportEventIfAbsent(support);
      const delivery = firstDelivery(buildIrisDeliveryJobsForSupportEvent(support));
      await enqueueDelivery(repo, delivery, 5);

      await processOutboxBatch({ repository: repo, workerId: "iris-worker", limit: 1, handler: createIrisDeliverOutboxHandler({ repository: repo, client: new MockIrisCoreClient(error) }), now: new Date("2999-06-03T00:00:00.000Z") });

      const job = repo.outboxEvents.get(delivery.idempotency_key);
      expect(job?.status).toBe("pending");
      expect(job?.retry_count).toBe(1);
      expect(job?.last_error).not.toContain("change-me");
      expect([...repo.deadLetterEvents.values()]).toHaveLength(0);
      expect(repo.supportEventDeliveryStatus.get(delivery.source_event_id)).toBe("retrying");
    }
  });

  it("moves 401 and 403 failures to DLQ immediately without depending on max_retry_count", async () => {
    for (const statusCode of [401, 403]) {
      const repo = new InMemoryRepository();
      const support = supportEvent();
      await repo.createSupportEventIfAbsent(support);
      const delivery = firstDelivery(buildIrisDeliveryJobsForSupportEvent(support));
      await enqueueDelivery(repo, delivery, 5);

      await processOutboxBatch({ repository: repo, workerId: "iris-worker", limit: 1, handler: createIrisDeliverOutboxHandler({ repository: repo, client: new MockIrisCoreClient(new IrisCoreHttpError(statusCode)) }) });

      const job = repo.outboxEvents.get(delivery.idempotency_key);
      expect(job?.status).toBe("dead_lettered");
      expect(job?.retry_count).toBe(0);
      expect([...repo.deadLetterEvents.values()][0]?.job_type).toBe("iris.deliver");
      expect([...repo.deadLetterEvents.values()][0]?.last_error).toContain(String(statusCode));
      expect(repo.supportEventDeliveryStatus.get(delivery.source_event_id)).toBe("failed");
    }
  });

  it("updates delivery status on success and failure", async () => {
    const repo = new InMemoryRepository();
    const support = supportEvent();
    await repo.createSupportEventIfAbsent(support);
    const delivery = firstDelivery(buildIrisDeliveryJobsForSupportEvent(support));
    await enqueueDelivery(repo, delivery);
    await processOutboxBatch({ repository: repo, workerId: "iris-worker", limit: 1, handler: createIrisDeliverOutboxHandler({ repository: repo, client: new MockIrisCoreClient() }) });
    expect(repo.outboxEvents.get(delivery.idempotency_key)?.status).toBe("completed");
    expect(repo.supportEventDeliveryStatus.get(delivery.source_event_id)).toBe("delivered");
  });
});
