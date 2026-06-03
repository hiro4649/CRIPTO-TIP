# Product Verification

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
