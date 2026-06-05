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

External alert delivery plans are generated from the same contract in `apps/api/src/youtube/alert-delivery.ts`. Dry-run is allowed for verification. Apply requires manual approval, and provider credentials are represented by secret-name references only.

- Auth errors: page the operator responsible for YouTube credentials and rotate credentials if needed.
- Quota/rate-limit errors: notify operations, reduce polling pressure, and inspect the YouTube quota dashboard.
- Reconnect storm: inspect network and streamList availability.
- Invalid page token: reset cursor/page token state through an operator action.
- Missing liveChatId: fix live session setup; do not scrape YouTube pages to discover chat identifiers.

## Live Soak Boundary

Live YouTube API soak remains manual-gated. It must be skipped unless an explicit live soak flag and managed credential boundary are present. Deterministic mock soak remains the normal CI path.

## Exporter Boundary

`ObservabilityExporter` publishes YouTube metric snapshots through provider-neutral metric points. The current implementation includes a mock exporter, Prometheus-compatible text formatting, OpenTelemetry-compatible metric objects, dashboard contract parity tests, and alert label parity tests. It does not deploy a dashboard provider, send real external alerts, commit provider secrets, or run a live YouTube account without a manual gate.

Dashboard deployment plans are generated from the same contract and can run in dry-run mode without manual approval. Actual apply requires a manual approval gate and managed provider credential reference. External alert delivery follows the same manual-gated pattern and keeps payloads limited to declared metric, severity, operator action, and sanitized labels.
## Manual Gate Registry

Manual live YouTube soak requires an approved `youtube_live_soak` gate for the target commit and environment when the managed credential boundary is present. Normal CI remains deterministic and does not operate a live YouTube account.
