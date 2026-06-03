import { describe, expect, it } from "vitest";
import { safetyText } from "./safety";

const prohibitedLanguage = ["profit", "yield", "price increase", "refund guarantee", "investment return"];

describe("web UI copy", () => {
  it("contains required safety text", () => {
    expect(safetyText).toContain("IRIS Token Tipは、AIキャラクターへの応援演出を発生させる機能です。");
    expect(safetyText).toContain("未成年の利用はできません。");
  });

  it("does not include prohibited language in UI strings", () => {
    const ui = safetyText.join(" ");
    for (const phrase of prohibitedLanguage) {
      expect(ui.toLowerCase()).not.toContain(phrase);
    }
  });
});
