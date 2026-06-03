import { describe, expect, it } from "vitest";
import { loadConfig } from "./env.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");

describe("config validation", () => {
  it("local/test config allows local mock tokens", () => {
    expect(loadConfig({ APP_ENV: "test" }).MOCK_ADMIN_TOKEN).toBe(mockValue("admin"));
  });

  it("production config rejects local mock tokens", () => {
    expect(() => loadConfig({ APP_ENV: "production", NODE_ENV: "production" })).toThrow(/MOCK_ADMIN/);
  });
});
