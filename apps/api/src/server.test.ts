import { beforeEach, describe, expect, it } from "vitest";
import { buildServer, isOverlayTokenValid, store } from "./server.js";

describe("api", () => {
  const wallet = "0x1111111111111111111111111111111111111111";

  beforeEach(() => {
    store.liveSessions.clear();
    store.tipIntents.clear();
    store.supportEvents.clear();
    store.overlayClients.clear();
    store.recentTipsByWallet.clear();
    store.affinityByUser.clear();
  });

  it("requires admin auth for admin mutation routes", async () => {
    const app = buildServer();
    await app.ready();
    const res = await app.inject({ method: "POST", url: "/admin/tips/evt/approve" });
    expect(res.statusCode).toBe(401);
    await app.close();
  }, 20_000);

  it("creates tip intent and support.received mock pipeline", async () => {
    const app = buildServer();
    await app.ready();
    const intent = await app.inject({
      method: "POST",
      url: "/api/live/str_1/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "応援しています", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    expect(intent.statusCode).toBe(200);
    const id = intent.json().tip_intent.id;
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: id, tx_hash: "0xtx", log_index: 1 } });
    expect(event.statusCode).toBe(200);
    expect(event.json().support_event.event_type).toBe("support.received");
    expect(JSON.stringify(event.json().character_reaction_request)).not.toContain(wallet);
    await app.close();
  }, 20_000);

  it("public tip intent status does not expose wallet address or raw message", async () => {
    const app = buildServer();
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_public/tip-intents",
      payload: { wallet_address: wallet, display_name: "RawName", message: "raw message", amount_raw: "100", amount_display: "100 IRIS", tier: "small" }
    });
    const id = created.json().tip_intent.id;
    const fetched = await app.inject({ method: "GET", url: `/api/tip-intents/${id}` });
    const body = fetched.json();
    expect(body.wallet_address).toBeUndefined();
    expect(body.display_name_raw).toBeUndefined();
    expect(body.message_raw).toBeUndefined();
    expect(body.message_hash).toBeUndefined();
    expect(body.client_tip_id).toBeUndefined();
    await app.close();
  }, 20_000);

  it("duplicate internal events do not double-apply affinity or emit second overlay/reaction", async () => {
    const app = buildServer();
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_dup/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "thanks", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    const id = created.json().tip_intent.id;
    const first = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: id, tx_hash: "0xdup", log_index: 1 } });
    const affinityAfterFirst = store.affinityByUser.get("usr_mock");
    const second = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: id, tx_hash: "0xdup", log_index: 1 } });
    expect(second.json().duplicate).toBe(true);
    expect(store.affinityByUser.get("usr_mock")).toBe(affinityAfterFirst);
    expect(second.json().overlay).toBeUndefined();
    expect(second.json().character_reaction_request).toBeUndefined();
    await app.close();
  }, 20_000);

  it("hold tip does not emit overlay or reaction before approval", async () => {
    const app = buildServer();
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_hold/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "https://example.test", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: created.json().tip_intent.id, tx_hash: "0xhold", log_index: 1 } });
    expect(event.json().status).toBe("hold");
    expect(event.json().overlay).toBeUndefined();
    expect(event.json().character_reaction_request).toBeUndefined();
    await app.close();
  }, 20_000);

  it("rejected tip does not apply affinity", async () => {
    const app = buildServer();
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_reject/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "violent", amount_raw: "100", amount_display: "100 IRIS", tier: "high" }
    });
    const before = store.affinityByUser.get("usr_mock");
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: created.json().tip_intent.id, tx_hash: "0xreject", log_index: 1 } });
    expect(event.json().status).toBe("rejected");
    expect(store.affinityByUser.get("usr_mock")).toBe(before);
    await app.close();
  }, 20_000);

  it("display_only tip does not read message aloud", async () => {
    const app = buildServer();
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_display/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "display only", amount_raw: "100", amount_display: "100 IRIS", tier: "small" }
    });
    const id = created.json().tip_intent.id;
    const intent = store.tipIntents.get(id);
    if (!intent) throw new Error("missing intent");
    store.tipIntents.set(id, { ...intent, moderation_status: "display_only" });
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: id, tx_hash: "0xdisplay", log_index: 1 } });
    expect(event.json().overlay).toBeDefined();
    expect(event.json().character_reaction_request).toBeUndefined();
    expect(event.json().support_event.relationship.affinity_delta).toBe(0);
    await app.close();
  }, 20_000);

  it("overlay websocket rejects missing or invalid token", async () => {
    expect(isOverlayTokenValid(undefined)).toBe(false);
    expect(isOverlayTokenValid("bad")).toBe(false);
    expect(isOverlayTokenValid("change-me-overlay-token")).toBe(true);
    const app = buildServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("missing server address");
    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/overlay/str_ws/ws`);
    let opened = false;
    ws.addEventListener("open", () => {
      opened = true;
    });
    const closeCode = await new Promise<number>((resolve) => {
      const timer = setTimeout(() => resolve(0), 750);
      ws.addEventListener("close", (event) => {
        clearTimeout(timer);
        resolve(event.code);
      }, { once: true });
    });
    ws.close();
    expect(opened).toBe(false);
    expect([0, 1006, 1008]).toContain(closeCode);
    await app.close();
  }, 20_000);
});
