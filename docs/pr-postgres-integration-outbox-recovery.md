# Summary

PR profile: product_minor_r2

Adds live PostgreSQL integration tests, PostgresRepository durable method coverage, stale outbox lock reclamation, and an authenticated admin DLQ retry endpoint.

## Goal

Add live PostgreSQL integration tests, stale outbox lock reclamation, admin DLQ retry endpoint, and quality evidence for CRIPTO-TIP PR #4.

## Task Contract

Task mode: product_minor_r2

Allowed scope: live PostgreSQL integration tests; migration application test; PostgresRepository durable method implementation; stale outbox lock reclamation; admin DLQ retry endpoint; admin retry audit log; runbook and quality evidence updates; CI Postgres service.

Forbidden scope: production Chain Listener; official YouTube connector; production IRIS Core delivery; token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping.

Runtime readiness claim: no

Product code changed: yes

Risk surface: storage, API, admin auth, outbox worker, config, package/lockfile, and CI service.

Verification surface: live PostgreSQL migration application, repository idempotency, stale lock reclaim, admin DLQ retry auth/audit, local pnpm/npm tests, and GitHub CI.

Done criteria: TypeScript CI pass; contracts CI pass; quality-gate pass; live Postgres tests run in CI; stale lock reclaim preserves active locks; admin DLQ retry requires auth and writes audit log; PR body test count matches actual output.

## Evidence Integrity

Base SHA: afe302a64d46ed72b9e9132e227d75d5d4ebd34a

Head SHA: 6770dcb4f9d3496b8fc29d022135dfcad336b152

Quality-gate: failure on v1.0.4 merge run 26875592817; evidence refreshed for current head

Product CI: success

ci run: 26875592955

quality-gate run: 26875592817

Stale evidence: current head only

current-head evidence: local checks and GitHub CI checks are tied to the current PR head.

Unknown file target: 0

Machine-readable evidence: .codex/*.json

## Product verification

Verified behavior: migration applies to live PostgreSQL in CI; `tip_transactions`, `support_events`, `affinity_ledger`, and `outbox_events.idempotency_key` uniqueness are exercised against live PostgreSQL; stale outbox lock reclaim preserves active locks; admin DLQ retry requires admin auth, requeues the original job, and writes audit log.

Product verification evidence: `apps/api/src/repositories/postgres.test.ts`, `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/outbox/worker.test.ts`, `apps/api/src/server.test.ts`, `.github/workflows/ci.yml`, and `docs/PRODUCT_VERIFICATION.md`.

API compatibility: public TipIntent DTO remains safe and unchanged. Internal repository/outbox methods are extended. Admin API adds `POST /admin/dead-letter/:deadLetterId/retry`; existing admin endpoints remain compatible. Breaking changes: none intended.

## Tests or checks run

## Testing and review

Package verification: `corepack pnpm install`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `npm test` passed locally. Local test result: 9 test files, 54 total tests, 49 passed, 5 skipped live Postgres tests. GitHub CI is configured to run those 5 live Postgres tests with a Postgres service.

Negative auth test evidence: `apps/api/src/server.test.ts` covers unauthenticated admin mutation rejection and authenticated DLQ retry.

Runtime smoke reason: no production runtime readiness is claimed; local mock/runtime tests and GitHub Postgres service tests cover this PR's storage/queue boundary only.

Test Coverage Evidence:

changed area: live PostgreSQL integration, repository boundary, outbox recovery, admin DLQ retry, CI service config, package metadata, and evidence docs.

test command: `corepack pnpm test`; `npm test`; GitHub CI `pnpm test` with Postgres service.

what the test covers: migration application, durable uniqueness, stale lock reclaim, DLQ retry audit trail, admin auth rejection, public DTO safety, moderation gates, and idempotency.

edge cases: duplicate chain logs, duplicate support events, duplicate affinity ledger entries, duplicate outbox idempotency keys, active lock preservation, stale lock reclamation, missing admin token, missing dead letter id, and local environment without Docker.

failure paths: production Chain Listener, official YouTube connector, production IRIS Core delivery, stream-scoped overlay token rotation, and migration enum constraints remain outside this PR.

## Residual risks

Risk summary: production Chain Listener, official YouTube connector, production IRIS Core delivery adapter, stream-scoped hashed overlay token rotation, and migration enum check constraints remain future work. This PR does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping.

Review scope and verification: review should focus on PostgresRepository SQL, live migration test setup, stale lock reclaim, DLQ retry authorization/audit behavior, and CI Postgres service configuration.

rollback or stop condition: do not merge if TypeScript, contracts, quality-gate, or live Postgres tests fail; revert this PR if admin DLQ retry or stale lock reclaim regresses idempotency.

Plan evidence: PR #4 is the focused storage/queue recovery follow-up after PR #2. It deliberately excludes Chain Listener, YouTube connector, IRIS delivery, and overlay token rotation.

Split reason: the diff touches DB tests, repository methods, outbox worker, admin API, CI service config, package metadata, and evidence docs. Production adapters stay split into later PRs.

Solvability constraints: live Postgres verification must run only in CI or when explicit local DB env is present; no production runtime connection is claimed; at-least-once outbox consumers must remain idempotent.

Verification oracle: local pnpm/npm tests plus GitHub CI Postgres service prove this PR's storage/queue boundary.

Storage oracle: live PostgreSQL migration application and unique constraint tests are the source of truth for durable idempotency.

Writer evidence: implementation files, `.codex/task-contract.json`, `.codex/product-verification.json`, and this PR body.

Review evidence: `docs/PRODUCT_VERIFICATION.md`, `docs/TEST_COVERAGE_EVIDENCE.md`, `docs/RISK_REGISTER.md`, `docs/RUNBOOK.md`, and GitHub CI checks.

Review checklist: correctness, regression, security, data integrity, runtime safety, test evidence, diff scope, and known gaps.

writer evidence: present

reviewer checklist: present

independent checklist: present

## Best of N Evidence

Best of N used or skipped: skipped with reason.

Strategy: single implementation with explicit review and test evidence.

Best of N required: no.

Reason: PR #4 is constrained to live DB verification and outbox recovery. It does not choose among competing runtime algorithms and does not claim production runtime readiness.

## Load-bearing evidence

Component: PostgresRepository live integration.

Failure mode caught: migration applies in static tests but fails against real PostgreSQL, or unique constraints do not enforce idempotency.

Not covered by existing gates: static SQL text inspection and mocked QueryClient tests cannot prove live database behavior.

Negative fixture: duplicate chain log, support event, affinity ledger entry, and outbox idempotency key.

Positive fixture: first insert succeeds and duplicate insert returns existing durable row.

Runtime cost: CI uses one Postgres service in the TypeScript job.

Default mode: local tests skip live Postgres unless `RUN_LIVE_POSTGRES_TESTS=true` and `DATABASE_URL` are set; CI enables both.

Component: admin DLQ retry.

Failure mode caught: unauthenticated admin retry, retry without audit log, or dead-lettered job not requeued.

Not covered by existing gates: prior admin auth tests did not cover DLQ retry behavior.

Negative fixture: missing admin Bearer token returns 401.

Positive fixture: authenticated retry requeues original outbox job and records `retry_dead_letter` audit log.

Runtime cost: no production adapter calls; repository-only state transition.

Default mode: enabled only behind existing admin token boundary.

# Security boundaries

YouTube LIVE remains the broadcast surface. IRIS Web Companion remains the external crypto Tip surface. This PR does not replace YouTube Super Chat payment and does not present IRIS Token Tip as YouTube Super Chat.

This PR does not implement token sale, token exchange, cash-out, custody, internal crypto balance, investment wording, speculative reward, production Chain Listener, official YouTube connector, production IRIS Core delivery, or YouTube scraping.

# Commit SHA

6770dcb4f9d3496b8fc29d022135dfcad336b152
