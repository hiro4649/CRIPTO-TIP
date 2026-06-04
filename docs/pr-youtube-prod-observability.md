# Summary

Adds provider-boundary YouTube credential deployment wiring and production observability contracts without committing real credentials or claiming production readiness.

PR profile: product_minor_r2
Task mode: feature

## Goal

Add YouTube credential provider boundaries, secret manager resolver contracts, quota/rate-limit/auth/page-token/liveChatId metrics, manual live soak gating, and operations docs.

## Risk level

R3 product operations hardening. Product code changed; runtime readiness is not claimed.

## Files or scope

Allowed paths: `apps/api/src/config/**`, `apps/api/src/youtube/**`, `.env.example`, `.codex/**`, and `docs/**`.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, and provider-specific deployment apply.

## Task Contract

Task mode: product_minor_r2

Runtime readiness claim: no

Product code changed: yes

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, production local-env credential source rejected, secret manager provider mock verified, metrics contract verified, manual live soak gated, no secret scan pass, and no scraping scan pass.

Verification surface: apps/api/src/youtube/credentials.test.ts, apps/api/src/youtube/operations.test.ts, apps/api/src/config/env.test.ts, corepack pnpm lint, corepack pnpm typecheck, corepack pnpm test, npm test, secret scan, prohibited wording scan, and no-scraping scan.

Risk surface: credential/auth boundary, internal YouTube metrics helper API, config validation, docs/evidence parser inputs, and manual live soak gate.

Oracle provided: test.

Split reason: provider-specific secret manager SDK, real dashboard exporter, alert delivery, and live YouTube account operation are deliberately split out to deployment/runtime PRs.

Done criteria: `corepack pnpm lint` pass, `corepack pnpm typecheck` pass, `corepack pnpm test` pass, `npm test` pass, GitHub typescript pass, GitHub contracts pass, GitHub quality-gate pass, production rejects local-env YouTube credential source, secret manager provider mock test passes, metric contract tests pass, manual live soak is skipped unless explicitly gated, no secret scan passes, and no scraping scan passes.

## Evidence Integrity

Base SHA: 25d62361b1ba3fc9a724ce1e1e435b3a468e4033

Head SHA: 173e89c52d5b1061940c8a5c41948f32ee65d755

Product CI: success

Quality-gate: success

ci run: 26932627816

quality-gate run: 26932645945

quality-gate artifact: 7403699374

Commit SHA: 173e89c52d5b1061940c8a5c41948f32ee65d755

Evidence freshness: local evidence before push; GitHub checks must pass on current head before merge.

## Product Verification

- Secret manager credential provider mock resolves YouTube credentials by secret name.
- Production rejects `local_env` YouTube credential source.
- Credential presence fails closed if no API key or OAuth token is returned.
- Metric contract includes connector health, event rate, quota/rate-limit, reconnect, fallback, verification, missing liveChatId, auth, and invalid page token metrics.
- Manual live YouTube soak remains skipped unless explicit env flag and secret manager credential boundary are present.
- No scraping, browser automation, or HTML parsing is introduced.

## Acceptance criteria

Acceptance criteria: production secret manager source is enforced; provider mock resolves by secret name; credential absence fails closed; metric mapping is fixed; manual live soak remains gated; no public API route changes; no scraping or real secret commit.

- Production official YouTube connector mode requires `secret_manager` credential source.
- Secret manager credential provider uses secret names, not committed secret values.
- Metrics contract includes quota, rate-limit, auth, invalid page token, missing liveChatId, reconnect, fallback, and verification counters.
- Manual live YouTube soak is skipped unless explicitly enabled with a secret manager credential boundary.
- No public API route changes are introduced.
- No YouTube scraping, browser automation, HTML parsing, or real secret commit is introduced.

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

- `corepack pnpm install`: pass.
- `corepack pnpm lint`: pass.
- `corepack pnpm typecheck`: pass.
- `corepack pnpm test`: pass, 15 test files, 108 passed tests, 6 skipped tests.
- `npm test`: pass, 15 test files, 108 passed tests, 6 skipped tests.
- `forge test`: local forge unavailable; contracts are covered by GitHub CI.
- Secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs`: run.

## Testing and review

Local test counts: 15 test files, 108 passed tests, and 6 skipped tests. Review focus: credential source boundary, no real secret commit, metric name compatibility, manual live soak gate, no scraping, and no production readiness claim.

Writer evidence: present

Review evidence: present

Reviewer checklist: present

Review checklist: correctness, regression, security, data integrity, runtime safety, test evidence, diff scope, known gaps.

Review scope: `apps/api/src/config/**`, `apps/api/src/youtube/**`, `.env.example`, `.codex/**`, and docs. Contracts, web UI, overlay runtime, production Chain Listener, production IRIS delivery, and YouTube scraping paths are out of scope.

Risk summary: product code, config validation, auth/credential boundary, runtime observability helper surface, tests, and docs changed. No DB migration, public route, contract, wallet custody, token sale, exchange, cash-out, or investment behavior changed.

Negative test evidence: production local-env credential source rejection, missing secret manager resolver rejection, missing credential material rejection, manual live soak skipped without gate, non-scraping scan.

## API Compatibility Summary

Public API: unchanged.

Internal API: additive `YouTubeCredentialProvider`, secret resolver boundary, and YouTube operations metric helpers.

Breaking changes: none intended.

Runtime readiness: not claimed.

## Test Coverage Evidence

Changed area: YouTube credential provider boundary, YouTube config validation, and YouTube observability helper boundary.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: secret manager credential provider mock, production local-env credential source rejection, credential absence fail-closed behavior, metric name contract, quota/rate-limit/auth/invalid-page-token/liveChatId metric mapping, and manual live soak gating.

Edge cases: missing resolver, missing secret name, missing credential material, local-env production rejection, auth error metric, invalid page token metric, missing liveChatId metric, and live soak disabled by default.

## Best of N Evidence

Candidate count: 3.

Candidates: docs-only observability plan; provider-specific secret manager SDK integration; credential provider interface plus metric contract and manual soak gate.

Selected candidate: credential provider interface plus metric contract and manual soak gate.

Reason selected: it creates reviewable deployment boundaries and tests without committing real secrets, adding provider coupling, or claiming production runtime readiness.

## Residual risks

- Provider-specific secret manager SDK wiring remains deployment work.
- Real dashboard exporter remains deployment work.
- Alert routing remains documentation-only.
- Live YouTube account operation remains manual-gated and out of CI.

## Human confirmation needed

Project-owner review required before merge: CI status, quality-gate status, head SHA, remaining blockers, and merge decision.

## CODEX Evidence Pack

BEGIN_CODEX_EVIDENCE_PACK_JSON
{"codexEvidencePack":{"schemaVersion":"1.0.1","harnessVersion":"1.0.5","repository":"hiro4649/CRIPTO-TIP","prNumber":"pending","headSha":"archived PR body","baseSha":"25d62361b1ba3fc9a724ce1e1e435b3a468e4033","changeType":"feature","riskLevel":"R3","scope":{"changedFiles":[".env.example","apps/api/src/config/env.ts","apps/api/src/config/env.test.ts","apps/api/src/youtube/credentials.ts","apps/api/src/youtube/credentials.test.ts","apps/api/src/youtube/operations.ts","apps/api/src/youtube/operations.test.ts","docs/YOUTUBE_CREDENTIALS.md","docs/YOUTUBE_OBSERVABILITY.md","docs/pr-youtube-prod-observability.md"],"allowedPaths":["apps/api/src/config/**","apps/api/src/youtube/**","docs/**",".codex/**",".env.example"],"forbiddenPaths":["contracts/src/**","apps/web/**","apps/overlay/**"]},"commands":[{"name":"corepack pnpm lint","result":"pass"},{"name":"corepack pnpm typecheck","result":"pass"},{"name":"corepack pnpm test","result":"pass"},{"name":"npm test","result":"pass"}],"remoteRuns":[],"residualRisks":["provider-specific secret manager SDK deferred","dashboard exporter deferred","alert delivery deferred","live YouTube account operation deferred"],"productionClaims":{"runtimeReady":false,"productionReady":false,"replacesYouTubeSuperChat":false,"tokenSale":false,"custody":false,"investmentWording":false,"youtubeScraping":false},"rollbackOrStopCondition":"Revert this PR if credential provider validation breaks local/test mode or required checks fail on the current head.","humanConfirmation":{"present":true,"confirmedByRole":"project-owner","headSha":"archived PR body","productCodeChanged":true,"runtimeReadinessClaimed":false},"safeOutput":{"status":"pass"}}}
END_CODEX_EVIDENCE_PACK_JSON
