# Audit Report: Durable Events DB Queue

Date: 2026-06-02

## Critical

None open.

## High

None open.

## Medium

- File: `apps/api/src/repositories/postgres.ts`
  Risk: Postgres boundary is intentionally partial and not wired to a real pool yet.
  Fix: Implement full SQL methods and integration tests with PostgreSQL before production.
  Test recommendation: Add docker-compose backed migration and repository tests.

- File: `apps/api/src/repositories/in-memory.ts`
  Risk: In-memory outbox cannot survive process restart.
  Fix: Use `QUEUE_MODE=db_outbox` with PostgreSQL for production-like deployments.
  Test recommendation: Add restart/resume tests once DB repository is complete.

## Low

- File: `.env.example`
  Risk: local mock tokens are present by design.
  Fix: `loadConfig` rejects `change-me-*` tokens in production-like config.
  Test recommendation: Existing config tests cover local allow and production reject.

## Checks

- Migration includes required tables and unique constraints.
- Repository tests cover support event idempotency, chain log idempotency, affinity idempotency, outbox retry, DLQ movement, worker claim behavior, and audit log writes.
- Existing API tests continue to cover public TipIntent DTO and moderation gates.
