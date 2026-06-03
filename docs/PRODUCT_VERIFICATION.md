# Product Verification

Current evidence head before this repair: `afb371ef29fb7fea9e5cc08fef866040441e3b79`.

## Verified Behavior

| Behavior | Evidence | Result |
| --- | --- | --- |
| Duplicate support events do not double-apply affinity. | `apps/api/src/server.test.ts`, `apps/api/src/repositories/in-memory.test.ts` | Passed in `corepack pnpm test`. |
| Public TipIntent DTO does not expose wallet address, raw display name, raw message, message hash, or client tip id. | `apps/api/src/server.test.ts`, `apps/api/src/repositories/postgres.test.ts` | Passed in `corepack pnpm test`. |
| `hold`, `rejected`, and `shadow_ignored` do not emit overlay or reaction side effects. | `apps/api/src/server.test.ts` | Passed in `corepack pnpm test`. |
| `display_only` emits overlay but not AI reaction or affinity. | `apps/api/src/server.test.ts` | Passed in `corepack pnpm test`. |
| `buildServer(repo)` uses injected repository, not `InMemoryRepository` internals. | `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, command `rg -n "repository\\.(recentTipsByWallet|affinityByUser|supportEvents|tipIntents|outboxEvents|deadLetterEvents|auditLogs)" apps/api/src/server.ts` | Expected no match. |
| `PostgresRepository` server-path SQL uses parameterized queries. | `apps/api/src/repositories/postgres.test.ts` | Passed in `corepack pnpm test`. |
| Outbox retry moves to DLQ after max retry. | `apps/api/src/outbox/worker.test.ts`, `apps/api/src/repositories/in-memory.test.ts` | Passed in `corepack pnpm test`. |
| Production config rejects default mock tokens. | `apps/api/src/config/env.test.ts` | Passed in `corepack pnpm test`. |
| Overlay remains token-gated and text-only. | `apps/api/src/server.test.ts`, `apps/overlay/src/main.test.ts`, no risky rendering grep | Passed locally. |
| Node 20 quality-gate npm path runs the same product tests. | `apps/api/src/server.test.ts`, `package.json`; Node 20 local reproduction | Passed with 9 test files and 45 tests. |
| Foundry contract job passes in GitHub CI. | GitHub CI runs `26835142098`, `26858338314`, job `contracts` | Passed. |
| TypeScript CI passes in GitHub CI. | GitHub CI runs `26835142098`, `26858338314`, job `typescript` | Passed. |
| Quality-gate failed before this patch, and this patch adds evidence to satisfy it. | Failed quality-gate run `26861752050`; this evidence set | Repair in progress. |

## Not Verified In PR #2

- Live PostgreSQL integration test.
- Real Chain Listener.
- Official YouTube API connector.
- IRIS Core delivery adapter.
- Stale lock reclamation.
- Admin DLQ retry endpoint.
- Stream-scoped overlay token rotation.
- Remote quality-gate raw npm logs are not uploaded by the harness, so Node 20 reproduction is recorded as local evidence and the new commit must be rerun in GitHub quality-gate.

## Boundary Confirmation

YouTube LIVE remains the broadcast and chat surface. IRIS Web Companion remains the external crypto Tip surface. YouTube Super Chat payment is not replaced, and IRIS Token Tip is not represented as YouTube Super Chat.
