import { describe, expect, it } from "vitest";
import { OverlayTipAlertSchema } from "@cripto-tip/shared";
import { parseOverlayMessage } from "./main";

describe("overlay", () => {
  it("parses overlay.tip_alert", () => {
    expect(OverlayTipAlertSchema.parse({ event_type: "overlay.tip_alert", event_id: "evt", stream_id: "str", viewer_name: "Akira", amount: "100 IRIS", message: "thanks", effect: "medium", duration_ms: 6000 }).viewer_name).toBe("Akira");
  });

  it("ignores malformed websocket messages", () => {
    expect(parseOverlayMessage("{not-json")).toBeNull();
    expect(parseOverlayMessage(JSON.stringify({ event_type: "wrong" }))).toBeNull();
  });
});
