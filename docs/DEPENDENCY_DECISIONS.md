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

Production integrations remain mocked. No production YouTube API, RPC, or IRIS API dependency is required for CI.

Contract CI dependency policy: Foundry and Solidity test dependencies are pinned in CI. The workflow uses Foundry `v1.7.1`, OpenZeppelin Contracts `v5.6.1`, forge-std `v1.7.1`, and ds-test commit `e282159d5170298eb2455a6c05280ab5a73a4ef0` instead of resolving default branches at run time.

Queue dependency decision: PR #2 does not add Redis or BullMQ. A DB-backed outbox is sufficient for the current safety boundary, keeps CI free of external services, and makes idempotency/audit behavior reviewable in SQL.
