import { describe, expect, it } from "vitest";
import { loadConfig } from "./env.js";

describe("config validation", () => {
  it("local/test config allows change-me mock tokens", () => {
    expect(loadConfig({ APP_ENV: "test" }).MOCK_ADMIN_TOKEN).toBe("change-me-admin-token");
  });

  it("production config rejects change-me mock tokens", () => {
    expect(() => loadConfig({ APP_ENV: "production", NODE_ENV: "production" })).toThrow(/MOCK_ADMIN_TOKEN/);
  });
});
