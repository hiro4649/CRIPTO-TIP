# P0 Runtime Environment Persistence Boundary

## Task Contract

Complete the runtime repository selection gate so staging and production cannot
silently fall back to in-memory persistence.

## Evidence Integrity

This PR only changes local selection policy, server dependency timing, and safe
health metadata. It does not add a DB driver, open a DB connection, run a
migration, or claim runtime readiness.

Current-head evidence will be refreshed after PR creation and same-head checks.

## Testing and Review

Focused validation:

- `corepack pnpm vitest run apps/api/src/repositories/runtime-selection.test.ts apps/api/src/config/env.test.ts apps/api/src/p0-admin-operations-safe-health-checks.test.ts apps/api/src/server.test.ts apps/api/src/p0-superchat-support-received-vertical-slice.test.ts apps/api/src/p0-superchat-event-pipeline-hardening.test.ts`: pass

Full validation is required before merge.

## Test Coverage Evidence

Tests cover local/test in-memory selection, staging/production in-memory
blocking, `NODE_ENV=production` in-memory blocking, Postgres without injection
blocking, `db_outbox` blocking, injected Postgres-compatible repository
selection without real connection, server import source boundary, and admin
health safe selection metadata.

## Security Boundaries

No package or lockfile changes are introduced. No DB driver dependency, real DB
connection, migration, external secret manager, deployment, production readiness,
runtime readiness, legal compliance, or YouTube policy compliance claim is
introduced.

## Residual Risks

Real Postgres repository wiring remains separately scoped future work.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
