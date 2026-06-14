# Summary

Add local/internal admin DLQ redrive controls for safe retry candidates without real DB, Redis, Kafka, real queue, package or lockfile changes, migrations, contracts changes, web or overlay changes, or readiness/compliance claims.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal admin DLQ redrive controls for safe retry candidates without real DB, Redis, Kafka, real queue, package or lockfile changes, migrations, contracts changes, web or overlay changes, or readiness/compliance claims.

Allowed scope: local/internal admin DLQ redrive controls, admin bearer protected DLQ retry, safe retry response metadata, retry reason allowlist, unsafe payload fail-closed behavior, duplicate retry idempotency, docs, .codex evidence.

Forbidden scope: real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin DLQ retry requires admin bearer token; admin DLQ retry rejects missing auth; admin DLQ retry rejects invalid auth; admin DLQ retry returns 404 for unknown id; admin DLQ retry fail-closes unsafe payload; admin DLQ retry response excludes raw payload; admin DLQ retry response excludes secrets and connection strings; admin DLQ retry creates one retry candidate outbox job; admin DLQ retry duplicate does not duplicate outbox job; admin DLQ retry exposes safe retry status; admin DLQ retry preserves original safe metadata; admin DLQ retry rejects unsupported reason_code; moderation hold is not retryable as DLQ; existing admin DLQ visibility tests still pass; existing P0 DLQ retry boundary tests still pass.

## Evidence Integrity

Head SHA: b5fde9642002535ed1a2b1dc39dbde5749bea19a

Base SHA: 29f11ebcfa977cc078ac80c8d7ffec0501dad026

Product CI: success

Quality-gate: success

CI run: 27492190221

Quality-gate run: 27492241216

Quality-gate artifact: 7618771505

Tests: 55 test files, 1718 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-dlq-redrive-controls.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm vitest run apps/api/src/p0-admin-dlq-redrive-controls.test.ts apps/api/src/p0-admin-dlq-visibility.test.ts apps/api/src/p0-event-pipeline-dlq-retry-boundary.test.ts: pass
- corepack pnpm --filter @cripto-tip/api typecheck: pass
- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Hardens the local/internal admin DLQ retry endpoint response and fail-closed retryability checks.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin DLQ redrive control only.

Review scope and verification:

- Scope: P0 admin DLQ redrive controls, safe response allowlist, retry reason allowlist, unsafe payload fail-closed behavior, tests, docs, and .codex evidence.
- Risk summary: Main risk is leaking raw payload or treating unsafe DLQ entries as retryable; tests and docs reject those outcomes.
- Verification oracle: Admin DLQ redrive tests, admin DLQ visibility tests, P0 DLQ retry boundary tests, full repository test suite, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 55 files, 1718 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No new DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay changes.
- Admin DLQ retry returns allowlisted safe metadata only, not raw payloads or secrets.
- Unsafe DLQ payloads and unsupported reason codes fail closed.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin DLQ redrive control only.
- Durable production admin console readiness, real DB persistence validation, production queue inspection, rate limits, and multi-admin audit policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- This PR must not be merged until same-head required checks pass after evidence refresh.
