# Summary

Add local/internal admin DLQ visibility for P0 support.received DLQ safe summaries without real DB, Redis, Kafka, real queue, package or lockfile changes, migrations, contracts changes, web or overlay changes, or readiness/compliance claims.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal admin DLQ visibility for P0 support.received DLQ safe summaries without real DB, Redis, Kafka, real queue, package or lockfile changes, migrations, contracts changes, web or overlay changes, or readiness/compliance claims.

Allowed scope: local/internal admin DLQ visibility, admin bearer protected DLQ list, safe DLQ metadata, stream_id filtering, PostgresRepository interface parity only, docs, .codex evidence.

Forbidden scope: real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin DLQ list requires admin bearer token; admin DLQ list rejects missing auth; admin DLQ list rejects invalid auth; admin DLQ list returns DLQ safe summary; admin DLQ list filters by stream_id; admin DLQ list excludes raw payload; admin DLQ list excludes secrets and connection strings; admin DLQ list includes reason_code event_id source source_event_id stream_id character_id created_at; admin DLQ list does not include OAuth token DB URL wallet secret private URL; DLQ duplicate retry does not duplicate admin DLQ list entry; moderation hold does not appear in DLQ list; unsafe non-safe payload does not leak through admin DLQ list; committed test-summary evidence matches full suite numbers; existing P0 DLQ retry boundary tests still pass; fixture endpoint tests still pass; internal/events tests still pass.

## Evidence Integrity

Head SHA: cb3f39950364181ba723f50303b5cedaad6af213

Base SHA: aecabd9d8c45b47fedbfaacb1533ecba78bc4bc4

Product CI: success

Quality-gate: success

CI run: 27488867674

Quality-gate run: 27488923322

Quality-gate artifact: 7617615169

Tests: 54 test files, 1710 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-dlq-visibility.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm vitest run apps/api/src/p0-admin-dlq-visibility.test.ts: pass
- corepack pnpm vitest run apps/api/src/p0-admin-dlq-visibility.test.ts apps/api/src/p0-event-pipeline-dlq-retry-boundary.test.ts: pass
- corepack pnpm --filter @cripto-tip/api typecheck: pass
- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass
- forge test: nonblocking unavailable locally

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal admin DLQ visibility and repository interface parity for safe DLQ listing.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin DLQ visibility only.

Review scope and verification:

- Scope: P0 admin DLQ visibility, safe summary response allowlist, repository list interface parity, tests, docs, and .codex evidence.
- Risk summary: Main risk is leaking raw payload or confusing interface parity with real DB readiness; tests and docs reject those outcomes.
- Verification oracle: Admin DLQ visibility tests, P0 DLQ retry boundary tests, full repository test suite, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 54 files, 1710 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No new DB connection is introduced.
- No migration is changed or executed.
- PostgresRepository change is interface parity only for admin DLQ listing.
- No real YouTube API or OAuth token is used.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay changes.
- Admin DLQ API returns allowlisted safe metadata only, not raw payloads or secrets.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin DLQ visibility only.
- Durable production admin console readiness, real DB persistence validation, and production queue inspection remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- This PR must not be merged until same-head required checks pass after evidence repair.
