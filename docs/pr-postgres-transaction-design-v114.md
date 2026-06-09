# Summary

Add Postgres transaction design and repository contract refinement for provider apply, manual gate used state, provider job state, and audit log consistency under harness v1.1.4 without real DB connection, real provider SDK apply, or production deployment.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add Postgres transaction design and repository contract refinement for provider apply, manual gate used state, provider job state, and audit log consistency under harness v1.1.4 without real DB connection, real provider SDK apply, or production deployment.

Allowed scope: postgres_transaction_design, postgres_repository_contract, select_for_update_lock_order, transaction_retry_classifier, migration_index_design, safe_summary_persistence, tests, docs, .codex evidence.

Forbidden scope: real DB connection, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: postgres transaction SQL locks manual gate before provider job; postgres transaction SQL uses SELECT FOR UPDATE for manual gate and provider job; postgres transaction SQL updates manual gate used after provider job state check; postgres transaction SQL inserts provider audit and manual gate audit before commit; postgres transaction SQL excludes raw provider response and secret columns; postgres retry classifier marks deadlock, serialization, and lock timeout retryable; postgres retry classifier marks unique violation, manual gate mismatch, and unsafe summary terminal; postgres retry classifier marks audit append after provider success compensation_required; postgres repository contract rejects unsafe idempotency and safe summary values; migration 0004 contains required indexes and safe_summary object checks; PR #39 transaction boundary regression tests still pass; PR #38 provider job state-machine regression tests still pass; PR #35 manual gate audit regression tests still pass; no secret scan passes; no scraping scan passes; required checks pass on PR head; migration 0004 supports rollback_planned provider job status; migration 0004 supports provider_apply_transaction audit actions; migration 0004 adds provider job state-machine flag columns; migration 0004 adds applied consistency check; migration 0004 adds compensation consistency check; SQL updateProviderJob updates provider apply and manual gate state flags; SQL markManualGateUsed fails closed on approved status, commit, environment, expiry, and unused gate; SQL lockProviderJob selects state flags, operation, rollback plan, and runbook references; lock timeout retry classifier distinguishes before and after provider success contexts.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: current_pr_base

Product CI: local_verification_pass_before_pr

Quality-gate: local_verification_pass_before_pr

CI run: local_verification_before_pr

Quality-gate run: local_verification_before_pr

Quality-gate artifact: local_verification_before_pr

Tests: 30 test files, 361 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-postgres-transaction-design-v114.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass: 30 files, 361 passed, 6 skipped
- npm test: pass: 30 files, 361 passed, 6 skipped
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass: 30 files, 361 passed, 6 skipped
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass: local pre-PR evidence validation
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts or runtime dependencies are changed.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds internal Postgres transaction SQL design, retry classifier, repository contract stubs, and migration index design without DB driver, real provider SDK, external API, contract ABI, YouTube connector, Chain Listener, or IRIS delivery changes.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR adds offline Postgres transaction design only.

Review scope and verification:

- Scope: Provider apply transaction boundary, in-memory transaction simulation, compensation handoff docs, tests, and evidence.
- Risk summary: Main risk is recording provider success without manual gate used and audit append consistency, or leaking unsafe provider data.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 30 files, 361 passed, 6 skipped.

Changed area: Postgres provider apply transaction SQL design, repository contract stubs, retry classifier, migration index and constraint design, safe idempotency metadata, provider job state-machine alignment, and provider transaction regression surface.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: SQL lock order, `SELECT FOR UPDATE` usage for manual gate and provider job rows, provider job update before manual gate used state, state-machine flag updates, fail-closed manual gate used update conditions, provider job state flag selects, provider/manual audit insert before commit, retryable SQL reason codes, terminal SQL reason codes, context-aware lock timeout handling, compensation-required classification after provider success plus durable transaction failure, unsafe idempotency rejection, safe-summary rejection, migration status/action constraints, migration state-machine columns, migration consistency checks, migration index coverage, and PR #39/#38/#35 regression tests.

Edge cases and failure paths: deadlock, serialization failure, lock timeout before provider success, lock timeout after provider success, unique violation, manual gate mismatch, invalid job transition, unsafe summary, provider diagnostic payload rejection, wallet/private URL/token-like value rejection, audit append after provider success, duplicate/idempotency classification, rollback_planned persistence, provider_apply_transaction audit action persistence, applied consistency, and compensation consistency.

## Security Boundaries

- No real DB connection is implemented.
- No real provider SDK apply is implemented.
- No actual production deployment apply is implemented.
- Provider apply remains outside the DB transaction.
- Retry policy must not re-execute provider apply.
- Manual gate and audit logs store safe summaries only.
- GitHub Actions log downloads were not used.
- YouTube scraping remains forbidden.

## Residual risks

- Real Postgres repository implementation remains future work.
- Real DB transaction execution remains future work.
- Provider apply executor remains future work.
- Operator compensation execution remains future work.
- Secret rotation audit remains future work.
- Production deployment remains out of scope.

## Human Confirmation

- Human owner confirmation is required before production-like apply.
- AI review recommendations are not recorded as human approval.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Review Independence

Writer evidence only: yes.
AI review is not human approval: yes.
Human owner confirmation required before production-like apply: yes.

## Best of N Evidence

Candidate count: 3.
Selected candidate: B.
Reason selected: Candidate B implements SQL design, repository contract, retry classifier, migration indexes and constraints, tests, and docs without real DB connection or production apply.
Rejected alternatives: Candidate A implemented a real Postgres repository and DB connection too early; Candidate C only wrote docs without executable SQL and retry classifier coverage.
