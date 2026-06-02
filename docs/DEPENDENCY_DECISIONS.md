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
