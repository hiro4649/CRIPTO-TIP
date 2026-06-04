# YouTube Credentials

Production YouTube credentials are deployment secrets, not repository configuration.

## Sources

- `local_env`: allowed only for local and test.
- `secret_manager`: allowed for production official connector mode through a deployment resolver.
- `provider_specific`: allowed for production official connector mode through a provider-specific deployment adapter boundary.

The repository may store secret names such as `YOUTUBE_API_KEY_SECRET_NAME` or `YOUTUBE_OAUTH_TOKEN_SECRET_NAME`. It must not store real `YOUTUBE_API_KEY` or `YOUTUBE_OAUTH_TOKEN` values.

Observability exporter configuration must also avoid credential values. Dashboard and alert providers receive metric names, numeric values, and sanitized labels only; provider-specific credentials remain outside git.

Dashboard provider credentials follow the same rule. Production dashboard deployment uses a `secret_manager` or `provider_specific` credential reference with a secret name; real provider tokens and API keys must not appear in docs, PR bodies, logs, or repository files.

## Provider Boundary

`apps/api/src/youtube/credentials.ts` defines:

- `YouTubeCredentialProvider`
- `LocalEnvYouTubeCredentialProvider`
- `SecretManagerYouTubeCredentialProvider`
- `createYouTubeCredentialProvider`

The managed credential adapters receive a resolver interface. Provider-specific SDK wiring is represented by `ProviderSpecificYouTubeCredentialProvider`; deployment code must inject a resolver that reads from the approved provider and never logs secret values.

## Rotation

1. Rotate the YouTube API key or OAuth token in the provider.
2. Update only the secret version or secret reference in deployment configuration.
3. Restart the YouTube connector worker boundary.
4. Confirm `youtube_connector_connected` and watch `youtube_auth_errors_total`.

The code-level rotation plan requires distinct current and next secret names. It does not rotate or expose credential values inside the repository.

## Manual Live Soak

Live YouTube soak tests are skipped unless `RUN_LIVE_YOUTUBE_SOAK_TESTS=true` and a managed credential source such as `secret_manager` or `provider_specific` is configured with a secret name. Local `.env` credential values must not enable production-like live tests.
