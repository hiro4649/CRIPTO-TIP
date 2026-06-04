# Architecture

## Chain Listener Boundary

The Chain Listener observes TipRouterV1 `TipSent` logs through an injected EVM RPC provider adapter. It records durable `tip_transactions`, persists `chain_cursors`, waits for confirmation, handles reorg status transitions, and enqueues `support.normalize` only after confirmation.

This boundary does not implement token sale, token exchange, cash-out, custody, internal balances, investment wording, or YouTube scraping.

## YouTube Connector Boundary

The YouTube connector uses official YouTube Live API JSON responses. It normalizes Super Chat, Super Sticker, and regular chat events without scraping, browser automation, or HTML parsing. It does not replace YouTube Super Chat payment and does not represent IRIS Token Tip as YouTube Super Chat.

Production YouTube operations hardening adds credential source validation, metric name contracts, `liveChatId` acquisition from live session state, bounded reconnect decisions, list fallback polling interval handling, and deterministic mock soak coverage. It still does not claim production runtime readiness, provider-specific secret manager wiring, live account authorization, dashboard implementation, or alert routing.

## IRIS Core Delivery Boundary

PR iris-core-delivery-adapter adds an injected IRIS Core client and an `iris.deliver` outbox handler. Confirmed support events can be delivered to IRIS Core internal event, reaction, affinity, and memory endpoints through sanitized DTOs. Wallet addresses, secrets, raw names, raw messages, YouTube IDs, and wallet labels are excluded from delivery payloads.

Delivery is at least once and uses idempotency keys based on `source_event_id` and delivery type. Timeout and 5xx responses retry through the outbox backoff path. 401 and 403 are treated as terminal credential/configuration failures and are sent immediately to DLQ independent of `max_retry_count`.

YouTube LIVE is the broadcast and chat surface only. IRIS Web Companion is the external crypto Tip surface. CRIPTO-TIP must not replace YouTube Super Chat payment or present IRIS Token Tip as YouTube Super Chat.

Inputs are normalized into `support.received`:

- YouTube Super Chat from official YouTube Live APIs.
- YouTube Super Sticker from official YouTube Live APIs.
- IRIS Token Tip from `TipRouterV1` events.
- Future IRIS Credits.
- Admin manual support.

IRIS Core owns AI reaction, TTS, Live2D/3D motion, affinity, memory, and live progression. OBS Browser Source shows `overlay.tip_alert`.

The MVP uses mock connectors and in-memory storage while preserving typed contracts for PostgreSQL, queues, and chain listeners.

PR #2 adds a durable persistence boundary:

- SQL migrations define live sessions, identities, wallet links, Tip intents, chain transactions, support events, affinity ledger, overlay events, reaction requests, outbox, DLQ, and audit logs.
- API code uses a repository interface with `InMemoryRepository` for local tests and a `PostgresRepository` boundary for production-like paths.
- DB-backed outbox is the preferred queue model for the next phase. It provides at-least-once delivery; consumers must remain idempotent.
- Production credential rollout and live YouTube API soak testing remain out of scope.
