# Summary

Adds provider-specific dashboard/exporter deployment boundaries, dashboard deployment plan generation, dry-run behavior, manual apply gate, credential fail-closed checks, rollback planning, and alert routing provider stub evidence.

PR profile: product_minor_r2
Task mode: feature

## Goal

Add a dashboard provider deployment boundary without committing dashboard provider secrets, applying production deployment without manual approval, or enabling real external alert delivery.

## Risk level

R3 product operations integration. Product code changed; runtime readiness is not claimed.

## Files or scope

Allowed paths: `apps/api/src/youtube/**`, `.codex/**`, `docs/**`, and `docs/process/CODEX_CLASSIFICATION_REGISTRY.json`.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, actual production deployment apply without manual gate, external alert delivery with real provider credentials, and live YouTube account operation without manual gate.

## Task Contract

Task mode: product_minor_r2

Runtime readiness claim: no

Product code changed: yes

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, dashboard provider mock test pass, provider-specific dashboard provider boundary test pass, deployment plan generation test pass, dry-run test pass, manual apply gate test pass, credential missing fail-closed test pass, dashboard contract parity test pass, alert routing stub test pass, rollback plan test pass, no secret scan pass, and no scraping scan pass.

Verification surface: `apps/api/src/youtube/dashboard-deployment.test.ts`, `docs/DASHBOARD_DEPLOYMENT.md`, `docs/youtube-dashboard-contract.json`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `npm test`, secret scan, prohibited wording scan, and no-scraping scan.

Risk surface: dashboard deployment plan, provider-specific boundary, dry-run/apply state, manual approval gate, provider credential references, alert routing stub, docs/evidence parser inputs, and no production runtime claim.

Oracle provided: test.

Split reason: real provider SDK deployment apply, external alert delivery with real credentials, and live YouTube account operation remain separate manual-gated deployment/runtime work.

## Evidence Integrity

Base SHA: 120329fe2fe99b842d684f89e065b85cea07ca47

Head SHA: final pushed commit recorded in GitHub PR body

Product CI: success after GitHub Actions pass on the pushed PR head

Quality-gate: success after GitHub Actions pass on the pushed PR head

Commit SHA: final pushed commit recorded in GitHub PR body

Evidence freshness: local evidence collected before push; GitHub checks must pass on the final PR head before merge.

## Product Verification

- `DashboardProvider` deploys dashboard plans through an injected provider boundary.
- `MockDashboardProvider` supports deterministic dry-run and manual-gated apply tests.
- `ProviderSpecificDashboardProvider` wraps an injected provider without committing provider secrets.
- Dashboard deployment plan generation uses the dashboard contract.
- Dry-run succeeds without manual approval.
- Apply fails closed unless `manualApproval` is true.
- Missing dashboard provider credential secret names fail closed.
- Dashboard panels reference declared metrics only.
- Alert routing provider remains a stub and real external alert delivery remains disabled.
- Provider errors map to operator actions.
- Rollback plan generation is available as operator steps.

## Acceptance Criteria

Acceptance criteria:

- Dashboard provider mock test passes.
- Provider-specific dashboard provider boundary test passes.
- Dashboard deployment plan generation test passes.
- Dashboard deployment dry-run test passes.
- Manual gate required for apply test passes.
- Dashboard provider credential missing fails closed test passes.
- Dashboard contract parity test passes.
- Dashboard panels reference declared metrics only test passes.
- Dashboard alert labels parity test passes.
- Provider error maps to operator action test passes.
- Dashboard rollback plan test passes.
- Alert routing provider stub test passes.
- External alert delivery real provider remains disabled.
- No public API route changes are introduced.
- No YouTube scraping, browser automation, HTML parsing, real secret commit, or production deployment apply without manual gate is introduced.

## Complexity Governance

Solvability constraints: keep the deployment provider boundary injectable, avoid provider SDKs unless separately justified, avoid real credentials, keep apply manual-gated, and verify deployment plan parity with tests.

Verification oracle: `apps/api/src/youtube/dashboard-deployment.test.ts` verifies provider mock, provider-specific wrapper, plan generation, dry-run, manual apply gate, credential fail-closed behavior, dashboard parity, alert stub, provider error mapping, and rollback plan.

Auth oracle: no new authenticated route is introduced; credential safety is covered by fail-closed secret-name tests and provider deployment receives credential references only.

Storage oracle: no database migration, queue mutation, or persisted secret storage is introduced.

API compatibility oracle: public API unchanged; internal dashboard deployment helper surface is additive.

Reasoning evidence: selected deployment-plan boundary avoids coupling this PR to provider SDK apply, external alert credentials, or live YouTube operation.

Rollback or stop condition: revert this PR if deployment plans diverge from the dashboard contract, apply bypasses manual approval, or required checks fail on the current head.

## Best of N Evidence

Candidate count: 3

Selected candidate: provider-neutral dashboard deployment plan plus injected provider wrapper, dry-run, manual apply gate, credential fail-closed checks, rollback plan, and alert stub.

Reason selected: it advances deployment readiness while keeping real provider secrets, provider SDK apply, and external alert delivery out of scope.

Rejected alternative 1: real provider SDK apply in this PR. Rejected because it would require provider credentials and deployment-specific behavior.

Rejected alternative 2: docs-only deployment plan. Rejected because it would not provide executable evidence for manual gate or dashboard parity.

## Validation commands

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `cd contracts && forge test || true`
- secret/risky rendering scan
- prohibited wording scan
- no-scraping scan

## Tests or checks run

- `corepack pnpm test`: pass, 18 test files, 151 passed tests, 6 skipped tests.
- `npm test`: pass, 18 test files, 151 passed tests, 6 skipped tests.
- `forge test`: local forge may be unavailable; contracts remain covered by GitHub CI before merge.
- Secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs`: run.

## Testing and review

Local test counts: 18 test files, 151 passed tests, and 6 skipped tests.

Risk summary: product code, dashboard deployment plan surface, provider-specific wrapper, manual apply gate, credential references, alert stub, docs, and quality evidence changed. No DB migration, public route, contract, wallet custody, token sale, exchange, cash-out, investment behavior, YouTube scraping, real provider deployment apply, or live account operation changed.

Review focus: manual apply gate, credential fail-closed behavior, dashboard contract parity, alert routing stub, provider error mapping, rollback plan, no real secret commit, no scraping, and no production readiness claim.

Writer evidence: present

Review evidence: present

Reviewer checklist: present

Review checklist: correctness, regression, security, data integrity, runtime safety, test evidence, diff scope, known gaps.

## Human Confirmation

Human confirmation: present

Product code changed: yes

Runtime readiness claimed: no

Project-owner review required before merge: CI status, quality-gate status, head SHA, remaining blockers, and merge decision.

## API Compatibility Summary

Public API: unchanged.

Internal API: additive YouTube dashboard deployment helper surface.

Breaking changes: none intended.

Runtime readiness: not claimed.

## Test Coverage Evidence

Changed area: dashboard deployment provider boundary, deployment plan generation, dry-run/apply behavior, manual approval gate, credential fail-closed behavior, alert routing stub, rollback plan, and evidence docs.

Risk: deployment apply could bypass manual approval, dashboard plan could diverge from declared metrics, provider errors could lack operator action, or provider credential references could be missing.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: mock provider, provider-specific wrapper, deployment plan generation, dry-run, manual apply gate, credential missing fail-closed behavior, dashboard contract parity, panel metric declarations, alert label parity, provider error mapping, rollback plan, and alert routing stub.

Edge cases and failure paths: missing credential secret names throw, apply without manual approval throws, provider credential errors map to operator action, and real external alert delivery remains disabled.

Uncovered risks: real provider SDK deployment apply, external alert delivery with real provider credentials, and live YouTube account operation.

## Residual risks

- Real provider SDK deployment apply remains manual-gated deployment work.
- External alert delivery with real credentials remains provider integration work.
- Live YouTube account operation remains manual-gated and out of CI.
