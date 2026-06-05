# Summary

Require quality-gate self-protection, evidence placeholder checks, and fail-closed evidence validation in CI while adding negative fixtures for quality-gate weakening and provider-safe deployment evidence.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Goal: Require quality-gate self-protection, evidence placeholder checks, and fail-closed evidence validation in CI while adding negative fixtures for quality-gate weakening and provider-safe deployment evidence.

Allowed scope: quality_gate_self_protection_requiredization, evidence_ci_fail_closed, placeholder_checker_required, freshness_validator_required, github_run_artifact_freshness_check, negative_fixtures, provider_safe_deployment_evidence, manual_gate_evidence_enforcement, docs, tests.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real production secret commit, production deployment apply without approved manual gate, external alert delivery with real provider credentials without approved manual gate, live YouTube account operation without approved manual gate.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: quality:self-protection runs in required CI path; evidence:check-placeholders runs in required CI path; evidence:validate runs in required CI path without mutating PR body; quality-gate workflow rejects missing safe artifact upload output; self-protection detects removed Run Codex quality gate step; self-protection detects removed Upload safe quality artifacts step; self-protection detects unsafe artifact upload ignore behavior; self-protection detects continue-on-error on quality-gate job; self-protection detects always pass wording in executable scripts; placeholder fixture fails evidence check; stale head/run/artifact fixtures fail freshness validation; manual gate evidence keeps production-like apply manual-gated and secret-free; no secret scan passes; no scraping scan passes.

## Evidence Integrity

Head SHA: 28429d4eb3aa5ae6052d332d7c6ecb098b82d627

Base SHA: b289df9215c31caefbece4c9922fefd825e5266d

Product CI: success

Quality-gate: success

CI run: 27030286624

Quality-gate run: 27030892160

Quality-gate artifact: 7443194743

Tests: 21 test files, 199 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-quality-gate-self-protection-required.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass with 21 test files, 199 passed, 6 skipped
- npm test: pass with 21 test files, 199 passed, 6 skipped
- corepack pnpm quality:self-protection: pass
- corepack pnpm evidence:check-placeholders: pass
- corepack pnpm evidence:validate: pass
- node scripts/check-quality-gate-self-protection.mjs: pass

Package verification:

- Package scripts changed: yes
- Runtime dependencies added: no
- Verification: package.json adds required evidence/self-protection scripts only; no runtime dependency is added.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No API endpoint, contract ABI, YouTube connector behavior, IRIS delivery behavior, or runtime payload contract is changed. This PR hardens CI/evidence tooling only.

Runtime smoke rationale:

- No production runtime readiness is claimed. This PR changes offline GitHub evidence tooling and tests, so package verification, evidence script checks, and GitHub CI are the applicable smoke boundary.

Review scope and verification:

- Scope: Quality-gate workflow self-protection required path, evidence CI validation, negative fixtures, provider-safe deployment evidence docs, and package scripts.
- Risk summary: Main risk is accidentally weakening quality-gate or allowing stale/placeholder evidence to pass CI; product runtime behavior is intentionally unchanged.
- Verification oracle: Required CI evidence scripts, self-protection fixtures, freshness validator fixtures, placeholder checker, package verification, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 21 files, 199 passed, 6 skipped.

## Security Boundaries

- Evidence files store safe summaries only.
- Manual gate evidence stores secret references only, never secret values.
- PR evidence renderer blocks placeholder text before merge.
- No YouTube scraping, HTML parsing, Puppeteer, or Cheerio dependency is introduced.

## Residual risks

- Provider-specific dashboard and alert apply remain manual-gated and out of scope.
- Actual production deployment apply and live YouTube account operation remain out of scope.
- GitHub API availability can block automatic evidence refresh; the script fails closed unless offline-readonly is explicit.

## Human Confirmation

- Merge decision
- Current head SHA
- CI status
- Quality-gate status
- Remaining blockers
