# Test Coverage Evidence

Latest command: `corepack pnpm test`.

Latest result: 9 test files passed, 45 tests passed.

Quality-gate npm entry command: `npm test`.

Latest root npm result: 9 test files passed, 45 tests passed.

Latest Node 20 reproduction result: 9 test files passed, 45 tests passed.

| Workspace | Test files | Tests | Covered risks |
| --- | ---: | ---: | --- |
| `apps/api` | 6 | 26 | API idempotency, public DTO privacy, moderation gate side effects, injected repository use, Postgres SQL boundary, outbox worker, migration constraints, config validation. |
| `apps/overlay` | 1 | 2 | Malformed WebSocket message handling and overlay event schema handling. |
| `apps/web` | 1 | 2 | Required safety text and prohibited UI wording guard. |
| `packages/shared` | 1 | 15 | Sanitization, wallet address redaction, moderation decisions, affinity caps, schemas, normalizers, overlay event schema, AI request privacy. |

## Risk-To-Test Mapping

| Risk | Test evidence | Status |
| --- | --- | --- |
| Duplicate support event double-applies affinity. | API and repository idempotency tests. | Covered. |
| Duplicate chain log creates duplicate transaction. | In-memory repository chain log idempotency test. | Covered. |
| Public TipIntent leaks wallet or raw viewer data. | API and Postgres public DTO tests. | Covered. |
| Unsafe moderation status reaches overlay or AI reaction. | API moderation gate tests. | Covered. |
| `display_only` is read aloud or changes affinity. | API display-only test. | Covered. |
| `server.ts` depends on global in-memory maps. | Server injection tests plus no-match rg command. | Covered. |
| Outbox retry never reaches DLQ. | Worker and repository DLQ tests. | Covered. |
| Production local mock defaults are accepted. | Config production reject test. | Covered. |
| Quality-gate Node 20 WebSocket rejection behavior fails due missing global WebSocket. | API overlay invalid token test uses explicit `ws` client and handles rejected connection error/close paths. | Covered. |
| Contract behavior regresses. | GitHub CI contracts job. | Covered in CI; local Foundry unavailable. |
| Live DB SQL behavior diverges from SQL-boundary tests. | No live DB integration test. | Not covered. |
| Stale outbox locks remain stuck. | Active lock respect is tested; stale reclaim is not implemented. | Partial. |
| Admin DLQ retry lacks audit trail. | Audit log write repository test exists; admin retry endpoint is not implemented. | Partial. |

The PR body and `docs/pr-durable-events-db-queue.md` must match this count: 9 test files, 45 tests.

Node 20 compatibility is included because the remote quality-gate uses Node 20. The test count remains unchanged after the WebSocket test compatibility repair.
