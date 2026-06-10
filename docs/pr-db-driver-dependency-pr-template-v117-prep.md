# Summary

Add the v1.1.7 prep DB driver dependency PR template and evidence contract. This PR does not select a driver, add a dependency, edit package/lockfile files, connect to a DB, execute migrations, run live DB tests, apply provider SDK actions, or claim readiness.

## Task Contract

Goal: keep current evidence `template_ready`: `selectedDriver: null`, owner approval `not_approved`, final gate `blocked`, package/lockfile evidence missing, and all dependency permission flags false.

Task mode: feature. Risk level: R3.

Affected entrypoints: `apps/api/src/db-driver-dependency-pr-template.ts`, its test, `.codex/db-driver-dependency-pr-template.json`, DB driver evidence docs, and quality evidence docs.

Allowed scope: offline dependency PR template, future package/lockfile evidence contract, review attachment rules, docs, tests, and `.codex` evidence.

Forbidden scope: DB driver dependency, package/lockfile change, real DB connection, migration change/execution, live DB test execution, provider SDK apply, production deployment, runtime/production/legal/YouTube readiness claim, raw GitHub log reading, quality-gate weakening, selected driver, approved owner record, or approved final gate.

Failure paths considered: template mistaken for approval, missing package/lockfile evidence, unsafe evidence, raw logs, private URLs, DB connection strings, and readiness overclaim.

Human confirmation needed: project-owner approval is required in a future PR before driver selection, package/lockfile change, final dependency approval, or readiness claim.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: current_pr_base

Product CI: awaiting_github_actions_after_pr_creation

Quality-gate: awaiting_github_actions_after_pr_creation

CI run: awaiting_github_actions_after_pr_creation

Quality-gate run: awaiting_github_actions_after_pr_creation

Quality-gate artifact: awaiting_github_actions_after_pr_creation

Tests: 41 test files, 864 passed, 6 skipped

## Testing and review

- `corepack pnpm install`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass
- `npm test`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/check-evidence-placeholders.mjs`: pass

Review focus: no-driver evidence, future package/lockfile evidence, unsafe evidence rejection, and no readiness overclaim.

## Test Coverage Evidence

Current recorded test summary: 41 files, 864 passed, 6 skipped.

Risk-To-Test Mapping: `apps/api/src/db-driver-dependency-pr-template.test.ts` covers no-driver current evidence, owner/final gate blocked state, package/lockfile permission rejection, future package/lockfile/license/supply-chain/security/version/secret evidence requirements, unsafe value rejection, and readiness-claim rejection.

## Security Boundaries

No DB driver dependency, package/lockfile change, real DB connection, migration execution, live DB test, provider SDK apply, production deployment, runtime readiness, production readiness, legal compliance claim, YouTube policy compliance claim, token sale, exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping is introduced.

## Best of N Evidence

Candidate count: 3. Selected: offline validator plus template-ready evidence and docs. Rejected: docs-only checklist was too weak; adding a dependency now was out of scope without owner approval, final approval, package diff review, lockfile review, license review, supply-chain review, advisory review, version pinning review, and secret-boundary review.

## Residual risks

Template does not authorize a dependency. Future package/lockfile review, owner approval, and readiness remain out of scope.

## Human Confirmation

Owner approval is `not_approved`; driver choice is `not_selected`; AI review is not human approval. Future DB driver dependency introduction requires a new project-owner-approved PR.
