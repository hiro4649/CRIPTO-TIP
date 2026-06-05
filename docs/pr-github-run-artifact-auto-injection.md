# Summary

Add automatic GitHub run and quality-gate artifact injection, evidence refresh commands, freshness validation hardening, and quality-gate self-protection requiredization.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Goal: Add automatic GitHub run and quality-gate artifact injection, evidence refresh commands, freshness validation hardening, and quality-gate self-protection requiredization.

Allowed scope: github_evidence_fetcher, quality_gate_artifact_discovery, evidence_refresh_command, freshness_validator, placeholder_checker, quality_gate_self_protection, docs, tests.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real production secret commit, production deployment apply without approved manual gate, external alert delivery with real provider credentials without approved manual gate, live YouTube account operation without approved manual gate.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: fetch-github-run-evidence parses PR, run, and artifact JSON; fetch-github-run-evidence selects latest successful ci run for the active head; fetch-github-run-evidence selects latest successful quality-gate run for the active head; fetch-github-run-evidence records codex-quality-gate-safe-artifacts artifact ID; fetch-github-run-evidence rejects stale-head runs and missing artifacts; offline-readonly mode does not mutate evidence; evidence refresh scripts render PR body from refreshed evidence; placeholder checker scans evidence, docs, workflows, package metadata, and README; quality-gate self-protection remains required through package script; evidence refresh command updates PR body through gh pr edit unless --no-edit is supplied.

## Evidence Integrity

Head SHA: 67050747029b28f7b73b6238554ba9b70ec787d7

Base SHA: 72b113d9cc9031397f3ccb5994700a2ec8fb648b

Product CI: success

Quality-gate: success

CI run: 27023126833

Quality-gate run: 27023240225

Quality-gate artifact: 7440070616

Tests: 21 test files, 196 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-github-run-artifact-auto-injection.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/fetch-github-run-evidence.mjs fixture tests: covered by Vitest
- node scripts/render-pr-evidence.mjs: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/refresh-pr-evidence.mjs --pr <number> --repo hiro4649/CRIPTO-TIP --no-edit: required before PR body update

Package verification:

- Package scripts changed: yes
- Runtime dependencies added: no
- Verification: package.json adds evidence automation scripts only; no runtime dependency is added.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No API endpoint, contract ABI, YouTube connector behavior, IRIS delivery behavior, or runtime payload contract is changed. This PR adds offline GitHub evidence tooling and tests.

Runtime smoke rationale:

- No production runtime readiness is claimed. This PR changes offline GitHub evidence tooling and tests, so package verification, evidence script checks, and GitHub CI are the applicable smoke boundary.

Review scope and verification:

- Scope: GitHub run/artifact evidence fetcher, evidence refresh command, freshness validator integration, placeholder prevention, self-protection script routing, and docs.
- Risk summary: Main risk is accepting stale run/artifact evidence or mutating evidence when GitHub context is unavailable; product runtime behavior is intentionally unchanged.
- Verification oracle: Fixture-based run/artifact selection tests, fail-closed tests, placeholder checker, freshness validator, package verification, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 21 files, 196 passed, 6 skipped.

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
