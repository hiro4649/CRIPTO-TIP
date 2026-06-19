# P1 Support Event Data Fidelity Completion

## Task Contract

Complete support event data-fidelity preservation for local repository
round-trips without adding external runtime execution.

## Evidence Integrity

This PR preserves support relationship and reaction policy fields when
`support.received` events are persisted and loaded through the Postgres
repository. Missing currency metadata remains missing instead of being replaced
with support source identity.

## Testing and Review

Product verification commands:

- `corepack pnpm vitest run apps/api/src/repositories/postgres.test.ts apps/api/src/db/migration.test.ts`: pass
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

Tests cover Postgres row reconstruction for relationship and reaction policy,
currency preservation, missing-currency no-guess behavior, committed evidence
substatuses, and additive migration shape.

## Security Boundaries

No raw GitHub logs are read. No package or lockfile changes are introduced. No
DB driver dependency, real DB connection, live YouTube operation, OAuth, RPC,
wallet/deploy change, production readiness, runtime readiness, legal compliance,
or YouTube policy compliance claim is introduced.

Migration `0006_support_event_data_fidelity_columns.sql` is additive and
backfills existing rows with prior derived behavior. It does not drop tables,
truncate data, or execute against a live database in local verification.

## Residual Risks

Existing rows predating this migration receive backfilled reaction policy values
derived from moderation status because those fields were not previously stored.
New writes persist the actual normalized fields.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
