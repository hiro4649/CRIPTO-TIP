import type { AppConfig } from "../config/env.js";

export type YouTubeCredentialSet = {
  apiKey?: string | undefined;
  oauthToken?: string | undefined;
  source: "local_env" | "secret_manager";
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

export function createYouTubeCredentialProvider(config: Pick<AppConfig, "APP_ENV" | "NODE_ENV" | "YOUTUBE_CREDENTIAL_SOURCE" | "YOUTUBE_API_KEY" | "YOUTUBE_OAUTH_TOKEN" | "YOUTUBE_API_KEY_SECRET_NAME" | "YOUTUBE_OAUTH_TOKEN_SECRET_NAME">, resolver?: SecretResolver) {
  const productionLike = config.APP_ENV === "production" || config.NODE_ENV === "production";
  if (config.YOUTUBE_CREDENTIAL_SOURCE === "secret_manager") {
    if (!resolver) throw new Error("Secret manager YouTube credential source requires a resolver boundary");
    if (!config.YOUTUBE_API_KEY_SECRET_NAME && !config.YOUTUBE_OAUTH_TOKEN_SECRET_NAME) throw new Error("Secret manager YouTube credential source requires a secret name");
    return new SecretManagerYouTubeCredentialProvider(config, resolver);
  }
  if (productionLike) throw new Error("Production YouTube credentials must use secret_manager source");
  return new LocalEnvYouTubeCredentialProvider(config);
}

export async function assertYouTubeCredentialsPresent(provider: YouTubeCredentialProvider) {
  const credentials = await provider.getCredentials();
  if (!credentials.apiKey && !credentials.oauthToken) throw new Error("YouTube credential provider returned no API key or OAuth token");
  return credentials;
}
