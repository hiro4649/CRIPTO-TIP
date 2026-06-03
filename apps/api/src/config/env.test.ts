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

  it("production config rejects missing or placeholder IRIS Core secret", () => {
    const tokenEnv = {
      MOCK_ADMIN_TOKEN: "admin-realistic-placeholder",
      MOCK_INTERNAL_TOKEN: "internal-realistic-placeholder",
      MOCK_OVERLAY_TOKEN: "overlay-realistic-placeholder"
    };
    expect(() => loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production" })).toThrow(/IRIS_CORE_API_URL/);
    expect(() => loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", IRIS_CORE_API_URL: "https://iris.example.test", IRIS_CORE_SHARED_SECRET: "change-me-iris-core-secret" })).toThrow(/IRIS_CORE_SHARED_SECRET/);
  });
});
