# Test Coverage Evidence

## PR production-chain-listener-reorg

Latest local result: `corepack pnpm test` passed with 13 test files, 89 passed tests, and 6 skipped tests.

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
- 401 and 403 immediate DLQ path independent of `max_retry_count`.
- terminal outbox errors move to DLQ without completing or retrying the job.
- wallet address and secret exclusion from IRIS payloads.
- outbox complete/fail integration.
- no unsafe valuation wording in reaction delivery payload.

Latest local command: `corepack pnpm test apps/api`.

Latest local result: 11 test files, 74 total tests, 68 passed tests, 6 skipped tests.

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
| Official YouTube API connector behavior. | `apps/api/src/youtube/connector.test.ts`, `apps/api/src/youtube/verification.test.ts`, `packages/shared/src/index.test.ts`. | Covered for adapter boundary, 403 quota/rate-limit retry classification, non-retry auth/forbidden/page token cases, and mock JSON fixtures; live API soak not covered. |
| Production IRIS Core delivery behavior. | Not in PR #4 scope. | Not covered. |

## PR youtube-ops-hardening

Latest local targeted result before full-suite replay: `corepack pnpm test apps/api/src/youtube apps/api/src/config/env.test.ts` passed with 14 test files, 100 passed tests, and 6 skipped tests.

Risk coverage added:

- Production YouTube credential source boundary: `apps/api/src/config/env.test.ts`.
- YouTube metrics name contract: `apps/api/src/youtube/operations.test.ts`.
- `liveChatId` acquisition boundary: `apps/api/src/youtube/operations.test.ts`.
- Quota/rate-limit operational classification: `apps/api/src/youtube/operations.test.ts`.
- Non-retry operator action classification: `apps/api/src/youtube/operations.test.ts`.
- Bounded streamList reconnect and list fallback conditions: `apps/api/src/youtube/operations.test.ts`.
- `pollingIntervalMillis` handling for fallback polling: `apps/api/src/youtube/operations.test.ts`.
- Deterministic long-running mock soak boundary: `apps/api/src/youtube/operations.test.ts`.

Still uncovered by live production tests: real YouTube account authorization, live quota dashboard ingestion, alert routing, and production secret manager provider wiring.

## PR youtube-prod-observability

Latest local result after this PR: full-suite `corepack pnpm test` passes with 16 test files, 124 passed tests, and 6 skipped tests. `npm test` must match this count before PR merge.

Additional PR #12 coverage includes provider-specific YouTube credential provider boundary, credential rotation plan validation, dashboard contract JSON parity, alert routing config, quota/rate-limit/auth/page-token/liveChatId metric mappings, reconnect/fallback/verification alerts, zero-events-while-live alerting, and manual live YouTube soak default skip behavior.

Risk coverage added:

- Secret manager credential provider mock: `apps/api/src/youtube/credentials.test.ts`.
- Production rejects local-env YouTube credential source: `apps/api/src/youtube/credentials.test.ts`, `apps/api/src/config/env.test.ts`.
- Credential rotation boundary via secret names: `apps/api/src/youtube/credentials.test.ts`, `docs/YOUTUBE_CREDENTIALS.md`.
- Metrics names contract: `apps/api/src/youtube/operations.test.ts`.
- Quota/rate-limit/auth/invalid-page-token metric mapping: `apps/api/src/youtube/operations.test.ts`.
- liveChatId missing metric: `apps/api/src/youtube/operations.test.ts`.
- Manual live YouTube soak skip gate: `apps/api/src/youtube/operations.test.ts`.

Still uncovered by automated tests: provider-specific secret manager SDK, real dashboard exporter, alert delivery, and live YouTube account operation.

