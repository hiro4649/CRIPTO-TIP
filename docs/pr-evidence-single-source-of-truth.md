# Summary

Add evidence single source of truth, PR evidence rendering, freshness validation, placeholder prevention, test summary extraction, risk register rendering, and manual gate evidence rendering.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Goal: Add evidence single source of truth, PR evidence rendering, freshness validation, placeholder prevention, test summary extraction, risk register rendering, and manual gate evidence rendering.

Allowed scope: evidence_pack, risk_register_source, manual_gate_evidence_source, test_summary, pr_evidence_renderer, freshness_validator, placeholder_checker, quality_gate_self_protection_preparation, docs, tests.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real production secret commit, production deployment apply without approved manual gate, external alert delivery with real provider credentials without approved manual gate, live YouTube account operation without approved manual gate.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: render-pr-evidence generates PR doc from evidence-pack; validate-evidence-freshness rejects stale head SHA; validate-evidence-freshness rejects stale test count; validate-evidence-freshness rejects stale quality-gate run ID; check-evidence-placeholders rejects stale placeholders; write-test-summary records exact test count; risk register JSON renders documentation section; manual gate JSON renders documentation section; rendered PR body includes required quality-gate headings; rendered PR body preserves forbidden scope; rendered PR body includes no secret values.

## Evidence Integrity

Head SHA: b11bb8b364f3bd242b853b4300639a60f3be6885

Base SHA: bc76d53551fa6ccddf1987a971cd4cd3b4fa95a5

Product CI: success

Quality-gate: success

CI run: 27019489153

Quality-gate run: current_head_quality_gate_rerun_required

Quality-gate artifact: current_head_quality_gate_rerun_required

Tests: 21 test files, 188 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-evidence-single-source-of-truth.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass, 21 files, 188 passed, 6 skipped
- npm test: pass, 21 files, 188 passed, 6 skipped
- node scripts/write-test-summary.mjs: pass
- node scripts/render-pr-evidence.mjs: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass

Package verification:

- Package scripts changed: yes
- Runtime dependencies added: no
- Verification: package.json adds evidence scripts only; corepack pnpm install, corepack pnpm test, and npm test pass on this head.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No API endpoint, contract ABI, YouTube connector behavior, IRIS delivery behavior, or runtime payload contract is changed. This PR adds offline evidence scripts and tests.

Runtime smoke rationale:

- No runtime readiness is claimed. The changed executable surface is offline evidence tooling, so lint, typecheck, Vitest, evidence script checks, and GitHub CI are the appropriate smoke boundary.

Review scope and verification:

- Scope: Evidence source-of-truth JSON, PR evidence renderer, freshness validator, placeholder checker, test summary writer, risk/manual gate renderers, and package scripts.
- Risk summary: High-risk failure mode is stale or placeholder evidence causing incorrect merge-readiness claims; product runtime behavior is unchanged and protected by existing CI.
- Verification oracle: Current-head generated PR body, strict placeholder scan, freshness validation, Vitest tests, package verification, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 21 files, 188 passed, 6 skipped.

## Security Boundaries

- Evidence files store safe summaries only.
- Manual gate evidence stores secret references only, never secret values.
- PR evidence renderer blocks placeholder text before merge.
- No YouTube scraping, HTML parsing, Puppeteer, or Cheerio dependency is introduced.

## Residual risks

- GitHub run and artifact IDs still require post-push injection until provider automation is wired.
- Manual gate evidence remains file-backed for review and is not durable production storage.
- Quality-gate self-protection script is preparation only in this PR.

## Human Confirmation

- Merge decision
- Current head SHA
- CI status
- Quality-gate status
- Remaining blockers
