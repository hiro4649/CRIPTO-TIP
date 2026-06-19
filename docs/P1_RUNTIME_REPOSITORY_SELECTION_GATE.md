# P1 Runtime Repository Selection Gate

CRIPTO-TIP currently defaults to the in-memory repository at runtime. A
configured `DATABASE_URL` alone must not imply that the API is using Postgres,
and `QUEUE_MODE=db_outbox` must not run against the in-memory repository.

## Gate Rules

- `RUNTIME_REPOSITORY_MODE` defaults to `in_memory`.
- `DATABASE_URL` in `in_memory` mode is recorded as configured but unused.
- `RUNTIME_REPOSITORY_MODE=postgres` fails closed until a separately scoped DB
  driver/runtime wiring PR enables it.
- `QUEUE_MODE=db_outbox` fails closed unless a Postgres runtime repository is
  enabled by a future scoped PR.
- The gate does not import a DB driver or open a real DB connection.

## Safety Boundary

This change does not add a DB driver dependency, change package files, change
lockfiles, run migrations, connect to a real DB, execute provider SDKs, or claim
runtime, production, legal, or YouTube policy readiness.

## Verification Focus

Tests cover default in-memory selection, configured-but-unused `DATABASE_URL`,
blocked Postgres runtime mode, and blocked `db_outbox` without Postgres runtime
repository support.
