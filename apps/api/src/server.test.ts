import { beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { buildServer, isOverlayTokenValid, store } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import { normalizeTokenTipToSupportReceived } from "@cripto-tip/shared";

describe("api", () => {
  const wallet = "0x1111111111111111111111111111111111111111";
  const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
  const internalAuth = `Bearer ${mockValue("internal")}`;
  const adminAuth = `Bearer ${mockValue("admin")}`;

  beforeEach(() => {
    store.overlayClients.clear();
  });

  it("requires admin auth for admin mutation routes", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const res = await app.inject({ method: "POST", url: "/admin/tips/evt/approve" });
    expect(res.statusCode).toBe(401);
    await app.close();
  }, 20_000);

  it("creates tip intent and support.received mock pipeline", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const intent = await app.inject({
      method: "POST",
      url: "/api/live/str_1/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "応援しています", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    expect(intent.statusCode).toBe(200);
    const id = intent.json().tip_intent.id;
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: id, tx_hash: "0xtx", log_index: 1 } });
    expect(event.statusCode).toBe(200);
    expect(event.json().support_event.event_type).toBe("support.received");
    expect(JSON.stringify(event.json().character_reaction_request)).not.toContain(wallet);
    await app.close();
  }, 20_000);

  it("public tip intent status does not expose wallet address or raw message", async () => {
    const app = buildServer(new InMemoryRepository());
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
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_dup/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "thanks", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    const id = created.json().tip_intent.id;
    const first = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: id, tx_hash: "0xdup", log_index: 1 } });
    const affinityAfterFirst = await repo.getCurrentAffinity("usr_mock", "char_mio");
    const second = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: id, tx_hash: "0xdup", log_index: 1 } });
    expect(second.json().duplicate).toBe(true);
    expect(await repo.getCurrentAffinity("usr_mock", "char_mio")).toBe(affinityAfterFirst);
    expect(second.json().overlay).toBeUndefined();
    expect(second.json().character_reaction_request).toBeUndefined();
    await app.close();
  }, 20_000);

  it("hold tip does not emit overlay or reaction before approval", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_hold/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "https://example.test", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: created.json().tip_intent.id, tx_hash: "0xhold", log_index: 1 } });
    expect(event.json().status).toBe("hold");
    expect(event.json().overlay).toBeUndefined();
    expect(event.json().character_reaction_request).toBeUndefined();
    await app.close();
  }, 20_000);

  it("rejected tip does not apply affinity", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_reject/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "violent", amount_raw: "100", amount_display: "100 IRIS", tier: "high" }
    });
    const before = await repo.getCurrentAffinity("usr_mock", "char_mio");
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: created.json().tip_intent.id, tx_hash: "0xreject", log_index: 1 } });
    expect(event.json().status).toBe("rejected");
    expect(await repo.getCurrentAffinity("usr_mock", "char_mio")).toBe(before);
    await app.close();
  }, 20_000);

  it("display_only tip does not read message aloud", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_display/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "display only", amount_raw: "100", amount_display: "100 IRIS", tier: "small" }
    });
    const id = created.json().tip_intent.id;
    const intent = await repo.getTipIntentInternal(id);
    if (!intent) throw new Error("missing intent");
    repo.tipIntents.set(id, { ...intent, moderation_status: "display_only" });
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: id, tx_hash: "0xdisplay", log_index: 1 } });
    expect(event.json().overlay).toBeDefined();
    expect(event.json().character_reaction_request).toBeUndefined();
    expect(event.json().support_event.relationship.affinity_delta).toBe(0);
    await app.close();
  }, 20_000);

  it("buildServer uses injected repository for recent tip counts", async () => {
    class RecentRepo extends InMemoryRepository {
      called = false;
      async getRecentTipCountByWallet(walletAddress: string) {
        this.called = walletAddress === wallet;
        return 3;
      }
    }
    const repo = new RecentRepo();
    const app = buildServer(repo);
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_recent/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "thanks", amount_raw: "100", amount_display: "100 IRIS", tier: "small" }
    });
    expect(repo.called).toBe(true);
    expect(created.json().moderation.reasons).toContain("rapid_repeat");
    await app.close();
  }, 20_000);

  it("buildServer uses injected repository for current affinity", async () => {
    class AffinityRepo extends InMemoryRepository {
      async getCurrentAffinity() {
        return 25;
      }
    }
    const repo = new AffinityRepo();
    const app = buildServer(repo);
    await app.ready();
    const created = await app.inject({
      method: "POST",
      url: "/api/live/str_affinity/tip-intents",
      payload: { wallet_address: wallet, display_name: "Akira", message: "thanks", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: { tip_intent_id: created.json().tip_intent.id, tx_hash: "0xaffinity", log_index: 1 } });
    expect(event.json().support_event.relationship.previous_affinity).toBe(25);
    await app.close();
  }, 20_000);

  it("admin tips endpoint uses repository listSupportEventsByStream", async () => {
    const support = normalizeTokenTipToSupportReceived({
      chain_id: 1,
      contract_address: "0x2222222222222222222222222222222222222222",
      tx_hash: "0xadmin",
      log_index: 1,
      stream_id: "str_admin",
      character_id: "char_mio",
      wallet_address: wallet,
      display_name: "Akira",
      amount_raw: "100",
      amount_display: "100 IRIS",
      tier: "small",
      message: "thanks",
      moderation_status: "approved",
      created_at: new Date(0).toISOString()
    });
    class AdminRepo extends InMemoryRepository {
      called = false;
      async listSupportEventsByStream(streamId: string) {
        this.called = streamId === "str_admin";
        return [support];
      }
    }
    const repo = new AdminRepo();
    const app = buildServer(repo);
    await app.ready();
    const result = await app.inject({ method: "GET", url: "/admin/live-sessions/str_admin/tips", headers: { authorization: adminAuth } });
    expect(repo.called).toBe(true);
    expect(result.json()).toHaveLength(1);
    await app.close();
  }, 20_000);

  it("overlay websocket rejects missing or invalid token", async () => {
    expect(isOverlayTokenValid(undefined)).toBe(false);
    expect(isOverlayTokenValid("bad")).toBe(false);
    expect(isOverlayTokenValid(mockValue("overlay"))).toBe(true);
    const app = buildServer(new InMemoryRepository());
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("missing server address");
    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/overlay/str_ws/ws`);
    let opened = false;
    ws.on("open", () => {
      opened = true;
    });
    const closeCode = await new Promise<number>((resolve) => {
      const timer = setTimeout(() => resolve(0), 750);
      ws.on("error", () => {
        clearTimeout(timer);
        resolve(1006);
      });
      ws.on("close", (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    ws.terminate();
    expect(opened).toBe(false);
    expect([0, 1006, 1008]).toContain(closeCode);
    await app.close();
  }, 20_000);
});
