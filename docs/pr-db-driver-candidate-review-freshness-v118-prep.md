# Summary

Prepare candidate review freshness and evidence-refresh enforcement for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime, production, legal, or YouTube policy readiness.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare candidate review freshness and evidence-refresh enforcement for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime, production, legal, or YouTube policy readiness.

Allowed scope: db_driver_candidate_review_freshness, candidate_review_expiry_policy, candidate_review_refresh_policy, stale_evidence_rejection, review_placeholder_freshness, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency introduction, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, GitHub unsafe output reading, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence, approved final gate in committed evidence, fresh review evidence in committed current evidence, DB driver selected in current PR.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver candidate freshness record exists; committed freshness status remains not_ready; review pack status remains not_ready; driver choice status remains not_selected; selected driver remains null in committed evidence; candidate drivers remain exactly pg and postgres; candidate freshness entries remain not_ready and refreshRequired; license, supply-chain, advisory, package metadata, and secret-boundary reviews remain not_reviewed; version policy remains not_selected; package and lockfile evidence remain missing; all permission flags remain false in committed evidence.

## Evidence Integrity

Head SHA: 3bf9de81e87a3187219846afa331b5d8a96ed474

Base SHA: 775119a5e5ed8fe9fadf6056075aa3b117f01118

Product CI: local_not_applicable_before_pr_creation

Quality-gate: local_not_applicable_before_pr_creation

CI run: local_not_applicable_before_pr_creation

Quality-gate run: local_not_applicable_before_pr_creation

Quality-gate artifact: local_not_applicable_before_pr_creation

Tests: 43 test files, 1018 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-candidate-review-freshness-v118-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm lint: local_not_run_after_change
- corepack pnpm typecheck: local_not_run_after_change
- corepack pnpm test: local_not_run_after_change
- npm test: local_not_run_after_change
- corepack pnpm evidence:ci: local_not_run_after_change
- corepack pnpm quality:self-protection: local_not_run_after_change
- node scripts/check-evidence-placeholders.mjs: local_not_run_after_change

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, package.json, or pnpm-lock changes are introduced by this PR.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No runtime DB API or public API is changed; this adds an offline candidate freshness validator and tests.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR changes offline candidate-review evidence and tests only.

Review scope and verification:

- Scope: DB driver candidate review freshness validator, committed not-ready freshness evidence, stale evidence docs, and tests.
- Risk summary: Main risk is mistaking freshness tracking for actual DB driver selection; committed evidence remains no-driver and no-package-change.
- Verification oracle: Vitest freshness coverage, typecheck, lint, evidence checks, quality self-protection, secret scan, and no-scraping scan.

## Test Coverage Evidence

Current recorded test summary: 43 files, 1018 passed, 6 skipped.

Changed area: DB driver candidate review freshness validator, stale evidence
policy docs, committed not-ready freshness evidence, and .codex evidence.

Test command: corepack pnpm test and npm test cover the freshness validator
together with existing repository tests.

What the test covers: default not-ready freshness evidence, exact pg/postgres
candidate freshness entries, missing review reasons, expiry policy, selected or
fresh current evidence rejection, permission flag rejection, unsafe evidence
rejection, future fresh fixture isolation, and committed machine-readable
evidence remaining not-ready.

Edge cases: selected driver, selected driverChoiceStatus, fresh current
evidence, candidate timestamps, missing/extra/duplicate candidates, forbidden
selection wording, private URLs, DB connection strings, wallet addresses,
token-like values, unsafe run-output references, and provider response copies
are rejected.

## Review Independence

AI review is not human approval.

Future driver selection requires project-owner approval.

Current PR does not select a driver.

## Best of N Evidence

Candidate count: 3

Selected candidate: Candidate B - add freshness and stale-evidence enforcement
while keeping candidates not_selected.

Reason selected: It prevents stale review evidence reuse without crossing the
owner approval or dependency boundary.

Rejected alternatives: Candidate A selects `pg` before freshness and owner
approval are complete; Candidate C relies on manual review and leaves stale
advisory/package evidence risk unblocked.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No provider SDK apply or production deployment is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.
- Freshness evidence rejects stale review reuse, unsafe run-output copies, provider response copies, token-like values, wallet addresses, private URLs, and DB connection strings.

## Residual risks

- The freshness gate does not select a driver.
- Review placeholders remain not_reviewed, not_selected, or missing until a future refresh.
- Future advisory, license, package metadata, package diff, lockfile, and secret-boundary reviews remain required.
- Future owner approval may expire or mismatch target commit.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- Driver choice status is not_selected for this PR.
- AI review recommendations are not recorded as human approval.
- Future DB driver dependency introduction requires a separate project-owner-approved PR.
