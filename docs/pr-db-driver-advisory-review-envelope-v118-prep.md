# Summary

Prepare DB driver advisory review envelope for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver advisory review envelope for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

Allowed scope: db_driver_advisory_review_envelope, advisory_review_evidence_shape, raw_output_policy, known_blockers_status_semantics, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, raw advisory output, raw audit output, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence, approved final gate in committed evidence, DB driver selected in current PR.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver advisory review envelope exists; committed advisoryEnvelopeStatus remains not_reviewed; driverChoiceStatus remains not_selected; selectedDriver remains null; candidate drivers remain exactly pg and postgres; CVE, security advisory, and package audit reviews remain not_reviewed; knownBlockersStatus remains not_reviewed; knownBlockers remains null; rawOutputPolicyStatus remains safe_summary_only; candidate advisory reviews remain not_reviewed; all permission flags remain false; no package or lockfile change is introduced.

## Evidence Integrity

Head SHA: f8b858e0a4cec311d75e89d74cd6830fd0486be6

Base SHA: 4eb244b5a522a0eb1eaf08e9a878b2d2e87fb23a

Product CI: success

Quality-gate: success

CI run: 27319936009

Quality-gate run: 27320145751

Quality-gate artifact: 7553503250

Tests: 44 test files, 1121 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-advisory-review-envelope-v118-prep.md`
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

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, package.json, or pnpm-lock changes are introduced by this PR.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No product runtime API contract is changed by this evidence tooling PR.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR changes offline advisory envelope evidence and tests only.

Review scope and verification:

- Scope: DB driver advisory review envelope validator, raw output policy, committed not-reviewed advisory evidence, and tests.
- Risk summary: Main risk is mistaking an advisory envelope for actual advisory review; committed evidence remains not-reviewed, no-driver, and no-package-change.
- Verification oracle: Vitest advisory envelope coverage, typecheck, lint, evidence checks, quality self-protection, secret scan, and no-scraping scan.

## Test Coverage Evidence

Current recorded test summary: 44 files, 1121 passed, 6 skipped.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No provider SDK apply or production deployment is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.
- Raw advisory output, raw audit output, raw dependency trees, terminal output, unsafe run-output copies, private URLs, DB connection strings, wallet addresses, and token-like values are rejected.

## Residual risks

- The advisory envelope is not an advisory review.
- Known blockers are not reviewed in this PR.
- Future advisory review remains required before any DB driver dependency PR.
- Future dependency introduction still requires owner approval.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- Driver choice status is not_selected for this PR.
- AI review recommendations are not recorded as human approval.
- Future DB driver dependency introduction requires a separate project-owner-approved PR.

## Review Independence

AI review is not human approval.

Future advisory review requires safe source evidence.

This PR does not select a driver and does not approve any advisory result.

## Best of N Evidence

Candidate count: 3

Selected candidate: Candidate B - create advisory envelope and raw-output policy with not_reviewed committed evidence.

Reason selected: It gives the future dependency PR a safe advisory evidence contract without committing raw audit output, raw advisory responses, or review conclusions.

Rejected alternatives: Candidate A runs audit and commits raw output now, which violates raw-output policy. Candidate C skips the envelope and leaves future dependency PR evidence underspecified.

## Advisory Envelope Evidence

Committed advisory envelope status: not_reviewed.

Known blockers status: not_reviewed.

Known blockers value: null.

Raw output policy: safe_summary_only.

No advisory reviewed evidence is committed in this PR.

This is v1.1.8 prep only. It does not roll out harness v1.1.8. Active harness evidence remains v1.1.7 unless a separate harness rollout PR updates it.

Test Coverage Evidence details:

Changed area: DB driver advisory review envelope validator, committed advisory envelope evidence, candidate review freshness test compatibility, and advisory review docs.

Test command: `corepack pnpm vitest run apps/api/src/db-driver-advisory-review-envelope.test.ts apps/api/src/db-driver-candidate-review-freshness.test.ts`; `corepack pnpm test`; `npm test`.

What the test covers: default not_reviewed advisory state, candidate advisory review shape, driver not_selected state, selected driver rejection, permission flag rejection, future reviewed fixture isolation, raw output rejection, unsafe value rejection, committed evidence validation, knownBlockers null semantics, stale evidence rejection, and safe-summary claim rejection.

Failure paths: current evidence rejects reviewed/pass advisory state, selected driver state, empty known-blockers clean result claims, unsafe raw advisory output, raw audit output, dependency tree output, terminal output, private URLs, DB connection strings, wallet addresses, token-like values, stale head evidence, and driver-selection wording.
