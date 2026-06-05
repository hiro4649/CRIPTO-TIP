import { describe, expect, it } from "vitest";
import { assertYouTubeCredentialsPresent, createYouTubeCredentialProvider, createYouTubeCredentialRotationPlan } from "./credentials.js";
import { makeManualGate, targetCommitSha } from "../manual-gates.test-support.js";

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
    expect(() => createYouTubeCredentialProvider({ ...baseConfig, APP_ENV: "production", NODE_ENV: "production", YOUTUBE_API_KEY: "youtube-api-key-placeholder" })).toThrow(/secret_manager or provider_specific/);
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

  it("wraps provider-specific credentials through a managed resolver boundary", async () => {
    const provider = createYouTubeCredentialProvider(
      {
        ...baseConfig,
        APP_ENV: "production",
        NODE_ENV: "production",
        YOUTUBE_CREDENTIAL_SOURCE: "provider_specific",
        YOUTUBE_API_KEY_SECRET_NAME: "projects/example/secrets/youtube-api-key"
      },
      {
        resolveSecret: async (name) => `${name}-resolved-placeholder`
      }
    );
    const credentials = await assertYouTubeCredentialsPresent(provider);
    expect(credentials.source).toBe("provider_specific");
    expect(credentials.providerName).toBe("placeholder-provider");
    expect(credentials.apiKey).toContain("youtube-api-key");
    expect(credentials.oauthToken).toBeUndefined();
  });

  it("fails closed when a provider returns no credential material", async () => {
    const provider = createYouTubeCredentialProvider({ ...baseConfig, YOUTUBE_API_KEY: undefined, YOUTUBE_OAUTH_TOKEN: undefined });
    await expect(assertYouTubeCredentialsPresent(provider)).rejects.toThrow(/no API key or OAuth token/);
  });

  it("builds a credential rotation plan only for distinct managed secret names", () => {
    expect(createYouTubeCredentialRotationPlan({ source: "secret_manager" })).toEqual({
      status: "blocked",
      reason: "secret_name_pair_required"
    });
    expect(createYouTubeCredentialRotationPlan({ source: "provider_specific", currentSecretName: "youtube-api-key-v1", nextSecretName: "youtube-api-key-v1" })).toEqual({
      status: "blocked",
      reason: "next_secret_name_must_differ"
    });
    expect(() => createYouTubeCredentialRotationPlan({ source: "provider_specific", currentSecretName: "youtube-api-key-v1", nextSecretName: "youtube-api-key-v2", targetCommitSha })).toThrow(/approved manual gate/);
    const plan = createYouTubeCredentialRotationPlan({
      source: "provider_specific",
      currentSecretName: "youtube-api-key-v1",
      nextSecretName: "youtube-api-key-v2",
      targetCommitSha,
      targetEnvironment: "production",
      manualGate: makeManualGate("provider_secret_rotation")
    });
    expect(plan.status).toBe("ready");
    if (plan.status === "ready") {
      expect(plan.source).toBe("provider_specific");
      expect(plan.steps).toContain("provision_next_secret_outside_git");
      expect(plan.steps).toContain("retire_previous_secret_after_observation_window");
    }
  });
});
