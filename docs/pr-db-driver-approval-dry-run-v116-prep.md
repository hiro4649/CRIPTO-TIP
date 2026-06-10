# Summary

Prepare DB driver approval dry-run validation for v1.1.6 using safe test-only fixtures and committed `not_ready` machine evidence. This PR does not select a DB driver, add a DB driver dependency, change `package.json` or `pnpm-lock.yaml`, connect to a real DB, execute migrations, run live DB integration tests, apply provider SDK actions, or claim runtime, production, legal, or YouTube policy readiness.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver approval dry-run validation for v1.1.6 using safe test-only fixtures and machine-readable not_ready evidence, without selecting a DB driver, adding DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

Allowed scope: db_driver_approval_dry_run, dry_run_failure_reason_vocabulary, test_only_future_approval_fixture, package_diff_evidence_schema, lockfile_review_evidence_schema, license_review_evidence_schema, supply_chain_review_evidence_schema, security_advisory_review_evidence_schema, version_pinning_evidence_schema, secret_boundary_evidence_schema, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver approval dry-run validator exists; default dry-run evidence is not_ready; committed selectedDriver is null; committed owner approval is not_approved; missing owner approval and review evidence are rejected; target commit, base commit, branch, PR number, expiry, fingerprint, and scope mismatches are rejected; package and lockfile changes are rejected; real DB, migration, provider SDK, production deployment, and readiness claims are rejected; test-only future pass fixture remains in tests only.

## Evidence Integrity

Head SHA: f3e10067ec542592de2c6acf8694042e638feba2

Base SHA: f3e10067ec542592de2c6acf8694042e638feba2

Product CI: local_pending_before_pr_creation

Quality-gate: local_pending_before_pr_creation

CI run: local_pending_before_pr_creation

Quality-gate run: local_pending_before_pr_creation

Quality-gate artifact: local_pending_before_pr_creation

Tests: 38 test files, 728 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/write-test-summary.mjs`
- `node scripts/check-evidence-placeholders.mjs`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-quality-gate-self-protection.mjs`
- `node scripts/codex-secret-safety-scan.mjs`

Product verification: local lint, typecheck, test, npm test, evidence CI, quality self-protection, and secret safety scan passed before PR creation.

Package verification: no package scripts changed, no runtime dependencies added, no DB driver dependency added, no `package.json` change, and no `pnpm-lock.yaml` change.

API Compatibility Summary: Adds an internal DB driver approval dry-run validator and tests. No public route, contract ABI, wallet/RPC/deploy setting, YouTube connector, Chain Listener, durable events runtime, IRIS delivery, package dependency, lockfile, migration, real DB connection, provider SDK apply, or production deployment changes are introduced.

Runtime smoke rationale: no runtime readiness is claimed; this PR adds dry-run validation, docs, evidence, and tests only.

## Test Coverage Evidence

Current recorded test summary: 38 files, 728 passed, 6 skipped.

Changed area: `apps/api/src/db-driver-approval-dry-run.ts`, `apps/api/src/db-driver-approval-dry-run.test.ts`, DB driver dry-run docs, and `.codex` evidence.

Test command: `corepack pnpm vitest run apps/api/src/db-driver-approval-dry-run.test.ts`; `corepack pnpm test`; `npm test`; `corepack pnpm evidence:ci`; `corepack pnpm quality:self-protection`.

What the test covers: default `not_ready` evidence, selectedDriver null, owner approval missing, package change rejection, lockfile change rejection, added `pg` and `postgres` dependency rejection, changed script rejection, selected driver without owner approval, expired approval, target commit mismatch, branch mismatch, PR mismatch, fingerprint mismatch, missing preflight policy, missing license review, missing supply-chain review, missing security advisory review, missing version pinning review, missing lockfile review, missing package diff review, missing secret boundary review, unsafe private URL/raw log evidence rejection, raw connection string rejection, runtime readiness claim rejection, production readiness claim rejection, legal compliance claim rejection, YouTube policy compliance claim rejection, provider SDK apply rejection, production deployment rejection, test-only future complete fixture acceptance, and committed machine-readable evidence remaining not_ready.

Edge cases: missing owner approval, selected driver without review evidence, unsafe private URL values, raw log references, raw DB connection strings, changed package scripts, package dependency additions, lockfile changes, stale approval targets, branch mismatch, PR mismatch, fingerprint mismatch, forbidden readiness/compliance claims, provider SDK apply flags, and production deployment flags.

## Review Independence

Writer evidence and AI review recommendation remain separate. AI review is not human approval. Human project-owner confirmation is required before DB driver selection or dependency introduction. This PR keeps committed evidence not_ready and selectedDriver null.

## Best of N Evidence

Candidate count: 3.

Candidate A: Select `pg` now and add a fake approval dry-run pass as current evidence. Rejected because it selects a driver and risks bypassing owner approval.

Candidate B: Add dry-run validator, failure reasons, test-only future approved fixture, docs, and committed not_ready evidence. Adopted.

Candidate C: Only write docs. Rejected because it leaves no machine-readable dry-run gate.

Selected candidate: Candidate B.

Reason selected: Candidate B is the smallest safe change that adds machine-checkable dry-run validation and future pass fixture coverage while keeping committed evidence not_ready, selectedDriver null, owner approval not_approved, no DB driver dependency, no package or lockfile change, no real DB connection, no migration execution, and no readiness claim.

## Security Boundaries

- No DB driver dependency is added.
- No `package.json` or `pnpm-lock.yaml` change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No selected driver is recorded in committed evidence.
- No approved owner approval record is committed.
- GitHub raw logs remain forbidden.

## Residual risks

- Dry-run does not equal approval.
- Test-only approved fixture could be misunderstood if copied.
- Future package diff review remains required.
- Future live DB integration remains required.
- Future secret boundary remains required.
- Real driver choice remains future owner-approved work.

## Human Confirmation

Human confirmation is not present for driver selection. Owner approval status is not_approved for this PR. Driver choice status is not_selected for this PR. AI review recommendations are not recorded as human approval. Future DB driver dependency introduction requires a new project-owner-approved PR.
