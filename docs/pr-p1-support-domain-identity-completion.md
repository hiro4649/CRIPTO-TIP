# P1 Support Domain Identity Completion

## Task Contract

Complete support-domain numeric precision and identity correctness for local
Super Chat, token tip, and admin support flows.

## Evidence Integrity

This PR makes decimal amount comparison string-safe, requires canonical
`amount_raw` schema boundaries, and uses structured `source + source_event_id`
identity for support event and side-effect idempotency.

## Testing and Review

Product verification commands:

- `corepack pnpm vitest run packages/shared/src/index.test.ts apps/api/src/repositories/in-memory.test.ts apps/api/src/repositories/postgres.test.ts apps/api/src/db/migration.test.ts apps/api/src/iris/delivery-worker.test.ts apps/api/src/p0-admin-support-event-search.test.ts`: pass
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

Tests cover canonical unsigned decimal helpers, invalid amount fail-closed
moderation, public amount schema boundaries, exact affinity identity,
source-aware support side effects, event-id collision fail-closed behavior,
Postgres insert conflict semantics, and additive migration constraint alignment.

## Security Boundaries

No raw GitHub logs are read. No package or lockfile changes are introduced. No
DB driver dependency, real DB connection, live YouTube operation, OAuth, RPC,
wallet/deploy change, production readiness, runtime readiness, legal compliance,
or YouTube policy compliance claim is introduced.

The migration is additive/constraint-safe for support side-effect identity. It
does not drop tables, truncate data, or execute against a live database in local
verification.

## Residual Risks

Existing legacy side-effect rows receive `legacy_unknown` source during
migration because older rows did not store source on those tables. New writes are
source-aware.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
