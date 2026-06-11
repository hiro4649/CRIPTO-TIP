# Summary

Prepare DB driver source evidence staleness policy for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver source evidence staleness policy for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

Allowed scope: db_driver_source_evidence_staleness, source_expiry_windows, source_revalidation_triggers, target_commit_invalidation, package_version_invalidation, stale_evidence_rejection, future_fresh_fixture, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, raw advisory output, raw audit output, raw OSV response, raw npm registry metadata, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence, approved final gate in committed evidence, DB driver selected in current PR.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: source evidence staleness validator exists; committed stalenessPolicyStatus is policy_ready; committed sourceEvidenceStatus remains not_reviewed; bindingDryRunStatus remains not_reviewed; sourcePolicyStatus remains not_reviewed; advisoryEnvelopeStatus remains not_reviewed; driverChoiceStatus remains not_selected; selectedDriver remains null; candidate drivers remain exactly pg and postgres; revalidationRequired remains true; knownBlockers remains null; all permission flags remain false; future fresh fixture exists only in tests; no package or lockfile change is introduced.

## Evidence Integrity

Head SHA: 0ed3fbf8814204649c98e8360907db535a29a9ba

Base SHA: 0ed3fbf8814204649c98e8360907db535a29a9ba

Product CI: not_applicable_before_pr_creation

Quality-gate: not_applicable_before_pr_creation

CI run: not_applicable_before_pr_creation

Quality-gate run: not_applicable_before_pr_creation

Quality-gate artifact: not_applicable_before_pr_creation

Tests: 47 test files, 1448 passed, 6 skipped

## v1.1.8 Prep-Only Boundary

This PR prepares the source evidence staleness policy for the future DB driver dependency PR. It does not review live source evidence, does not select `pg` or `postgres`, does not add a DB driver dependency, does not modify package or lock files, does not connect to a real DB, does not execute migrations, and does not claim runtime, production, legal, or YouTube policy readiness.

## Best of N Evidence

- Candidate A: reuse advisory binding dry-run timestamps only. Rejected because it would not separately bind source category, source checked timestamp, expiry window, package version, PR number, target branch, target commit, and base commit.
- Candidate B: store reviewed/fresh source evidence now. Rejected because this PR is policy-only and must not commit reviewed/fresh source evidence or imply driver approval.
- Candidate C: add a dedicated staleness record and validator with current evidence locked to `not_reviewed`, plus future-fresh fixture validation only in tests. Selected because it gives the next PR strict expiry and invalidation rules without authorizing any driver or dependency.

## Review Independence

Writer evidence is limited to the new validator, tests, docs, and machine-readable `.codex/db-driver-source-evidence-staleness.json`. Reviewer focus should be independent validation that committed evidence remains `policy_ready` and `not_reviewed`, `selectedDriver` remains null, candidate drivers remain exactly `pg` and `postgres`, `knownBlockers` is not an empty pass-like list, all forbidden permission flags remain false, and future fresh source evidence appears only inside tests.

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-source-evidence-staleness-v118-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm lint: not_applicable_before_pr_creation
- corepack pnpm typecheck: not_applicable_before_pr_creation
- corepack pnpm test: not_applicable_before_pr_creation
- npm test: not_applicable_before_pr_creation
- corepack pnpm evidence:ci: not_applicable_before_pr_creation
- corepack pnpm quality:self-protection: not_applicable_before_pr_creation
- node scripts/check-evidence-placeholders.mjs: not_applicable_before_pr_creation
- node scripts/validate-evidence-freshness.mjs: not_applicable_before_pr_creation
- node scripts/check-quality-gate-self-protection.mjs: not_applicable_before_pr_creation
- node scripts/codex-secret-safety-scan.mjs: not_applicable_before_pr_creation

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, package.json, or pnpm-lock changes are introduced by this PR.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No product runtime API contract is changed by this evidence tooling PR.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR changes offline advisory binding dry-run evidence and tests only.

Review scope and verification:

- Scope: DB driver advisory binding dry-run validator, future source binding fixture, timestamp/freshness rules, target commit/PR/branch/package binding, raw output policy, committed not-reviewed evidence, and tests.
- Risk summary: Main risk is mistaking binding dry-run for actual advisory review; committed evidence remains not-reviewed, no-driver, and no-package-change.
- Verification oracle: Vitest binding dry-run coverage, typecheck, lint, evidence checks, quality self-protection, secret scan, and no-scraping scan.

## Test Coverage Evidence

Current recorded test summary: 47 files, 1448 passed, 6 skipped.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No provider SDK apply or production deployment is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.
- Raw advisory output, raw audit output, raw OSV response, raw npm registry metadata, raw dependency trees, terminal output, private URLs, DB connection strings, wallet addresses, and token-like values are rejected.

## Residual risks

- The staleness policy is not an advisory review.
- Future source evidence can still become stale if not rebound.
- Future package version must match the dependency PR.
- Future owner approval can expire or mismatch target.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- AI review is not human approval.
- Future source evidence requires safe source review.
- Current PR does not review or select a driver.
- Future DB driver dependency introduction requires a separate project-owner-approved PR.
