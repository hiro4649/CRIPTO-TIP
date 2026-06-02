# Audit Report: Durable Events DB Queue

Date: 2026-06-02

## Critical

None open.

## High

None open.

## Medium

- File: `apps/api/src/repositories/postgres.ts`
  Risk: Postgres boundary now exposes the server-path methods but is not wired to a real pool or full integration test yet.
  Fix: Implement complete SQL methods and integration tests with PostgreSQL before production.
  Test recommendation: Add docker-compose backed migration and repository tests.

- File: `apps/api/src/repositories/in-memory.ts`
  Risk: In-memory outbox cannot survive process restart.
  Fix: Use `QUEUE_MODE=db_outbox` with PostgreSQL for production-like deployments.
  Test recommendation: Add restart/resume tests once DB repository is complete.

- File: `migrations/0001_durable_events.sql`
  Risk: status columns are `text` and do not yet have check constraints for every status enum.
  Fix: Add check constraints for `moderation_status`, `delivery_status`, and `outbox_events.status` in the next migration.
  Test recommendation: Add migration tests that assert allowed status values.

- File: `apps/api/src/repositories/in-memory.ts`
  Risk: stale outbox lock reclamation is not implemented.
  Fix: Implement stale lock reclaim with an admin DLQ retry endpoint in the next PR.
  Test recommendation: Add tests for expired locks, active locks, and admin-triggered DLQ retry.

## Low

- File: `.env.example`
  Risk: local mock tokens are present by design.
  Fix: `loadConfig` rejects generated local mock defaults in production-like config.
  Test recommendation: Existing config tests cover local allow and production reject.

## Checks

- Migration includes required tables and unique constraints.
- Repository tests cover support event idempotency, chain log idempotency, affinity idempotency, outbox retry, DLQ movement, worker claim behavior, and audit log writes.
- Existing API tests continue to cover public TipIntent DTO and moderation gates.
- Server tests instantiate `buildServer(new InMemoryRepository())`, so API behavior no longer depends on global repository maps.
- `apps/api/src/server.ts` no longer reads `InMemoryRepository`-specific maps such as `recentTipsByWallet`, `affinityByUser`, `supportEvents`, `tipIntents`, `outboxEvents`, `deadLetterEvents`, or `auditLogs`.
- `PostgresRepository` exposes parameterized SQL for public TipIntent DTO, recent wallet count, current affinity, and stream support event listing.
- Full production DB connection wiring, docker-backed integration tests, stale lock reclamation, and admin DLQ retry endpoint remain incomplete.
