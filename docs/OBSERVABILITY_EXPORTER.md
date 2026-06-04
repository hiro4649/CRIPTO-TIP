# Observability Exporter

The observability exporter boundary publishes the YouTube metrics snapshot to provider-neutral metric points. It does not deploy a dashboard provider, commit provider credentials, send external alerts, or operate a live YouTube account without a manual gate.

## Exporter Boundary

- `ObservabilityExporter` accepts metric points and returns a publish result.
- `MockObservabilityExporter` records points for tests and local verification.
- `publishYouTubeMetricsSnapshot` converts the fixed YouTube metric snapshot into exporter points.
- Prometheus-compatible text formatting is available for metric contract verification.
- OpenTelemetry-compatible metric objects are available for adapter verification.

## Metric And Alert Parity

Exporter output must include every metric declared by `youtubeMetricNames` and `docs/youtube-dashboard-contract.json`:

- `youtube_connector_connected`
- `youtube_events_per_minute`
- `youtube_quota_errors_total`
- `youtube_rate_limit_errors_total`
- `youtube_stream_reconnect_total`
- `youtube_list_fallback_total`
- `youtube_verification_code_detected_total`
- `youtube_verification_code_failed_total`
- `youtube_live_chat_id_missing_total`
- `youtube_auth_errors_total`
- `youtube_invalid_page_token_total`

Alert labels include `alert_id`, `operator_action`, and `source_metric`. They must not include credentials, OAuth tokens, API keys, raw YouTube messages, wallet addresses, or user-provided display names.

## Manual Live Soak Result Boundary

Manual live YouTube soak result ingestion is safe-summary only. It is skipped unless `RUN_LIVE_YOUTUBE_SOAK_TESTS=true` and the credential source is `secret_manager` or `provider_specific` with a secret-name boundary. Normal CI uses deterministic mock tests only.

## Out Of Scope

- Provider-specific dashboard deployment apply.
- External alert delivery with real provider credentials.
- Real production secret commit.
- Live YouTube account operation without manual gate.
- YouTube scraping, browser automation, or HTML parsing.

## Dashboard Deployment Boundary

The deployment layer builds a provider-neutral dashboard plan from the dashboard contract. Dry-run is allowed without manual approval; apply requires an explicit manual approval gate. The provider-specific wrapper is an injected boundary and does not commit provider credentials or import a provider SDK in this PR.
