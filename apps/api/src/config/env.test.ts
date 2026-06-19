import { describe, expect, it } from "vitest";
import { loadConfig } from "./env.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");

describe("config validation", () => {
  it("local/test config allows local mock tokens", () => {
    expect(loadConfig({ APP_ENV: "test" }).MOCK_ADMIN_TOKEN).toBe(mockValue("admin"));
    expect(loadConfig({ APP_ENV: "test" }).RUNTIME_REPOSITORY_MODE).toBe("in_memory");
  });

  it("production config rejects local mock tokens", () => {
    expect(() => loadConfig({ APP_ENV: "production", NODE_ENV: "production" })).toThrow(/MOCK_ADMIN/);
  });

  it("staging config rejects local mock tokens", () => {
    expect(() => loadConfig({ APP_ENV: "staging" })).toThrow(/MOCK_ADMIN/);
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

  it("production config rejects official YouTube connector without secret manager credential boundary", () => {
    const tokenEnv = {
      MOCK_ADMIN_TOKEN: "admin-realistic-placeholder",
      MOCK_INTERNAL_TOKEN: "internal-realistic-placeholder",
      MOCK_OVERLAY_TOKEN: "overlay-realistic-placeholder",
      IRIS_CORE_API_URL: "https://iris.example.test",
      IRIS_CORE_SHARED_SECRET: "prod-secret-placeholder"
    };
    expect(() => loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_CONNECTOR_MODE: "official" })).toThrow(/YOUTUBE_CREDENTIAL_SOURCE/);
  });

  it("production official YouTube connector requires managed credential source and secret name", () => {
    const tokenEnv = {
      MOCK_ADMIN_TOKEN: "admin-realistic-placeholder",
      MOCK_INTERNAL_TOKEN: "internal-realistic-placeholder",
      MOCK_OVERLAY_TOKEN: "overlay-realistic-placeholder",
      IRIS_CORE_API_URL: "https://iris.example.test",
      IRIS_CORE_SHARED_SECRET: "prod-secret-placeholder",
      YOUTUBE_CONNECTOR_MODE: "official"
    };
    expect(() => loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_CREDENTIAL_SOURCE: "local_env" })).toThrow(/YOUTUBE_CREDENTIAL_SOURCE/);
    expect(() => loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_CREDENTIAL_SOURCE: "secret_manager" })).toThrow(/YOUTUBE_API_KEY_SECRET_NAME|YOUTUBE_OAUTH_TOKEN_SECRET_NAME/);
    expect(loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_CREDENTIAL_SOURCE: "secret_manager", YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key" }).YOUTUBE_CREDENTIAL_SOURCE).toBe("secret_manager");
    expect(loadConfig({ ...tokenEnv, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_CREDENTIAL_SOURCE: "provider_specific", YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key" }).YOUTUBE_CREDENTIAL_SOURCE).toBe("provider_specific");
  });

  it("keeps YouTube secret manager identifiers as names, not committed secret values", () => {
    const config = loadConfig({
      APP_ENV: "test",
      YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key",
      YOUTUBE_OAUTH_TOKEN_SECRET_NAME: "projects/example/secrets/youtube-oauth-token"
    });
    expect(config.YOUTUBE_API_KEY_SECRET_NAME).toBe("projects/example/secrets/youtube-api-key");
    expect(config.YOUTUBE_OAUTH_TOKEN_SECRET_NAME).toBe("projects/example/secrets/youtube-oauth-token");
    expect(config.YOUTUBE_API_KEY).toBeUndefined();
    expect(config.YOUTUBE_OAUTH_TOKEN).toBeUndefined();
  });
});
