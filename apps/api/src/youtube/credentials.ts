import type { AppConfig } from "../config/env.js";
import { assertManualGateApproval, manualGateExpectation, type ManualGateApproval } from "../manual-gates.js";

export type YouTubeCredentialSet = {
  apiKey?: string | undefined;
  oauthToken?: string | undefined;
  source: "local_env" | "secret_manager" | "provider_specific";
  providerName?: string | undefined;
};

export interface YouTubeCredentialProvider {
  getCredentials(): Promise<YouTubeCredentialSet>;
}

export interface SecretResolver {
  resolveSecret(name: string): Promise<string | undefined>;
}

export class LocalEnvYouTubeCredentialProvider implements YouTubeCredentialProvider {
  constructor(private readonly config: Pick<AppConfig, "YOUTUBE_API_KEY" | "YOUTUBE_OAUTH_TOKEN">) {}

  async getCredentials() {
    return {
      apiKey: this.config.YOUTUBE_API_KEY,
      oauthToken: this.config.YOUTUBE_OAUTH_TOKEN,
      source: "local_env" as const
    };
  }
}

export class SecretManagerYouTubeCredentialProvider implements YouTubeCredentialProvider {
  constructor(
    private readonly config: Pick<AppConfig, "YOUTUBE_API_KEY_SECRET_NAME" | "YOUTUBE_OAUTH_TOKEN_SECRET_NAME">,
    private readonly resolver: SecretResolver
  ) {}

  async getCredentials() {
    const [apiKey, oauthToken] = await Promise.all([
      this.config.YOUTUBE_API_KEY_SECRET_NAME ? this.resolver.resolveSecret(this.config.YOUTUBE_API_KEY_SECRET_NAME) : undefined,
      this.config.YOUTUBE_OAUTH_TOKEN_SECRET_NAME ? this.resolver.resolveSecret(this.config.YOUTUBE_OAUTH_TOKEN_SECRET_NAME) : undefined
    ]);
    return { apiKey, oauthToken, source: "secret_manager" as const };
  }
}

export class ProviderSpecificYouTubeCredentialProvider implements YouTubeCredentialProvider {
  constructor(private readonly provider: YouTubeCredentialProvider, private readonly providerName: string) {}

  async getCredentials() {
    const credentials = await this.provider.getCredentials();
    return {
      apiKey: credentials.apiKey,
      oauthToken: credentials.oauthToken,
      source: "provider_specific" as const,
      providerName: this.providerName
    };
  }
}

export function createYouTubeCredentialProvider(config: Pick<AppConfig, "APP_ENV" | "NODE_ENV" | "YOUTUBE_CREDENTIAL_SOURCE" | "YOUTUBE_API_KEY" | "YOUTUBE_OAUTH_TOKEN" | "YOUTUBE_API_KEY_SECRET_NAME" | "YOUTUBE_OAUTH_TOKEN_SECRET_NAME">, resolver?: SecretResolver) {
  const productionLike = config.APP_ENV === "production" || config.NODE_ENV === "production";
  if (config.YOUTUBE_CREDENTIAL_SOURCE === "secret_manager" || config.YOUTUBE_CREDENTIAL_SOURCE === "provider_specific") {
    if (!resolver) throw new Error("Managed YouTube credential source requires a resolver boundary");
    if (!config.YOUTUBE_API_KEY_SECRET_NAME && !config.YOUTUBE_OAUTH_TOKEN_SECRET_NAME) throw new Error("Managed YouTube credential source requires a secret name");
    const provider = new SecretManagerYouTubeCredentialProvider(config, resolver);
    return config.YOUTUBE_CREDENTIAL_SOURCE === "provider_specific" ? new ProviderSpecificYouTubeCredentialProvider(provider, "placeholder-provider") : provider;
  }
  if (productionLike) throw new Error("Production YouTube credentials must use secret_manager or provider_specific source");
  return new LocalEnvYouTubeCredentialProvider(config);
}

export async function assertYouTubeCredentialsPresent(provider: YouTubeCredentialProvider) {
  const credentials = await provider.getCredentials();
  if (!credentials.apiKey && !credentials.oauthToken) throw new Error("YouTube credential provider returned no API key or OAuth token");
  return credentials;
}

export function createYouTubeCredentialRotationPlan(args: {
  currentSecretName?: string;
  nextSecretName?: string;
  source: "secret_manager" | "provider_specific";
  manualGate?: ManualGateApproval;
  targetCommitSha?: string;
  targetEnvironment?: string;
}) {
  if (!args.currentSecretName || !args.nextSecretName) return { status: "blocked" as const, reason: "secret_name_pair_required" };
  if (args.currentSecretName === args.nextSecretName) return { status: "blocked" as const, reason: "next_secret_name_must_differ" };
  assertManualGateApproval(args.manualGate, manualGateExpectation({
    gateType: "provider_secret_rotation",
    targetCommitSha: args.targetCommitSha ?? "",
    targetEnvironment: args.targetEnvironment
  }));
  return {
    status: "ready" as const,
    source: args.source,
    steps: [
      "provision_next_secret_outside_git",
      "update_deployment_secret_reference",
      "restart_youtube_connector_boundary",
      "verify_youtube_connector_connected_metric",
      "retire_previous_secret_after_observation_window"
    ]
  };
}
