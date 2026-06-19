# P1 Runtime Repository Selection Gate

## Task Contract

Add a runtime repository selection gate that prevents configuration from
silently implying Postgres or DB outbox execution.

## Evidence Integrity

This PR adds a pure selection gate for runtime repository mode. The current
runtime remains in-memory by default. Postgres runtime repository mode and
`QUEUE_MODE=db_outbox` fail closed until separately scoped runtime wiring is
authorized.

## Testing and Review

Product verification commands:

- `corepack pnpm vitest run apps/api/src/repositories/runtime-selection.test.ts apps/api/src/config/env.test.ts`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass
- `corepack pnpm lint`: pass
- `npm test`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/write-test-summary.mjs`: pass
- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/check-quality-gate-self-protection.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `node scripts/codex-v127-self-test.mjs`: pass
- `node scripts/codex-v126-self-test.mjs`: pass
- `node scripts/codex-v125-self-test.mjs`: pass
- `node scripts/codex-v124-self-test.mjs`: pass
- `node scripts/codex-v123-self-test.mjs`: pass

## Test Coverage Evidence

Tests cover default in-memory selection, configured-but-unused `DATABASE_URL`,
blocked Postgres runtime mode, and blocked `db_outbox` without Postgres runtime
repository support.

## Security Boundaries

No raw GitHub logs are read. No package or lockfile changes are introduced. No
DB driver dependency, real DB connection, migration, live YouTube operation,
OAuth, RPC, wallet/deploy change, production readiness, runtime readiness, legal
compliance, or YouTube policy compliance claim is introduced.

## Residual Risks

Real Postgres runtime repository wiring remains future scoped work. This PR only
prevents misleading runtime repository selection.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
