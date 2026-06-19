# H0 Current Test Summary Source

## Task Contract

Make current-run test summary input mandatory so stale evidence-pack counts are
not reused as current test results.

## Evidence Integrity

This PR changes `scripts/write-test-summary.mjs` and its tests. It does not
change product runtime behavior.

Current-head evidence will be refreshed after PR creation and same-head checks.

## Testing and Review

Focused validation:

- `corepack pnpm vitest run apps/api/src/evidence-rendering.test.ts`: pass

Full validation is required before merge.

## Test Coverage Evidence

Tests cover Vitest text input, Vitest JSON input, safe pnpm summary input, and
missing input fail-closed behavior. They also assert that generated summaries do
not store raw stdout, stderr, stack traces, or raw failure message bodies.

## Security Boundaries

No package, lockfile, workflow, product runtime, DB, YouTube, OAuth, RPC, wallet,
deployment, runtime readiness, production readiness, legal compliance, or
YouTube policy compliance change is introduced.

## Residual Risks

Existing documentation or package aliases that call the script without arguments
must be updated in future scoped cleanup before being treated as a passing
current-run summary command.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
