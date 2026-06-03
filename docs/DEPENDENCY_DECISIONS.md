# Dependency Decisions

Checked on 2026-06-02 using npm registry metadata after `npm view` commands timed out in this environment.

| Package | Latest tag checked | MVP decision |
| --- | ---: | --- |
| next | 16.2.7 | Use `^16.2.7` for `apps/web`. |
| react | 19.2.7 | Use `^19.2.7` for web and overlay. |
| typescript | 6.0.3 | Use `^6.0.3` with strict mode. |
| fastify | 5.8.5 | Use `^5.8.5` for the API MVP. |
| zod | 4.4.3 | Use `^4.4.3` for boundary validation. |
| viem | 2.52.0 | Included for future wallet integration contracts. |
| wagmi | 3.6.16 | Included for future wallet UI contracts. |
| @openzeppelin/contracts | 5.6.1 | Use Solidity imports through Foundry dependency. |
| vitest | 4.1.8 | Use `^4.1.8` for unit tests. |
| ws | 8.21.0 | Use `^8.21.0` as a test-only WebSocket client so overlay negative tests run under Node 20 quality-gate. |
| @types/ws | 8.18.1 | Use `^8.18.1` for TypeScript coverage of the test-only WebSocket client. |
| pg | 8.21.0 | Use `^8.21.0` for live PostgreSQL repository integration tests and future DB-backed repository wiring. |
| @types/pg | 8.20.0 | Use `^8.20.0` for TypeScript coverage of the `pg` integration test client. |

PR production-chain-listener-reorg dependency check: `npm view viem version` returned `2.52.0` on 2026-06-03. `apps/api` now declares `viem` `2.52.0` for TipRouterV1 ABI event decoding and test log encoding. The root package also declares `viem` as a devDependency so quality-gate remote `npm install --no-package-lock && npm test` can resolve the workspace tests without relying on pnpm workspace linking.

Production integrations remain mocked. No production YouTube API, RPC, or IRIS API dependency is required for CI.

Contract CI dependency policy: Foundry and Solidity test dependencies are pinned in CI. The workflow uses Foundry `v1.7.1`, OpenZeppelin Contracts `v5.6.1`, forge-std `v1.7.1`, and ds-test commit `e282159d5170298eb2455a6c05280ab5a73a4ef0` instead of resolving default branches at run time.

Package manager compatibility decision: the primary workspace remains pnpm. The root `npm test` entry is kept as a real test entry for quality-gate remote npm diagnostics and runs workspace test scripts rather than bypassing product tests.

Node 20 quality-gate compatibility decision: Node 20 does not provide the same global `WebSocket` test surface as newer local Node versions. The API overlay rejection test now imports `ws` explicitly and handles rejected connection `error` events, preserving the negative auth test instead of weakening or skipping it.

Queue dependency decision: PR #2 does not add Redis or BullMQ. A DB-backed outbox is sufficient for the current safety boundary, keeps CI free of external services, and makes idempotency/audit behavior reviewable in SQL.

PR #3 keeps that decision: no Redis or BullMQ is added. `pg` is the only new runtime-facing library, and it is used to verify the existing PostgreSQL migration and repository methods against a real Postgres service in CI.
