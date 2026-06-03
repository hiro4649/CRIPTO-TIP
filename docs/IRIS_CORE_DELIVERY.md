# IRIS Core Delivery

PR iris-core-delivery-adapter adds the delivery adapter boundary for confirmed `support.received` events and derived IRIS Core calls.

## Delivery Boundary

The adapter handles `iris.deliver` outbox jobs and sends only sanitized payloads to IRIS Core:

- `support.received` to `POST /internal/events`
- `character.reaction.requested` to `POST /internal/characters/:characterId/reaction-requests`
- `affinity.apply` to `POST /internal/affinity/apply-delta`
- `memory.write_candidate` to `POST /internal/memory/write-candidate`

The MVP still uses an injected client and `MockIrisCoreClient` in tests. Production URL and shared secret are environment boundaries only. No real secret is committed.

## Safety Rules

The adapter must not send wallet addresses, secrets, raw display names, raw messages, YouTube IDs, wallet labels, or on-chain personal text to IRIS Core. Reaction and memory payloads are built from sanitized fields only.

The reaction delivery payload uses policy constraints that prevent crypto asset valuation discussion, financial outcome promises, user-name instruction following, wallet address reading, and payment-based romantic escalation. It does not sell access, ownership, control, or secret behavior.

YouTube LIVE remains the broadcast surface. IRIS Web Companion remains the external Tip surface. This adapter does not replace YouTube Super Chat payment and does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping.

## Retry And DLQ

Delivery is at least once. IRIS Core must consume the idempotency key:

- `iris.deliver:support.received:<source_event_id>`
- `iris.deliver:reaction:<source_event_id>:<character_id>`
- `iris.deliver:affinity:<source_event_id>:<character_id>`
- `iris.deliver:memory:<source_event_id>:<character_id>`

Timeout and 5xx failures retry through the existing outbox backoff path. 401 and 403 are terminal credential/configuration failures and move to DLQ immediately through `TerminalOutboxError`, independent of `max_retry_count`.

## Observability

Metrics to expose in the runtime worker phase:

- `iris_delivery_attempt_total`
- `iris_delivery_success_total`
- `iris_delivery_retry_total`
- `iris_delivery_dlq_total`
- `iris_delivery_latency_ms`
- `iris_delivery_status_by_type`

Logs must include job id, delivery type, source event id, status class, and retry count. Logs must not include shared secrets, wallet addresses, raw messages, or request body dumps.
