# P1 Public Mock Runtime Truthfulness

## Task Contract

Make public mock API responses explicitly truthful about local mock execution.

## Evidence Integrity

This PR adds `mock_runtime_truthfulness` metadata to public mock live session,
wallet nonce, wallet verify, and tip intent creation responses.

## Testing and Review

Product verification commands:

- `corepack pnpm vitest run apps/api/src/server.test.ts`: pass
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

Tests verify public mock route disclosure for live sessions, wallet nonce,
wallet verify, and tip intent creation. They also verify public responses do not
include `runtime_ready` or `production_ready` wording.

## Security Boundaries

No raw GitHub logs are read. No package or lockfile changes are introduced. No
DB driver dependency, real DB connection, live YouTube operation, OAuth, RPC,
wallet/deploy change, migration, production readiness, runtime readiness, legal
compliance, or YouTube policy compliance claim is introduced.

## Residual Risks

This is truthfulness metadata for mock routes only. Real wallet verification,
real chain confirmation, and live YouTube execution remain future scoped work.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
