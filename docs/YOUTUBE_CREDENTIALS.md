# YouTube Credentials

Production YouTube credentials are deployment secrets, not repository configuration.

## Sources

- `local_env`: allowed only for local and test.
- `secret_manager`: required for production official connector mode.

The repository may store secret names such as `YOUTUBE_API_KEY_SECRET_NAME` or `YOUTUBE_OAUTH_TOKEN_SECRET_NAME`. It must not store real `YOUTUBE_API_KEY` or `YOUTUBE_OAUTH_TOKEN` values.

## Provider Boundary

`apps/api/src/youtube/credentials.ts` defines:

- `YouTubeCredentialProvider`
- `LocalEnvYouTubeCredentialProvider`
- `SecretManagerYouTubeCredentialProvider`
- `createYouTubeCredentialProvider`

The secret manager adapter receives a resolver interface. Provider-specific SDK wiring is intentionally outside this PR; deployment code must inject a resolver that reads from the approved provider and never logs secret values.

## Rotation

1. Rotate the YouTube API key or OAuth token in the provider.
2. Update only the secret version or secret reference in deployment configuration.
3. Restart the YouTube connector worker boundary.
4. Confirm `youtube_connector_connected` and watch `youtube_auth_errors_total`.

## Manual Live Soak

Live YouTube soak tests are skipped unless `RUN_LIVE_YOUTUBE_SOAK_TESTS=true` and `YOUTUBE_CREDENTIAL_SOURCE=secret_manager` with a configured secret name. Local `.env` credential values must not enable production-like live tests.
