# YouTube Connector

The YouTube connector uses official YouTube Live API JSON responses only. It does not scrape YouTube pages, parse YouTube HTML, use browser automation, or replace YouTube Super Chat payment.

## Scope

- `liveChatMessages.streamList` adapter boundary.
- `liveChatMessages.list` fallback boundary.
- Super Chat normalization to `support.received` with source `youtube_super_chat`.
- Super Sticker normalization to `support.received` with source `youtube_super_sticker`.
- Regular chat normalization to `youtube.chat.message.received`.
- `IRIS-XXXXXX` verification code detection.

## Verification Codes

Verification codes are stream-scoped, one-time use, and expire after 10 minutes. A YouTube `authorChannelId` maps to an IRIS user id only after a valid code is consumed.

## Safety

Viewer names and messages are untrusted. The connector sanitizes display names, redacts wallet addresses, and sends Super Chat comments through moderation. It does not pass wallet addresses, raw names, raw messages, YouTube IDs, or secrets to AI prompts or memory candidates.

## Operations

Quota and rate-limit errors are retryable at the adapter boundary, including 403 responses with `rateLimitExceeded`, `quotaExceeded`, or `userRateLimitExceeded`, plus 429 and 5xx responses. 403 `forbidden`, `liveChatDisabled`, and `liveChatEnded` are not retried. 400 `pageTokenInvalid` requires token reset or operator action. 401 auth failures require credential/OAuth review.

If `streamList` is unavailable, the connector falls back to `list`. Production credentials are environment boundaries only; no real OAuth token or API key is committed.

## Production Operations Hardening

Production official connector mode requires a secret manager credential source. Local `.env` values are allowed only for local/test; production must use `YOUTUBE_CREDENTIAL_SOURCE=secret_manager` with either `YOUTUBE_API_KEY` or `YOUTUBE_OAUTH_TOKEN`.

Reserved metrics:

- `youtube_connector_connected`
- `youtube_events_per_minute`
- `youtube_quota_errors_total`
- `youtube_rate_limit_errors_total`
- `youtube_stream_reconnect_total`
- `youtube_list_fallback_total`
- `youtube_verification_code_detected_total`
- `youtube_verification_code_failed_total`

`liveChatId` must come from the live session boundary. It must not be discovered by scraping YouTube pages, browser automation, or HTML parsing.

`streamList` reconnects only for retryable operational errors and only while attempts remain. `list` fallback respects YouTube `pollingIntervalMillis` with a local minimum to avoid tight polling loops. Long-running behavior is covered by deterministic mock soak tests; live API soak remains a deployment follow-up.
