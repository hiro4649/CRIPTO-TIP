# Summary

Add safe CI failure artifacts and same-head required checks metadata for CRIPTO-TIP v1.0.7 active harness.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Goal: Add safe CI failure artifacts and same-head required checks metadata for CRIPTO-TIP v1.0.7 active harness.

Allowed scope: ci_safe_failure_artifact, pnpm_typecheck_safe_summary, pnpm_test_safe_summary, required_checks_metadata, same_head_check_validation, safe_summary_failure_diagnosis, docs, tests, quality_evidence.

Forbidden scope: v1.0.8 rollout merge, PR #23 reopen, CI transcript reading, required check weakening, product runtime code changes, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping.

Runtime readiness claim: no.

Product code changed: no.

Done criteria: safe CI failure artifact schema rejects CI transcript bodies; pnpm typecheck safe summary records exit code without CI transcript bodies; pnpm test safe summary records counts without CI transcript bodies when available; required checks metadata requires quality-gate, typescript, and contracts on the same head; quality-gate pass alone is not merge readiness; failed CI without safe artifact is classified as safe_artifact_missing_for_failed_ci; metadata-limited failures are classified without CI transcript bodies; no secret scan passes; no scraping scan passes.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: current_pr_base

Product CI: not_yet_verified_for_new_pr

Quality-gate: not_yet_verified_for_new_pr

CI run: not_yet_assigned_for_new_pr

Quality-gate run: not_yet_assigned_for_new_pr

Quality-gate artifact: not_yet_assigned_for_new_pr

Tests: 21 test files, 205 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-safe-ci-failure-artifacts.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: required before merge
- corepack pnpm lint: required before merge
- corepack pnpm typecheck: required before merge
- corepack pnpm test: required before merge
- npm test: required before merge
- corepack pnpm evidence:ci: required before merge
- corepack pnpm quality:self-protection: required before merge
- safe CI artifact fixture commands: required before merge

Package verification:

- Package scripts changed: yes
- Runtime dependencies added: no
- Verification: package.json adds CI safe artifact scripts only; no runtime dependency is added.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No API endpoint, contract ABI, YouTube connector behavior, Chain Listener behavior, IRIS delivery behavior, or runtime payload contract is changed. This PR hardens CI safe evidence only.

Runtime smoke rationale:

- No runtime readiness is claimed. This PR changes CI safe artifact tooling, workflow artifact upload, tests, and docs only.

Review scope and verification:

- Scope: CI safe failure artifact scripts, same-head required checks metadata, workflow safe artifact upload, docs, fixtures, and evidence tests.
- Risk summary: Main risk is classifying CI failures without raw logs while preserving required check failure semantics; product runtime behavior is intentionally unchanged.
- Verification oracle: Safe artifact fixture tests, same-head required checks tests, wrapper exit-code tests, evidence CI, self-protection, secret scan, and no-scraping scan.

## Test Coverage Evidence

Current recorded test summary: 21 files, 205 passed, 6 skipped.

## Security Boundaries

- CRIPTO-TIP active harness remains v1.0.7.
- PR #23 is closed without merge and is not reused as evidence.
- Safe CI artifacts store safe metadata only and never CI transcript bodies.
- raw_log_allowed is always false.
- Required checks are not weakened; failing typecheck/test wrappers preserve failing exit codes.
- No product runtime, wallet/RPC/deploy, YouTube connector, or Chain Listener code is changed.
- No YouTube scraping, HTML parsing, Puppeteer, or Cheerio dependency is introduced.

## Residual risks

- Future v1.0.8 rollout remains blocked until a fresh clean PR is opened.
- Metadata-limited external runner failures may still require external operator action, but raw logs remain forbidden for diagnosis.
- Required checks metadata collected during an in-progress workflow may be incomplete until GitHub checks finish.

## Human Confirmation

- Merge decision
- Current head SHA
- CI status
- Quality-gate status
- Remaining blockers
