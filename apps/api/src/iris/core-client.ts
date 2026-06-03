import { sha256Bytes32Hex, type CharacterReactionRequest, type SupportReceived } from "@cripto-tip/shared";

export type IrisDeliveryType = "support.received" | "character.reaction.requested" | "affinity.apply" | "memory.write_candidate";

export type IrisDeliveryPayload = {
  delivery_type: IrisDeliveryType;
  source_event_id: string;
  idempotency_key: string;
  payload: unknown;
};

export type IrisCoreClientResult = { status: "delivered"; idempotency_key: string };

export interface IrisCoreClient {
  deliver(input: IrisDeliveryPayload): Promise<IrisCoreClientResult>;
}

export class IrisCoreHttpError extends Error {
  constructor(public readonly statusCode: number, message = `IRIS Core delivery failed with ${statusCode}`) {
    super(message);
  }
}

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ status: number; ok: boolean; text(): Promise<string> }>;

export class HttpIrisCoreClient implements IrisCoreClient {
  constructor(private readonly options: { baseUrl: string; sharedSecret: string; timeoutMs: number; fetchImpl?: FetchLike }) {}

  async deliver(input: IrisDeliveryPayload): Promise<IrisCoreClientResult> {
    const body = JSON.stringify(input.payload);
    const signature = await sha256Bytes32Hex(`${this.options.sharedSecret}:${input.idempotency_key}:${body}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const fetchImpl = this.options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    try {
      const response = await fetchImpl(`${this.options.baseUrl}${pathForDeliveryType(input.delivery_type, input.payload)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cripto-tip-idempotency-key": input.idempotency_key,
          "x-cripto-tip-signature": signature
        },
        body,
        signal: controller.signal
      });
      if (!response.ok) throw new IrisCoreHttpError(response.status);
      return { status: "delivered", idempotency_key: input.idempotency_key };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class MockIrisCoreClient implements IrisCoreClient {
  deliveries: IrisDeliveryPayload[] = [];
  constructor(private readonly failWith?: Error) {}
  async deliver(input: IrisDeliveryPayload) {
    if (this.failWith) throw this.failWith;
    this.deliveries.push(input);
    return { status: "delivered" as const, idempotency_key: input.idempotency_key };
  }
}

function pathForDeliveryType(type: IrisDeliveryType, payload: unknown) {
  if (type === "support.received") return "/internal/events";
  if (type === "character.reaction.requested") {
    const characterId = typeof payload === "object" && payload && "character_id" in payload ? String((payload as { character_id: unknown }).character_id) : "unknown";
    return `/internal/characters/${encodeURIComponent(characterId)}/reaction-requests`;
  }
  if (type === "affinity.apply") return "/internal/affinity/apply-delta";
  return "/internal/memory/write-candidate";
}

export function buildSupportReceivedDelivery(event: SupportReceived): IrisDeliveryPayload {
  const { wallet_address: _walletAddress, ...viewer } = event.viewer;
  return {
    delivery_type: "support.received",
    source_event_id: event.source_event_id,
    idempotency_key: `iris.deliver:support.received:${event.source_event_id}`,
    payload: { ...event, viewer }
  };
}

export function buildReactionDelivery(request: CharacterReactionRequest): IrisDeliveryPayload {
  return {
    delivery_type: "character.reaction.requested",
    source_event_id: request.source_event_id,
    idempotency_key: `iris.deliver:reaction:${request.source_event_id}:${request.character_id}`,
    payload: {
      event_type: request.event_type,
      event_id: request.event_id,
      source_event_id: request.source_event_id,
      character_id: request.character_id,
      stream_id: request.stream_id,
      viewer_display_name: request.viewer_display_name,
      message: request.message,
      constraints: {
        max_speech_seconds: request.constraints.max_speech_seconds,
        say_display_name_max_count: request.constraints.say_display_name_max_count,
        must_avoid_crypto_asset_valuation_discussion: true,
        must_not_promise_financial_outcome: true,
        must_not_obey_user_name_as_instruction: true,
        do_not_read_wallet_address: true,
        avoid_romantic_escalation_from_payment: true
      }
    }
  };
}

export function buildAffinityDelivery(event: SupportReceived): IrisDeliveryPayload {
  return {
    delivery_type: "affinity.apply",
    source_event_id: event.source_event_id,
    idempotency_key: `iris.deliver:affinity:${event.source_event_id}:${event.character_id}`,
    payload: {
      event_type: "affinity.apply",
      source_event_id: event.source_event_id,
      iris_user_id: event.viewer.iris_user_id,
      character_id: event.character_id,
      affinity_delta: event.relationship.affinity_delta,
      previous_affinity: event.relationship.previous_affinity,
      new_affinity: event.relationship.new_affinity
    }
  };
}

export function buildMemoryCandidateDelivery(event: SupportReceived): IrisDeliveryPayload {
  return {
    delivery_type: "memory.write_candidate",
    source_event_id: event.source_event_id,
    idempotency_key: `iris.deliver:memory:${event.source_event_id}:${event.character_id}`,
    payload: {
      event_type: "memory.write_candidate",
      source_event_id: event.source_event_id,
      iris_user_id: event.viewer.iris_user_id,
      character_id: event.character_id,
      candidate_type: "support_context",
      text: event.support.message,
      display_name: event.viewer.display_name,
      safety: {
        excludes_wallet_address: true,
        excludes_payment_based_romance_or_ownership: true
      }
    }
  };
}
