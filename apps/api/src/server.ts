import Fastify, { type FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { z } from "zod";
import {
  buildCharacterReactionRequest,
  buildOverlayTipAlert,
  calculateAffinityDelta,
  canApplyAffinity,
  canEmitOverlay,
  canRequestAiReaction,
  createIdempotencyKeyForChainLog,
  createPublicId,
  moderateTipMessage,
  normalizeTokenTipToSupportReceived,
  sanitizeDisplayName,
  sanitizeMessage,
  sha256Bytes32Hex,
  stableId,
  TipIntentSchema,
  type LiveSession,
  type OverlayTipAlert,
  type SupportReceived,
  type TipIntent
} from "@cripto-tip/shared";

const ADMIN_TOKEN = process.env.MOCK_ADMIN_TOKEN ?? "change-me-admin-token";
const INTERNAL_TOKEN = process.env.MOCK_INTERNAL_TOKEN ?? "change-me-internal-token";
const OVERLAY_TOKEN = process.env.MOCK_OVERLAY_TOKEN ?? "change-me-overlay-token";
const PORT = Number(process.env.API_PORT ?? 4000);

type Store = {
  liveSessions: Map<string, LiveSession>;
  tipIntents: Map<string, TipIntent>;
  supportEvents: Map<string, SupportReceived>;
  overlayClients: Map<string, Set<{ send: (payload: string) => void }>>;
  recentTipsByWallet: Map<string, number>;
  affinityByUser: Map<string, number>;
};

export const store: Store = {
  liveSessions: new Map(),
  tipIntents: new Map(),
  supportEvents: new Map(),
  overlayClients: new Map(),
  recentTipsByWallet: new Map(),
  affinityByUser: new Map()
};

function requireBearer(req: FastifyRequest, expected: string): boolean {
  return req.headers.authorization === `Bearer ${expected}`;
}

function emitOverlay(alert: OverlayTipAlert) {
  const clients = store.overlayClients.get(alert.stream_id);
  if (!clients) return;
  for (const client of clients) client.send(JSON.stringify(alert));
}

export function isOverlayTokenValid(token: string | undefined): boolean {
  return token === OVERLAY_TOKEN;
}

function publicTipIntent(intent: TipIntent) {
  return {
    id: intent.id,
    stream_id: intent.stream_id,
    character_id: intent.character_id,
    display_name: intent.display_name_sanitized,
    message: intent.message_sanitized,
    amount_display: intent.amount_display,
    tier: intent.tier,
    moderation_status: intent.moderation_status,
    created_at: intent.created_at
  };
}

const TipIntentRequestSchema = z.object({
  iris_user_id: z.string().default("usr_mock"),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  display_name: z.string().min(1),
  message: z.string().default(""),
  amount_raw: z.string(),
  amount_display: z.string(),
  tier: z.enum(["small", "medium", "large", "high"])
});

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(websocket);

  app.get("/health", async () => ({ ok: true, service: "cripto-tip-api" }));

  app.get("/api/live/:streamId", async (req) => {
    const params = z.object({ streamId: z.string() }).parse(req.params);
    const existing = store.liveSessions.get(params.streamId);
    if (existing) return existing;
    const session: LiveSession = {
      id: params.streamId,
      youtube_video_id: "mock-youtube-video",
      youtube_channel_id: "mock-channel",
      character_id: "char_mio",
      title: "IRIS LIVE mock session",
      status: "live",
      companion_url: `/live/${params.streamId}`,
      overlay_url: `/overlay/${params.streamId}`,
      created_at: new Date().toISOString()
    };
    store.liveSessions.set(params.streamId, session);
    return session;
  });

  app.post("/api/wallet/nonce", async (req) => {
    const body = z.object({ wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).parse(req.body);
    return { nonce: createPublicId("nonce"), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
  });

  app.post("/api/wallet/verify", async (req) => {
    z.object({ wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), nonce: z.string(), signature: z.string().min(1) }).parse(req.body);
    return { iris_user_id: "usr_mock", verified: true };
  });

  app.post("/api/live/:streamId/tip-intents", async (req) => {
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    const body = TipIntentRequestSchema.parse(req.body);
    const displayName = sanitizeDisplayName(body.display_name);
    const message = sanitizeMessage(body.message);
    const recentTipCount = body.wallet_address ? store.recentTipsByWallet.get(body.wallet_address) ?? 0 : 0;
    const moderation = moderateTipMessage({ displayName: body.display_name, message: body.message, amountRaw: body.amount_raw, recentTipCount, isNewWallet: recentTipCount === 0 });
    const id = createPublicId("tipi");
    const clientTipSeed = `${streamId}:${body.iris_user_id}:${id}`;
    const tipIntent = TipIntentSchema.parse({
      id,
      stream_id: streamId,
      character_id: "char_mio",
      iris_user_id: body.iris_user_id,
      wallet_address: body.wallet_address,
      display_name_raw: body.display_name,
      display_name_sanitized: displayName.sanitized,
      display_name_llm_safe: displayName.llmSafe,
      message_raw: body.message,
      message_sanitized: message,
      amount_raw: body.amount_raw,
      amount_display: body.amount_display,
      tier: body.tier,
      message_hash: await sha256Bytes32Hex(message),
      client_tip_id: await sha256Bytes32Hex(clientTipSeed),
      moderation_status: moderation.status,
      created_at: new Date().toISOString()
    });
    store.tipIntents.set(id, tipIntent);
    if (body.wallet_address) store.recentTipsByWallet.set(body.wallet_address, recentTipCount + 1);
    return { tip_intent: publicTipIntent(tipIntent), moderation };
  });

  app.get("/api/tip-intents/:tipIntentId", async (req) => {
    const { tipIntentId } = z.object({ tipIntentId: z.string() }).parse(req.params);
    const intent = store.tipIntents.get(tipIntentId);
    return intent ? publicTipIntent(intent) : { error: "not_found" };
  });

  app.post("/internal/events", async (req, reply) => {
    if (!requireBearer(req, INTERNAL_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const body = z.object({ tip_intent_id: z.string(), tx_hash: z.string().default("0xmock"), log_index: z.number().int().default(0) }).parse(req.body);
    const intent = store.tipIntents.get(body.tip_intent_id);
    if (!intent) return reply.code(404).send({ error: "tip_intent_not_found" });
    const source_event_id = createIdempotencyKeyForChainLog({
      chain_id: 31337,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: body.tx_hash,
      log_index: body.log_index
    });
    const supportKey = `iris_token_tip:${source_event_id}`;
    const existing = store.supportEvents.get(supportKey);
    if (existing) {
      return { support_event: existing, duplicate: true };
    }
    if (intent.moderation_status === "hold") return { status: "hold", reason: "admin_approval_required" };
    if (intent.moderation_status === "rejected" || intent.moderation_status === "shadow_ignored") return { status: intent.moderation_status };
    const previous = store.affinityByUser.get(intent.iris_user_id) ?? 0;
    const affinity = canApplyAffinity(intent.moderation_status) ? calculateAffinityDelta({ tier: intent.tier, previous, dailyUsed: 0, streamUsed: 0 }) : { previous, delta: 0, next: previous };
    const support = normalizeTokenTipToSupportReceived({
      chain_id: 31337,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: body.tx_hash,
      log_index: body.log_index,
      stream_id: intent.stream_id,
      character_id: intent.character_id,
      iris_user_id: intent.iris_user_id,
      wallet_address: intent.wallet_address ?? "0x1111111111111111111111111111111111111111",
      display_name: intent.display_name_llm_safe,
      amount_raw: intent.amount_raw,
      amount_display: intent.amount_display,
      tier: intent.tier,
      message: intent.message_sanitized,
      moderation_status: intent.moderation_status,
      created_at: new Date().toISOString()
    }, { previous: affinity.previous, delta: affinity.delta, next: affinity.next });
    store.supportEvents.set(supportKey, support);
    if (canApplyAffinity(intent.moderation_status)) store.affinityByUser.set(intent.iris_user_id, affinity.next);
    const overlay = canEmitOverlay(intent.moderation_status) ? buildOverlayTipAlert(support) : undefined;
    if (overlay) {
      emitOverlay(overlay);
    }
    return {
      support_event: support,
      character_reaction_request: canRequestAiReaction(intent.moderation_status) ? buildCharacterReactionRequest(support) : undefined,
      overlay
    };
  });

  app.get("/admin/live-sessions/:streamId/tips", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    return [...store.supportEvents.values()].filter((event) => event.stream_id === streamId);
  });

  app.post("/admin/tips/:supportEventId/approve", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    return { status: "approved", audit_log: "mock-admin-approve" };
  });

  app.post("/admin/tips/:supportEventId/reject", async (req, reply) => {
    if (!requireBearer(req, ADMIN_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
    return { status: "rejected", audit_log: "mock-admin-reject" };
  });

  app.get("/overlay/:streamId/ws", { websocket: true }, (socket, req) => {
    const { streamId } = z.object({ streamId: z.string() }).parse(req.params);
    const query = z.object({ token: z.string().optional() }).parse(req.query);
    if (!isOverlayTokenValid(query.token)) {
      socket.close(1008, "invalid overlay token");
      return;
    }
    const client = { send: (payload: string) => socket.send(payload) };
    const clients = store.overlayClients.get(streamId) ?? new Set();
    clients.add(client);
    store.overlayClients.set(streamId, clients);
    socket.on("close", () => clients.delete(client));
  });

  return app;
}

if (process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") {
  const app = buildServer();
  app.listen({ port: PORT, host: "0.0.0.0" }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
