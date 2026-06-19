# P0 Public Wallet Live Session Fail Closed

## Task Contract

Fail closed public live-session, tip-intent, and wallet-verification surfaces
that were previously returning mock success.

## Evidence Integrity

This PR is scoped to public API truthfulness and local/test fixtures. It does
not execute real wallet verification, RPC, OAuth, YouTube API calls, secret
manager access, or real database access.

Current-head evidence will be refreshed after PR creation and same-head checks.

## Testing and Review

Focused validation:

- `corepack pnpm vitest run apps/api/src/server.test.ts apps/api/src/p0-superchat-support-received-vertical-slice.test.ts apps/api/src/p0-superchat-event-pipeline-hardening.test.ts apps/api/src/config/env.test.ts`: pass

Full validation is required before merge.

## Test Coverage Evidence

Tests cover unknown public live session 404, no public live-session mutation,
internal live-session fixture auth, fixture environment boundary, unknown stream
tip-intent 404, missing public tip intent 404, wallet verifier unavailable 501,
injected verifier success, and nonce replay rejection.

## Security Boundaries

No package or lockfile changes are introduced. No DB driver dependency, real DB
connection, migration, live YouTube operation, OAuth, RPC, wallet execution,
deployment, production readiness, runtime readiness, legal compliance, or
YouTube policy compliance claim is introduced.

## Residual Risks

Real wallet verification remains future-scoped. The injected verifier path is a
test/dependency-injection seam, not a production wallet authority.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
