# Summary

Add provider apply job state-machine preparation for harness v1.1.4 with transition validation, compensation design, safe audit evidence, and repository boundaries without real provider SDK apply or production deployment.

PR profile: harness_workflow_r3
Task mode: feature

## Task Contract

Goal: Add provider apply job state-machine preparation for harness v1.1.4 with transition validation, compensation design, safe audit evidence, and repository boundaries without real provider SDK apply or production deployment.

Allowed scope: provider_deployment_job_state_machine, provider_deployment_job_repository_boundary, provider_deployment_transition_audit_helper, provider_apply_compensation_design, manual_gate_used_consistency_checks, tests, docs, .codex evidence.

Forbidden scope: real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, YouTube connector changes, Chain Listener changes, durable events runtime changes, wallet/RPC/deploy changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: provider deployment job transition validator allows only approved transitions; running cancellation is rejected after external provider apply starts; applied jobs require external_provider_apply_started manual_gate_mark_used_attempted and manual_gate_mark_used_succeeded; compensation_required is recorded when provider apply succeeded but manual gate mark-used failed; provider deployment job repository rejects duplicate job IDs; provider deployment job repository records safe transition audits; audit summary rejects secrets private URLs wallet addresses and raw fields; docs describe transaction boundary prep and compensation design; PR #35 audit regression tests still pass; no secret scan passes; no scraping scan passes; required checks pass on PR head; compensation_required is only valid on failed jobs after provider apply started and manual gate mark-used failed; transition audit IDs are deterministic.

## Evidence Integrity

Head SHA: 20981271285757b7561a11d7a78832c43eace049

Base SHA: 8f0699f6a8f9c84b4ee874d4abab732fa64e9f2c

Product CI: success

Quality-gate: success

CI run: 27174995541

Quality-gate run: 27175137193

Quality-gate artifact: 7495462097

Tests: 26 test files, 269 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-provider-apply-job-state-machine-v114-prep.md`
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
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: local advisory before PR creation
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts or runtime dependencies are changed.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds internal provider deployment job state, repository, audit helper, and compensation design without changing external API, contract ABI, YouTube connector, Chain Listener, IRIS delivery payloads, or real provider SDK execution.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR adds offline state-machine and repository boundaries, not production deployment execution.

Review scope and verification:

- Scope: Provider deployment job state machine, transition validation, compensation-required state, safe transition audit helper, in-memory repository boundary, docs, and evidence.
- Risk summary: Main risk is allowing forbidden job transitions, recording applied without provider side effects, mark-used attempt, and manual gate mark-used success, or leaking provider secrets in job/audit summaries.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 26 files, 269 passed, 6 skipped.

## Security Boundaries

- No real provider SDK apply is implemented.
- No actual production deployment apply is implemented.
- Provider job records store safe summaries only, never secret values or raw provider responses.
- Applied provider jobs require external provider apply started, manual gate mark-used attempted, and manual gate mark-used succeeded.
- Compensation-required evidence is safe-summary only and does not store provider credentials.
- GitHub unsafe log sources were not read.
- YouTube scraping remains forbidden.

## Residual risks

- Persistent transaction boundary remains future work; this PR prepares state and compensation semantics without claiming DB-backed atomic execution.
- Real provider SDK apply remains future work; no provider SDK, credential, webhook, or provider call path is introduced.
- Actual production deployment apply remains out of scope; production-like apply still requires approved manual gate evidence and a separate owner-controlled execution path.
- Compensation execution remains future work; this PR records when compensation is required and documents operator handling without executing rollback automatically.
- Live YouTube operation remains manual-gated and unchanged.

## Human Confirmation

- Human owner confirmation is required before production-like apply.
- AI review recommendations are not recorded as human approval.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Review Independence

- Independent AI Pro review identified merge-blocking evidence and state-machine hardening issues.
- This PR update addresses those findings in code, tests, docs, and evidence without weakening quality-gate, secret scan, no-scraping scan, or manual gate requirements.
- Human owner confirmation remains required before production-like provider apply.

## Best of N Evidence

- Review candidates were evaluated against provider job invariants, compensation safety, deterministic audit identity, evidence freshness, and forbidden scope preservation.
- Selected fix path keeps the smallest product-scoped change: state invariants, repository audit IDs, targeted tests, and evidence/doc refresh only.
- Rejected paths included weakening quality-gate, bypassing evidence freshness, broad runtime/provider SDK changes, or claiming production readiness.
