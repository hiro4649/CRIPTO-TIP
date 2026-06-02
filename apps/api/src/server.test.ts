import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("api", () => {
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
      payload: { wallet_address: "0x1111111111111111111111111111111111111111", display_name: "Akira", message: "応援しています", amount_raw: "100", amount_display: "100 IRIS", tier: "medium" }
    });
    expect(intent.statusCode).toBe(200);
    const id = intent.json().tip_intent.id;
    const event = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: "Bearer change-me-internal-token" }, payload: { tip_intent_id: id, tx_hash: "0xtx", log_index: 1 } });
    expect(event.statusCode).toBe(200);
    expect(event.json().support_event.event_type).toBe("support.received");
    expect(JSON.stringify(event.json().character_reaction_request)).not.toContain("0x1111111111111111111111111111111111111111");
    await app.close();
  }, 20_000);
});
