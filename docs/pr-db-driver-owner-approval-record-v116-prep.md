# Summary

Prepare DB driver owner approval record boundary for v1.1.6 with target commit binding, replay protection, expiry, owner role validation, fingerprint validation, and safe default not_approved evidence, without adding a DB driver, real DB connection, package change, live DB integration test, migration execution, provider SDK apply, or production deployment.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver owner approval record boundary for v1.1.6 with target commit binding, replay protection, expiry, owner role validation, fingerprint validation, and safe default not_approved evidence, without adding a DB driver, real DB connection, package change, live DB integration test, migration execution, provider SDK apply, or production deployment.

Allowed scope: db_driver_owner_approval_record, approval_target_commit_binding, approval_branch_pr_binding, approval_replay_protection, approval_expiry, approval_fingerprint, owner_role_validation, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver owner approval record schema exists; default record is not approved; target commit, base commit, branch, and PR bindings are validated; approval scope is allowlisted; approval expiry is ISO UTC and within 72 hours; AI, assistant, Codex, bot, GitHub Actions, and unknown actors cannot approve; project-owner role is required for approved records; fingerprint is stable and rejects replay after canonical field changes; forbidden provider, production, readiness, legal, YouTube policy, token, wallet, connector, and Chain Listener scopes remain rejected; unsafe secrets, private URLs, wallet addresses, raw provider responses, raw DB connection strings, token-like values, and raw GitHub log references are rejected; docs and .codex evidence record safe not_approved defaults.

## Evidence Integrity

Head SHA: 271785f769cbed4f27d4e088f19ee101c70ead4b

Base SHA: 0479c08a5a9d1e5184c4f51d9596243476d3175d

Product CI: success

Quality-gate: success

CI run: 27237597034

Quality-gate run: 27238173789

Quality-gate artifact: 7521067332

Tests: 36 test files, 636 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-owner-approval-record-v116-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- `corepack pnpm install` - pass
- `corepack pnpm lint` - pass
- `corepack pnpm typecheck` - pass
- `corepack pnpm test` - pass
- `npm test` - pass
- `corepack pnpm evidence:ci` - pass
- `corepack pnpm quality:self-protection` - pass
- `node scripts/write-test-summary.mjs` - pass
- `node scripts/check-evidence-placeholders.mjs` - pass
- `node scripts/validate-evidence-freshness.mjs` - pass
- `node scripts/check-quality-gate-self-protection.mjs` - pass
- `node scripts/codex-secret-safety-scan.mjs` - pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds an internal DB integration scope gate validator and tests without DB driver, real DB connection, migrations, provider SDK, public API, contract ABI, YouTube connector, Chain Listener, or IRIS delivery changes.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR adds planning gates, schema, docs, and tests only.

Review scope and verification:

- Scope: DB integration scope gate validator, tests, docs, owner approval schema, checklist, and machine-readable evidence.
- Risk summary: Main risk is accidentally expanding into real DB/package/migration/provider execution before owner approval.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, DB driver import scan, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 36 files, 636 passed, 6 skipped.

Changed area: `apps/api/src/db-driver-owner-approval-record.ts`, `apps/api/src/db-driver-owner-approval-record.test.ts`, DB driver owner approval record docs, and `.codex` evidence.

Test command: `corepack pnpm vitest run apps/api/src/db-driver-owner-approval-record.test.ts`; `corepack pnpm test`; `npm test`; `corepack pnpm evidence:ci`; `corepack pnpm quality:self-protection`.

What the test covers: default not-approved state, non-approved capability fail-closed behavior, allowed approval scopes, scope-to-capability mapping, project-owner role enforcement, AI/Codex/bot/GitHub Actions/Copilot/ChatGPT/OpenAI actor rejection, approval ID and approver actor format validation, target repository/PR/branch/commit/base binding, expiry and 72-hour approval window, fingerprint stability, replay rejection after canonical field changes, DB package/driver/secret-manager/migration/live-DB preconditions, forbidden provider/production/readiness/legal/YouTube policy/token/wallet/connector/Chain Listener scopes, and recursive unsafe key/value evidence rejection.

Edge cases: missing approved fields, expired approval, future approval, wrong target commit, wrong target environment branch, used stale fingerprint, not_approved/rejected/expired/absent records with capability flags, unsafe secret-like keys, private URLs, wallet addresses, token-like values, raw provider responses, raw DB connection strings, raw GitHub log references, package flag without driver package, real DB without secret manager scope, live DB without real DB approval, and migration apply without migration scope.

## Review Independence

- Writer evidence and review recommendation remain separate.
- AI review recommendation is not human owner approval.
- Human project-owner confirmation is required before any real DB driver, dependency, lockfile, migration, live DB, or provider SDK scope.
- This PR keeps owner approval status `not_approved`.

## Best of N Evidence

Candidates:

- Candidate A: add the actual DB driver and live DB tests now. Rejected because owner approval, package change approval, secret manager scope, migration plan, and live DB manual gate are absent.
- Candidate B: only document the approval requirement. Rejected because it would not provide a typed, replay-resistant approval record.
- Candidate C: add a typed owner approval record boundary, target binding, replay fingerprint, unsafe evidence rejection, fail-closed non-approved capabilities, strict scope-to-capability mapping, docs, and tests while keeping all real DB/package/provider actions denied.

Selected candidate: Candidate C.

Reason selected: Candidate C is the smallest safe change that adds machine-checkable owner approval evidence and closes non-approved capability loopholes without introducing DB drivers, package changes, migrations, real DB connections, provider SDK apply, or production readiness claims.

## Security Boundaries

- No DB driver dependency is added.
- No real DB connection is implemented.
- No package.json or pnpm-lock change is introduced.
- No migration change or execution is introduced.
- No approved owner record is committed.
- AI review is not owner approval.
- Approval fingerprints do not store secret values.
- GitHub raw logs remain forbidden.

## Residual risks

- Real DB driver approval remains future human-owner work.
- Approval record does not itself grant runtime readiness.
- Fingerprint prevents accidental replay but does not replace code review.
- Real DB integration tests remain future work.
- Secret manager setup remains future work.
- Migration execution remains future work.
- Provider SDK apply remains future work.
- Production deployment remains out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- No approved owner record is committed.
- AI review recommendations are not recorded as human approval.
- Future real DB work requires a new project-owner-approved PR.
