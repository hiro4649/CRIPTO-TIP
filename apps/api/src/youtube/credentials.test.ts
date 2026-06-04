import { describe, expect, it } from "vitest";
import { assertYouTubeCredentialsPresent, createYouTubeCredentialProvider } from "./credentials.js";

const baseConfig = {
  APP_ENV: "test" as const,
  NODE_ENV: "test",
  YOUTUBE_CREDENTIAL_SOURCE: "local_env" as const,
  YOUTUBE_API_KEY: undefined,
  YOUTUBE_OAUTH_TOKEN: undefined,
  YOUTUBE_API_KEY_SECRET_NAME: undefined,
  YOUTUBE_OAUTH_TOKEN_SECRET_NAME: undefined
};

describe("YouTube credential provider boundary", () => {
  it("uses local env credentials only outside production", async () => {
    const provider = createYouTubeCredentialProvider({ ...baseConfig, YOUTUBE_API_KEY: "youtube-api-key-placeholder" });
    await expect(provider.getCredentials()).resolves.toEqual({
      apiKey: "youtube-api-key-placeholder",
      oauthToken: undefined,
      source: "local_env"
    });
  });

  it("rejects local env credential source in production", () => {
    expect(() => createYouTubeCredentialProvider({ ...baseConfig, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_API_KEY: "youtube-api-key-placeholder" })).toThrow(/secret_manager/);
  });

  it("requires a resolver and secret name for secret manager source", () => {
    expect(() => createYouTubeCredentialProvider({ ...baseConfig, YOUTUBE_CREDENTIAL_SOURCE: "secret_manager" })).toThrow(/resolver/);
    expect(() => createYouTubeCredentialProvider({ ...baseConfig, YOUTUBE_CREDENTIAL_SOURCE: "secret_manager" }, { resolveSecret: async () => "value" })).toThrow(/secret name/);
  });

  it("resolves credentials through the secret manager boundary without storing raw secrets", async () => {
    const requested: string[] = [];
    const provider = createYouTubeCredentialProvider(
      {
        ...baseConfig,
        APP_ENV: "production",
        NODE_ENV: "production",
        YOUTUBE_CREDENTIAL_SOURCE: "secret_manager",
        YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key",
        YOUTUBE_OAUTH_TOKEN_SECRET_NAME: "projects/example/secrets/youtube-oauth-token"
      },
      {
        resolveSecret: async (name) => {
          requested.push(name);
          return `${name}-resolved-placeholder`;
        }
      }
    );
    const credentials = await assertYouTubeCredentialsPresent(provider);
    expect(credentials.source).toBe("secret_manager");
    expect(credentials.apiKey).toContain("youtube-api-key");
    expect(credentials.oauthToken).toContain("youtube-oauth-token");
    expect(requested).toEqual(["projects/example/secrets/youtube-api-key", "projects/example/secrets/youtube-oauth-token"]);
  });

  it("fails closed when a provider returns no credential material", async () => {
    const provider = createYouTubeCredentialProvider({ ...baseConfig, YOUTUBE_API_KEY: undefined, YOUTUBE_OAUTH_TOKEN: undefined });
    await expect(assertYouTubeCredentialsPresent(provider)).rejects.toThrow(/no API key or OAuth token/);
  });
});
