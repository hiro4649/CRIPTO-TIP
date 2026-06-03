# Complexity Governance

PR #2 is a high-complexity product change because it touches DB schema, repository boundary, outbox/DLQ behavior, API internal flow, config validation, package/CI compatibility, tests, and security evidence.

## Scope Control

Production chain listener, official YouTube connector, and production IRIS delivery are intentionally not included. Adding them here would mix durable storage foundation work with external integration correctness, reorg handling, API quotas, and delivery retries. That would reduce reviewability and make failures harder to isolate.

## Solvability Constraints

- Keep production connectors mocked.
- Preserve existing public API behavior.
- Require repository interface for server storage operations.
- Use durable idempotency keys in schema and repository boundaries.
- Keep outbox at-least-once and consumers idempotent.
- Keep user names, messages, YouTube IDs, wallet labels, and wallet addresses out of AI prompts and on-chain personal text fields.

## Verification Oracle

The oracle for this PR is not production runtime readiness. It is: local TypeScript checks pass, unit tests pass, GitHub TypeScript CI passes, GitHub contract CI passes, repository internals are not referenced directly by `server.ts`, public DTOs remain safe, and evidence docs map known gaps.

## Release Gate Oracle

The release gate oracle is: TypeScript CI pass, contracts CI pass, quality-gate pass, root `npm test` pass under Node 20, PR body test counts match actual output, and residual production risks remain documented rather than represented as complete.

## Storage Surface Oracle

Migration tests and repository tests are sufficient for the PR #2 boundary. Live PostgreSQL integration is explicitly deferred and tracked as High risk.

## API Compatibility

See `docs/API_COMPATIBILITY_SUMMARY.md`.

## Diff Control

The large diff is accepted only because PR #2 introduces a durable foundation. Further expansion should be avoided until live DB integration and stale lock/DLQ retry are implemented in focused follow-up PRs.

Split requirement: no production Chain Listener, official YouTube connector, production IRIS delivery adapter, or production overlay token rotation should be added to this PR. Those are separate review units with different runtime and security oracles.
