import { CharacterReactionRequestSchema, SupportReceivedSchema } from "@cripto-tip/shared";
import { TerminalOutboxError, type OutboxHandler } from "../outbox/worker.js";
import type { CriptoTipRepository, OutboxEvent } from "../repositories/types.js";
import {
  buildAffinityDelivery,
  buildMemoryCandidateDelivery,
  buildReactionDelivery,
  buildSupportReceivedDelivery,
  IrisCoreHttpError,
  type IrisCoreClient,
  type IrisDeliveryPayload,
  type IrisDeliveryType
} from "./core-client.js";

export function isTerminalIrisDeliveryError(error: unknown) {
  return error instanceof IrisCoreHttpError && (error.statusCode === 401 || error.statusCode === 403);
}

export function createIrisDeliverOutboxHandler(args: { repository: CriptoTipRepository; client: IrisCoreClient }): OutboxHandler {
  return async (job) => {
    if (job.job_type !== "iris.deliver") return;
    const delivery = parseIrisDeliveryJob(job);
    try {
      await args.client.deliver(delivery);
      await args.repository.updateSupportEventDeliveryStatus(delivery.source_event_id, "delivered");
    } catch (error) {
      const terminal = isTerminalIrisDeliveryError(error);
      await args.repository.updateSupportEventDeliveryStatus(delivery.source_event_id, terminal ? "failed" : "retrying");
      if (terminal) throw new TerminalOutboxError(error instanceof Error ? error.message : "terminal iris delivery error");
      throw error;
    }
  };
}

export function parseIrisDeliveryJob(job: OutboxEvent): IrisDeliveryPayload {
  const payload = job.payload_json;
  if (isDeliveryPayload(payload)) return normalizeDeliveryPayload(payload);
  if (job.aggregate_type === "support_event") {
    const support = SupportReceivedSchema.parse(payload);
    return buildSupportReceivedDelivery(support);
  }
  if (job.aggregate_type === "reaction_request") {
    const request = CharacterReactionRequestSchema.parse(payload);
    return buildReactionDelivery(request);
  }
  throw new Error("unsupported iris.deliver payload");
}

function normalizeDeliveryPayload(delivery: IrisDeliveryPayload): IrisDeliveryPayload {
  if (delivery.delivery_type !== "character.reaction.requested") return delivery;
  return buildReactionDelivery(CharacterReactionRequestSchema.parse(delivery.payload));
}

export function buildIrisDeliveryJobsForSupportEvent(event: unknown) {
  const support = SupportReceivedSchema.parse(event);
  const deliveries: IrisDeliveryPayload[] = [buildSupportReceivedDelivery(support)];
  if (support.relationship.affinity_delta > 0 && support.viewer.iris_user_id) deliveries.push(buildAffinityDelivery(support));
  if (support.support.message.trim() && support.viewer.iris_user_id) deliveries.push(buildMemoryCandidateDelivery(support));
  return deliveries;
}

function isDeliveryPayload(value: unknown): value is IrisDeliveryPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { delivery_type?: unknown; source_event_id?: unknown; idempotency_key?: unknown; payload?: unknown };
  return isDeliveryType(candidate.delivery_type) && typeof candidate.source_event_id === "string" && typeof candidate.idempotency_key === "string" && "payload" in candidate;
}

function isDeliveryType(value: unknown): value is IrisDeliveryType {
  return value === "support.received" || value === "character.reaction.requested" || value === "affinity.apply" || value === "memory.write_candidate";
}
