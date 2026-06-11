# Summary

Prepare DB driver advisory source binding dry-run for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

This is v1.1.8 prep only. It does not roll out harness v1.1.8. Active harness
evidence remains v1.1.7 unless a separate harness rollout PR updates it.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver advisory source binding dry-run for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

Allowed scope: db_driver_advisory_binding_dry_run, future_source_binding_fixture, source_timestamp_validation, target_commit_binding, pr_number_binding, branch_binding, package_version_binding, safe_summary_binding, raw_output_rejection, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, raw advisory output, raw audit output, raw OSV response, raw npm registry metadata, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence, approved final gate in committed evidence, DB driver selected in current PR.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver advisory binding dry-run validator exists; committed bindingDryRunStatus remains not_reviewed; sourcePolicyStatus remains not_reviewed; advisoryEnvelopeStatus remains not_reviewed; driverChoiceStatus remains not_selected; selectedDriver remains null; candidate drivers remain exactly pg and postgres; binding, timestamp, freshness, package, commit, PR, branch, and safe summary statuses remain not_reviewed; all permission flags remain false; future reviewed binding fixture exists only in tests; no package or lockfile change is introduced.

## Evidence Integrity

Head SHA: 2b06f91dfa0547c42be9addaf88fa0d357a900c9

Base SHA: 92c15bb1041ea716354a9bf4e4d78038583d9fc6

Product CI: success

Quality-gate: success

CI run: 27328165083

Quality-gate run: 27328574284

Quality-gate artifact: 7556543374

Tests: 46 test files, 1358 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-advisory-binding-dry-run-v118-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

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

## Best of N Evidence

Candidate count: 3.

Selected candidate: Candidate B - binding dry-run with test-only future fixture
and committed not_reviewed evidence.

Reason selected: It proves future binding constraints without selecting or
installing a driver.

Rejected alternatives: Candidate A would create real advisory source binding
now without a dependency PR, selected driver, or owner approval. Candidate C
would skip binding dry-run and leave future advisory evidence vulnerable to
target or package-version mismatch.

## Test Coverage Evidence

Current recorded test summary: 46 files, 1358 passed, 6 skipped.

Changed area: DB driver advisory binding dry-run validator, future source
binding fixture, timestamp/freshness checks, package version binding, target
commit/PR/branch binding, raw output rejection, docs, and .codex evidence.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: default committed evidence remains not_reviewed,
candidate bindings remain not_reviewed for pg and postgres, future reviewed
binding fixture is accepted only through the future fixture validator,
timestamp/target/PR/branch/package/source mismatches are rejected, unsafe raw
output values are rejected, stale machine evidence is rejected, and misleading
approval/readiness/no-blocker safeSummary wording is rejected.

Edge cases: future timestamps, expired timestamps, expiry before checked
timestamp, stale source category, wrong target commit, wrong PR number, wrong
branch, wrong package name, non-exact package version, unsafe safe-summary
wording, secret-like labels, private URLs, wallet addresses, token-like
strings, stale head SHA, stale doc head SHA, and fake artifact ID.

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

- The binding dry-run is not an advisory review.
- Future source binding can become stale.
- Future package version binding must match the actual dependency PR.
- Future owner approval can expire or mismatch target.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- Driver choice status is not_selected for this PR.
- AI review recommendations are not recorded as human approval.
- Future DB driver dependency introduction requires a separate project-owner-approved PR.
