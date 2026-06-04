# YouTube Observability

This metric contract covers the official YouTube Live API connector boundary. It does not introduce scraping, browser automation, token sale, exchange, custody, internal crypto balances, or investment messaging.

## Metrics

- `youtube_connector_connected`: connector health gauge or heartbeat counter.
- `youtube_events_per_minute`: normalized YouTube events processed per minute.
- `youtube_quota_errors_total`: 403 `quotaExceeded` events.
- `youtube_rate_limit_errors_total`: 403 `rateLimitExceeded` or `userRateLimitExceeded` events.
- `youtube_stream_reconnect_total`: streamList reconnect attempts.
- `youtube_list_fallback_total`: streamList-to-list fallback activations.
- `youtube_verification_code_detected_total`: `IRIS-XXXXXX` codes detected.
- `youtube_verification_code_failed_total`: expired, consumed, wrong-stream, or invalid verification codes.
- `youtube_live_chat_id_missing_total`: live session lacks `youtube_live_chat_id`.
- `youtube_auth_errors_total`: 401 auth or credential failures.
- `youtube_invalid_page_token_total`: 400 `pageTokenInvalid` requiring operator action.

## Dashboard Panels

The dashboard contract is fixed in `docs/youtube-dashboard-contract.json` and mirrored by `buildYouTubeDashboardContract`.

- Connector connected state.
- Events per minute by stream.
- Quota and rate-limit errors.
- Auth failures and invalid page token operator actions.
- streamList reconnects and list fallback usage.
- Verification code detected versus failed totals.
- Missing liveChatId count.

## Alert Routing

The alert routing contract is fixed by `youtubeAlertConfigs` and test-covered in `deployment-observability.test.ts`.

- Auth errors: page the operator responsible for YouTube credentials and rotate credentials if needed.
- Quota/rate-limit errors: notify operations, reduce polling pressure, and inspect the YouTube quota dashboard.
- Reconnect storm: inspect network and streamList availability.
- Invalid page token: reset cursor/page token state through an operator action.
- Missing liveChatId: fix live session setup; do not scrape YouTube pages to discover chat identifiers.

## Live Soak Boundary

Live YouTube API soak remains manual-gated. It must be skipped unless an explicit live soak flag and managed credential boundary are present. Deterministic mock soak remains the normal CI path.
