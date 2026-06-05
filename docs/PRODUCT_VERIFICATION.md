# Product Verification

## PR production-chain-listener-reorg

Verified product behavior:

- TipRouterV1 `TipSent` logs decode through a fixed ABI.
- Duplicate logs do not create duplicate `tip_transactions` or duplicate `chain.tip.detected` outbox jobs.
- `eth_getLogs` catch-up scans from persisted cursor state.
- WebSocket subscription accepts new logs through an injected provider boundary.
- Pending transactions do not enqueue `support.normalize` before the confirmation window is met.
- Confirmed transactions enqueue `support.normalize` once.
- Reorged transactions are marked `reorged` and do not enqueue `support.normalize`.
- Decoded on-chain log payloads do not include display names, comment text, YouTube names, YouTube IDs, or wallet labels.

Unverified or deferred behavior:

- Production RPC endpoint wiring and secret handling.
- Listener deployment supervision.
- Official YouTube API connector.
- Production IRIS Core delivery adapter.
- Multiple chain support.
- Multiple token support.
- Wallet custody, which remains forbidden.

## Verified Behavior

| Behavior | Evidence | Result |
| --- | --- | --- |
| Duplicate support events do not double-apply affinity. | `apps/api/src/server.test.ts`, `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed locally; live path runs in CI. |
| Public TipIntent DTO does not expose wallet address, raw display name, raw message, message hash, or client tip id. | `apps/api/src/server.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed locally. |
| `hold`, `rejected`, and `shadow_ignored` do not emit overlay or reaction side effects. | `apps/api/src/server.test.ts` | Passed locally. |
| `display_only` emits overlay but not AI reaction or affinity. | `apps/api/src/server.test.ts` | Passed locally. |
| `buildServer(repo)` uses injected repository, not `InMemoryRepository` internals. | `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, repository internals scan | Expected no match. |
| `PostgresRepository` server-path SQL uses parameterized queries. | `apps/api/src/repositories/postgres.test.ts` | Passed locally. |
| Migration applies to live PostgreSQL. | `apps/api/src/repositories/postgres.test.ts`, `.github/workflows/ci.yml` Postgres service | Configured for CI; skipped locally without Docker. |
| Live PostgreSQL unique constraints hold. | `apps/api/src/repositories/postgres.test.ts` | Configured for CI; skipped locally without Docker. |
| Outbox retry moves to DLQ after max retry. | `apps/api/src/outbox/worker.test.ts`, `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed locally; live path runs in CI. |
| Stale outbox lock reclamation preserves active locks. | `apps/api/src/outbox/worker.test.ts`, `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed locally; live path runs in CI. |
| Admin DLQ retry requires auth, requeues the job, and writes audit log. | `apps/api/src/server.test.ts`, `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed locally; live path runs in CI. |
| Production config rejects default mock tokens. | `apps/api/src/config/env.test.ts` | Passed locally. |
| Overlay remains token-gated and text-only. | `apps/api/src/server.test.ts`, `apps/overlay/src/main.test.ts`, no risky rendering grep | Passed locally. |

## Not Verified In PR #4

- Production Chain Listener.
- Official YouTube API connector.
- Production IRIS Core delivery adapter.
- Stream-scoped hashed overlay token rotation.
- Migration enum check constraints.

## Boundary Confirmation

YouTube LIVE remains the broadcast and chat surface. IRIS Web Companion remains the external crypto Tip surface. YouTube Super Chat payment is not replaced, and IRIS Token Tip is not represented as YouTube Super Chat.

## PR iris-core-delivery-adapter

Verified product behavior:

- `support.received` delivery succeeds through an injected IRIS Core client.
- `character.reaction.requested` delivery succeeds without wallet address, secret, or unsafe valuation wording.
- `affinity.apply` delivery is derived from sanitized support event data.
- `memory.write_candidate` delivery excludes wallet address, secret, payment-based romance, ownership, or control.
- Delivery idempotency is enforced by `iris.deliver:*:<source_event_id>` keys.
- Timeout and 5xx failures retry through outbox backoff.
- 401 and 403 failures move immediately to DLQ independent of `max_retry_count`.
- Success completes the outbox job and failure updates retry/DLQ state.

Deferred behavior:

- Official YouTube connector production credential rollout.
- Multiple IRIS Core environment auto-routing.
- Production credential provisioning and rotation automation.

## PR official-youtube-connector

Verified product behavior:

- `liveChatMessages.streamList` JSON events normalize into Super Chat, Super Sticker, and regular chat events.
- `liveChatMessages.list` fallback is used when streamList is unavailable.
- Super Chat and Super Sticker normalize to distinct `support.received` sources.
- Super Chat comments pass through moderation.
- Regular chat normalizes to `youtube.chat.message.received`.
- `IRIS-XXXXXX` verification codes are 10-minute, one-time, and stream-scoped.
- Quota and rate-limit errors retry through the connector boundary, including 403 `rateLimitExceeded`, `quotaExceeded`, and `userRateLimitExceeded`, plus 429 and 5xx responses.
- 403 `forbidden`, `liveChatDisabled`, `liveChatEnded`, 400 `pageTokenInvalid`, and 401 auth failures are non-retryable.
- The adapter uses official YouTube JSON API URLs only; no scraping or HTML parsing dependency is introduced.

Deferred behavior:

- Production OAuth/API key provisioning.
- Long-running live YouTube API soak test.

## PR youtube-ops-hardening

Verified product behavior:

- Production official YouTube connector mode rejects local-env credential source and requires a secret manager boundary.
- YouTube operations metrics are defined without adding a production exporter dependency.
- `liveChatId` acquisition is constrained to the live session boundary.
- 403 `quotaExceeded`, `rateLimitExceeded`, and `userRateLimitExceeded` classify as retry/backoff operational errors.
- 401 auth, 400 `pageTokenInvalid`, and non-quota 403 states remain non-retryable.
- `streamList` reconnect is bounded by retryability and max attempts.
- `liveChatMessages.list` fallback remains limited to streamList unavailable responses and respects `pollingIntervalMillis`.
- Deterministic mock soak verifies long-running counter behavior without network, secrets, sleeping, scraping, or HTML parsing.

Deferred behavior:

- Live YouTube API soak against a production account.
- Real dashboard integration and alert routing.
- Secret manager provider-specific wiring.

## PR youtube-prod-observability

Verified product behavior:

- Secret manager credential provider boundary resolves YouTube credentials by secret name and rejects production local-env credential source.
- Credential presence is fail-closed when no API key or OAuth token is returned.
- Metric contract includes quota, rate-limit, reconnect, fallback, verification, liveChatId missing, auth error, and invalid page token metrics.
- Operational error recording maps quota, rate-limit, auth, invalid page token, and missing liveChatId to explicit metrics.
- Manual live YouTube soak remains skipped unless an explicit flag and secret manager credential boundary are present.

Deferred behavior:

- Provider-specific deployment apply.
- Real secret manager SDK integration.
- Real dashboard exporter and alert delivery.
- Live YouTube account operation.

## PR youtube-deployment-dashboard

Verified product behavior:

- Production official YouTube connector mode rejects `local_env` credential source and accepts managed `secret_manager` or `provider_specific` sources with secret names.
- Provider-specific YouTube credential provider boundary resolves through an injected resolver and does not commit credential values.
- Credential rotation plan requires distinct current and next secret names and keeps credential values outside the repository.
- YouTube metrics snapshot includes every metric contract name and defaults missing counters to zero.
- Dashboard contract JSON and runtime dashboard builder include the same metric contract.
- Alert routing covers quota exceeded, rate limit exceeded, auth failure, invalid page token, liveChatId missing, reconnect storm, list fallback spike, zero YouTube events while live, and verification failure spike.
- Manual live YouTube soak remains skipped unless explicit flag and managed credential boundary are present.

Deferred behavior:

- Provider-specific deployment apply.
- Real production secret manager SDK binding.
- Real dashboard exporter deployment.
- Alert delivery into an external paging provider.
- Live YouTube account operation without manual gate.

## PR observability-exporter-integration

Verified product behavior:

- `ObservabilityExporter` publishes YouTube metric snapshots through an injected provider-neutral boundary.
- `MockObservabilityExporter` stores published points for deterministic tests.
- Prometheus-compatible metric output preserves metric names and sanitized labels.
- OpenTelemetry-compatible output preserves metric names, values, and attributes.
- Exporter output remains in parity with `docs/youtube-dashboard-contract.json`.
- Alert routing labels include `alert_id`, `operator_action`, and `source_metric` for quota, rate-limit, auth, invalid page token, missing liveChatId, reconnect storm, list fallback spike, zero events while live, and verification failure spike.
- Manual live YouTube soak result ingestion is skipped by default and only accepts safe summary data when explicit flag and managed credential source are present.

Deferred behavior:

- Provider-specific dashboard deployment apply.
- External alert delivery with real provider credentials.
- Live YouTube account operation without manual gate.

## PR dashboard-exporter-deployment

Verified product behavior:

- `DashboardProvider` deploys dashboard plans through an injected provider boundary.
- `MockDashboardProvider` supports deterministic dry-run and manual-gated apply tests.
- `ProviderSpecificDashboardProvider` wraps an injected provider without committing provider secrets.
- Dashboard deployment plans are generated from the dashboard contract.
- Dry-run succeeds without manual approval.
- Apply fails closed unless `manualApproval` is true.
- Missing dashboard provider credential secret names fail closed.
- Dashboard panels reference declared metrics only.
- Alert routing provider remains a stub and real external alert delivery remains disabled.
- Provider errors map to operator actions.
- Rollback plan generation is available as operator steps.

Deferred behavior:

- Real provider SDK deployment apply.
- External alert delivery with real provider credentials.
- Live YouTube account operation without manual gate.

## PR external-alert-delivery-integration

Verified product behavior:

- `ExternalAlertProvider` delivers alert plans through an injected provider boundary.
- `MockExternalAlertProvider` supports deterministic dry-run and manual-gated apply tests.
- `ProviderSpecificAlertProvider` wraps an injected provider without committing provider secrets.
- Alert delivery plans are generated from the tested YouTube alert routing config.
- Dry-run succeeds without manual approval.
- Apply fails closed unless `manualApproval` is true.
- Missing alert provider credential secret names fail closed.
- Alert payload metrics are declared YouTube metrics only.
- Alert payload labels exclude wallet addresses, OAuth tokens, API keys, raw messages, raw display names, secrets, and private URLs.
- Provider errors map to operator actions.
- Rollback and disable plan generation is available as operator steps.

Deferred behavior:

- Real provider SDK alert delivery apply.
- External alert delivery with real provider credentials without manual approval.
- Live YouTube account operation without manual gate.

## PR external-alert-delivery-integration hardening

Verified product behavior:

- Alert payload label keys exclude wallet/address/token/secret/api_key/oauth/message/display_name/youtube_id/url patterns.
- Alert payload label values redact wallet addresses, token-like strings, Bearer credentials, credential keywords, and private URLs.
- Dry-run still succeeds without manual approval.
- Apply still fails closed without manual approval.
- Rollback plans do not expose credential secret names.

