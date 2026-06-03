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
- 401 and 403 failures move to DLQ through the retry limit path.
- Success completes the outbox job and failure updates retry/DLQ state.

Deferred behavior:

- Official YouTube connector.
- Multiple IRIS Core environment auto-routing.
- Production credential provisioning and rotation automation.
