# Summary

Adds provider-specific external alert delivery boundaries, alert delivery plan generation, dry-run behavior, manual apply gate, credential fail-closed checks, payload safety, rollback/disable planning, and quality evidence.

PR profile: product_minor_r2
Task mode: feature

## Goal

Add an external alert provider delivery boundary without committing alert provider secrets, sending real provider alerts without manual approval, or enabling live YouTube account operation.

## Risk level

R3 product operations integration. Product code changed; runtime readiness is not claimed.

## Files or scope

Allowed paths: `apps/api/src/youtube/**`, `.codex/**`, `docs/**`, and `docs/process/CODEX_CLASSIFICATION_REGISTRY.json`.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, actual production deployment apply without manual gate, provider-specific dashboard deployment apply with real credentials, external alert delivery with real provider credentials without manual gate, and live YouTube account operation without manual gate.

## Task Contract

Task mode: product_minor_r2

Runtime readiness claim: no

Product code changed: yes

Runtime check: no server startup or provider connection is required for this additive helper boundary; local typecheck and unit tests verify the runtime import surface.

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, external alert provider mock test pass, provider-specific alert provider boundary test pass, alert delivery plan generation test pass, dry-run test pass, manual alert apply gate test pass, credential missing fail-closed test pass, alert routing parity test pass, payload safety test pass, rollback/disable plan test pass, no secret scan pass, and no scraping scan pass.

Verification surface: `apps/api/src/youtube/alert-delivery.test.ts`, `docs/ALERT_DELIVERY.md`, `docs/youtube-dashboard-contract.json`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `npm test`, secret scan, prohibited wording scan, and no-scraping scan.

Risk surface: alert delivery plan, provider-specific boundary, dry-run/apply state, manual approval gate, provider credential references, alert payload labels, docs/evidence parser inputs, and no production runtime claim.

Oracle provided: test.

Split reason: real provider SDK alert apply, external alert credentials, and live YouTube account operation remain separate manual-gated deployment/runtime work.

## Evidence Integrity

Base SHA: f064b58d5b320e6209e76ef3959aee8679f9ee9c

Head SHA: da13c28db9acfae8cad1d330dfb0d1a39ebdce06

Product CI: current-head GitHub Actions replay required after legacy self-test advisory routing push

Quality-gate: current-head GitHub Actions replay required after legacy self-test advisory routing push

Commit SHA: da13c28db9acfae8cad1d330dfb0d1a39ebdce06

Evidence freshness: GitHub checks must pass for the pushed PR head before merge review.

## Product Verification

- `ExternalAlertProvider` delivers alert plans through an injected provider boundary.
- `MockExternalAlertProvider` supports deterministic dry-run and manual-gated apply tests.
- `ProviderSpecificAlertProvider` wraps an injected provider without committing provider secrets.
- Alert delivery plan generation uses the tested YouTube alert routing config.
- Dry-run succeeds without manual approval.
- Apply fails closed unless `manualApproval` is true.
- Missing alert provider credential secret names fail closed.
- Alert payload metrics are declared YouTube metrics only.
- Alert payload labels exclude wallet addresses, OAuth tokens, API keys, raw messages, raw display names, secrets, and private URLs.
- Provider errors map to operator actions.
- Rollback and disable plan generation is available as operator steps.

## Acceptance Criteria

Acceptance criteria:

- External alert provider mock test passes.
- Provider-specific alert provider boundary test passes.
- Alert delivery plan generation test passes.
- Alert delivery dry-run test passes.
- Manual gate required for alert apply test passes.
- Alert provider credential missing fails closed test passes.
- Alert routing contract parity test passes.
- Alert payload uses declared metrics only test passes.
- Alert payload excludes secrets and raw user data test passes.
- Alert severity mapping test passes.
- Provider error maps to operator action test passes.
- Alert delivery rollback/disable plan test passes.
- Real external alert delivery remains disabled without manual gate.
- No public API route changes are introduced.
- No YouTube scraping, browser automation, HTML parsing, real secret commit, or production delivery apply without manual gate is introduced.

## Complexity Governance

Solvability constraints: keep the alert provider boundary injectable, avoid provider SDKs unless separately justified, avoid real credentials, keep apply manual-gated, and verify alert routing parity with tests.

Verification oracle: `apps/api/src/youtube/alert-delivery.test.ts` verifies provider mock, provider-specific wrapper, plan generation, dry-run, manual apply gate, credential fail-closed behavior, alert parity, payload safety, provider error mapping, and rollback/disable plan.

Auth oracle: no new authenticated route is introduced; credential safety is covered by fail-closed secret-name tests and alert delivery receives credential references only.

Storage oracle: no database migration, queue mutation, or persisted secret storage is introduced.

API compatibility oracle: public API unchanged; internal alert delivery helper surface is additive.

Reasoning evidence: selected delivery-plan boundary avoids coupling this PR to provider SDK apply, external alert credentials, or live YouTube operation.

Rollback or stop condition: revert this PR if alert payloads include unsafe fields, apply bypasses manual approval, or required checks fail on the pushed head.

## Best of N Evidence

Candidate count: 3

Selected candidate: provider-neutral alert delivery plan plus injected provider wrapper, dry-run, manual apply gate, credential fail-closed checks, payload safety, rollback plan, and provider error mapping.

Reason selected: it advances alert readiness while keeping real provider secrets, provider SDK apply, and live YouTube operation out of scope.

Rejected alternative 1: real provider SDK delivery in this PR. Rejected because it would require provider credentials and deployment-specific behavior.

Rejected alternative 2: docs-only alert plan. Rejected because it would not provide executable evidence for manual gate or payload safety.

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

- `corepack pnpm test`: pass, 19 test files, 165 passed tests, 6 skipped tests.

## Testing and review

Local test counts: 19 test files, 165 passed tests, and 6 skipped tests.

Risk summary: product code, alert delivery plan surface, provider-specific wrapper, manual apply gate, credential references, payload safety, docs, and quality evidence changed. No DB migration, public route, contract, wallet custody, token sale, exchange, cash-out, investment behavior, YouTube scraping, real provider delivery apply, or live account operation changed.

Review focus: manual apply gate, credential fail-closed behavior, alert routing parity, payload safety, provider error mapping, rollback/disable plan, no real secret commit, no scraping, and no production readiness claim.

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

Internal API: additive YouTube alert delivery helper surface.

Breaking changes: none intended.

Runtime readiness: not claimed.

## Test Coverage Evidence

Changed area: external alert delivery provider boundary, delivery plan generation, dry-run/apply behavior, manual approval gate, credential fail-closed behavior, payload safety, rollback/disable plan, and evidence docs.

Risk: delivery apply could bypass manual approval, alert plan could diverge from routing config, provider errors could lack operator action, unsafe labels could leak sensitive fields, or provider credential references could be missing.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: mock provider, provider-specific wrapper, delivery plan generation, dry-run, manual apply gate, credential missing fail-closed behavior, alert routing parity, declared metrics, safe payload labels, severity mapping, provider error mapping, rollback/disable plan, and real external alert delivery disabled without manual gate.

Edge cases and failure paths: missing credential secret names throw, apply without manual approval throws, unsafe label keys are removed from alert payloads, provider credential and rate-limit failures map to operator actions, and real provider delivery remains disabled without manual gate.

Uncovered risks: real provider SDK alert delivery apply, external alert delivery with real provider credentials, and live YouTube account operation.

## Residual risks

- Real provider SDK alert delivery apply remains manual-gated deployment work.
- External alert delivery with real credentials remains provider integration work.
- Live YouTube account operation remains manual-gated and out of CI.



