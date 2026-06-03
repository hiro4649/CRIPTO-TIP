# Test Coverage Evidence

## PR production-chain-listener-reorg

Latest local result: `corepack pnpm test` passed with 11 test files, 67 passed tests, and 6 skipped tests.

Risk coverage added:

- Chain ABI correctness: `apps/api/src/chain/tip-router-listener.test.ts`.
- Duplicate on-chain log idempotency: `apps/api/src/chain/tip-router-listener.test.ts`.
- `eth_getLogs` catch-up and cursor persistence: `apps/api/src/chain/tip-router-listener.test.ts`.
- WebSocket subscription boundary: `apps/api/src/chain/tip-router-listener.test.ts`.
- Confirmation window gating before `support.normalize`: `apps/api/src/chain/tip-router-listener.test.ts`.
- Reorg status transition: `apps/api/src/chain/tip-router-listener.test.ts`.
- Repository chain cursor and transaction status methods: `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts`.
- Migration coverage for `chain_cursors`: `apps/api/src/db/migration.test.ts`.

Still uncovered by live production tests: production RPC endpoint behavior, listener process supervision, multi-chain routing, multi-token routing, official YouTube connector, and production IRIS Core delivery.

PR iris-core-delivery-adapter adds `apps/api/src/iris/delivery-worker.test.ts` for IRIS delivery behavior:

- support.received delivery success.
- character.reaction.requested delivery success.
- affinity.apply delivery success.
- memory.write_candidate delivery success.
- idempotent delivery by outbox idempotency key.
- timeout and 5xx retry/backoff state.
- 401 and 403 DLQ path.
- wallet address and secret exclusion from IRIS payloads.
- outbox complete/fail integration.
- no unsafe valuation wording in reaction delivery payload.

Latest local command: `corepack pnpm test apps/api`.

Latest local result: 11 test files, 73 total tests, 67 passed tests, 6 skipped tests.

The skipped live Postgres tests require `RUN_LIVE_POSTGRES_TESTS=true` and `DATABASE_URL`. GitHub CI provides those values with a Postgres service, so the migration application and live repository tests run remotely.

Quality-gate npm entry command remains `npm test`; it is a real test command and is not a bypass.

| Workspace | Test files | Tests | Covered risks |
| --- | ---: | ---: | --- |
| `apps/api` | 6 | 30 passed, 5 skipped locally | API idempotency, public DTO privacy, moderation gate side effects, injected repository use, Postgres SQL boundary, live Postgres migration/constraint tests, stale lock reclaim, admin DLQ retry, outbox worker, migration constraints, config validation. |
| `apps/overlay` | 1 | 2 | Malformed WebSocket message handling and overlay event schema handling. |
| `apps/web` | 1 | 2 | Required safety text and prohibited UI wording guard. |
| `packages/shared` | 1 | 15 | Sanitization, wallet address redaction, moderation decisions, affinity caps, schemas, normalizers, overlay event schema, AI request privacy. |

## Risk-To-Test Mapping

| Risk | Test evidence | Status |
| --- | --- | --- |
| Duplicate support event double-applies affinity. | API and repository idempotency tests. | Covered. |
| Duplicate chain log creates duplicate transaction. | In-memory and live Postgres chain log idempotency tests. | Covered. |
| Public TipIntent leaks wallet or raw viewer data. | API and Postgres public DTO tests. | Covered. |
| Unsafe moderation status reaches overlay or AI reaction. | API moderation gate tests. | Covered. |
| `display_only` is read aloud or changes affinity. | API display-only test. | Covered. |
| `server.ts` depends on global in-memory maps. | Server injection tests plus no-match rg command. | Covered. |
| Outbox retry never reaches DLQ. | Worker, repository, and live Postgres DLQ tests. | Covered. |
| Stale outbox locks remain stuck. | In-memory, worker boundary, and live Postgres stale reclaim tests. | Covered. |
| Admin DLQ retry lacks audit trail. | API endpoint test and live Postgres audit-log test. | Covered. |
| Production local mock defaults are accepted. | Config production reject test. | Covered. |
| Contract behavior regresses. | GitHub CI contracts job. | Covered in CI; local Foundry unavailable. |
| Production Chain Listener behavior. | Not in PR #4 scope. | Not covered. |
| Official YouTube API connector behavior. | Not in PR #4 scope. | Not covered. |
| Production IRIS Core delivery behavior. | Not in PR #4 scope. | Not covered. |

