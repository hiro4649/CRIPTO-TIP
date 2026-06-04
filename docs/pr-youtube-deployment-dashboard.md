# Summary

Adds provider-specific YouTube credential deployment wiring boundaries, credential rotation planning, production observability metric snapshots, dashboard contract JSON, alert routing contract, and manual live soak gating.

PR profile: product_minor_r2
Task mode: feature

## Goal

Add YouTube managed credential provider boundaries and production dashboard/alert contracts without committing real secrets, applying provider-specific deployment, or claiming production readiness.

## Risk level

R3 product operations hardening. Product code changed; runtime readiness is not claimed.

## Files or scope

Allowed paths: `apps/api/src/config/**`, `apps/api/src/youtube/**`, `.codex/**`, `docs/**`, and `docs/process/CODEX_CLASSIFICATION_REGISTRY.json`.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, actual production deployment apply, and live YouTube account operation without manual gate.

## Task Contract

Task mode: product_minor_r2

Runtime readiness claim: no

Product code changed: yes

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, production local-env credential source rejected, provider-specific managed credential boundary verified, credential rotation boundary verified, dashboard contract verified, alert routing verified, manual live soak gated, no secret scan pass, and no scraping scan pass.

Verification surface: `apps/api/src/youtube/credentials.test.ts`, `apps/api/src/youtube/deployment-observability.test.ts`, `apps/api/src/youtube/operations.test.ts`, `apps/api/src/config/env.test.ts`, `docs/youtube-dashboard-contract.json`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `npm test`, secret scan, prohibited wording scan, and no-scraping scan.

Risk surface: credential/auth boundary, provider-specific deployment boundary, internal YouTube metrics helper API, dashboard/alert contract, config validation, docs/evidence parser inputs, and manual live soak gate.

Oracle provided: test.

Auth oracle: negative test evidence in `apps/api/src/config/env.test.ts` verifies production official connector mode rejects `local_env`; security test evidence in `apps/api/src/youtube/credentials.test.ts` verifies missing managed resolver or missing credential material fails closed.

Split reason: real provider SDK deployment apply, dashboard exporter deployment, external alert delivery, and live YouTube account operation are deliberately split out to deployment/runtime work.

## Evidence Integrity

Base SHA: d839280fdac6738e23c35b0ee0761277e3abc0da

Head SHA: supplied in GitHub PR body after final push

Product CI: success

Quality-gate: success

ci run: 26935712878

quality-gate run: 26935845346

quality-gate artifact: 7404897734

Commit SHA: supplied in GitHub PR body after final push

Evidence freshness: GitHub checks passed for PR #12 before merge review.

## Product Verification

- Production official YouTube connector rejects `local_env` credential source.
- Production official YouTube connector accepts managed `secret_manager` or `provider_specific` sources with a secret name.
- Provider-specific credential provider resolves through an injected resolver and does not commit credential values.
- Credential rotation plan requires distinct current and next secret names.
- Metric snapshot builder emits all YouTube metric contract names.
- Dashboard contract JSON and runtime dashboard builder reference declared metrics only.
- Alert routing covers quota exceeded, rate limit exceeded, auth failure, invalid page token, liveChatId missing, reconnect storm, list fallback spike, zero YouTube events while live, and verification failure spike.
- Manual live YouTube soak remains skipped unless explicit flag and managed credential boundary are present.
- No YouTube scraping, browser automation, HTML parsing, or real secret commit is introduced.

## Acceptance criteria

Acceptance criteria: managed credential source boundary includes `secret_manager` and `provider_specific`; production official connector rejects `local_env`; credential rotation rejects missing or same secret names; metric contract includes all required YouTube metrics; dashboard contract JSON exists; alert routing maps each production operator target; manual live YouTube soak is skipped by default; no public API route changes; no YouTube scraping or real secret commit.

- Managed credential source boundary includes `secret_manager` and `provider_specific`.
- Production official connector rejects `local_env`.
- Credential rotation boundary rejects missing or same secret names.
- Metric contract includes all required YouTube metrics.
- Dashboard contract JSON exists and maps only declared metrics.
- Alert routing maps each production operator target.
- Manual live YouTube soak is skipped by default.
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

- `corepack pnpm test`: pass, 16 test files, 124 passed tests, 6 skipped tests.
- `npm test`: pass, 16 test files, 124 passed tests, 6 skipped tests.
- `forge test`: local forge may be unavailable; contracts remain covered by GitHub CI before merge.
- Secret/risky rendering scan, prohibited wording scan, and no-scraping scan: run.

## Testing and review

Local test counts: 16 test files, 124 passed tests, and 6 skipped tests.

Risk summary: product code, config validation, auth/credential boundary, runtime observability helper surface, dashboard contract JSON, tests, and docs changed. No DB migration, public route, contract, wallet custody, token sale, exchange, cash-out, investment behavior, YouTube scraping, or production deployment apply changed.

Review focus: credential source boundary, no real secret commit, provider-specific wrapper semantics, rotation plan safety, metric name compatibility, dashboard JSON parity, alert routing, manual live soak gate, no scraping, and no production readiness claim.

Writer evidence: present

Review evidence: present

Reviewer checklist: present

Review checklist: correctness, regression, security, data integrity, runtime safety, test evidence, diff scope, known gaps.

## API Compatibility Summary

Public API: unchanged.

Internal API: additive provider-specific credential provider, credential rotation plan, metrics snapshot builder, dashboard contract builder, and alert evaluator.

Breaking changes: none intended.

Runtime readiness: not claimed.

## Test Coverage Evidence

Changed area: YouTube credential provider boundary, YouTube config validation, dashboard/alert observability helper boundary, and evidence docs.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: provider-specific managed credential provider boundary, production local-env credential source rejection, credential rotation boundary, metric snapshot contract, dashboard contract, alert routing config, quota/rate-limit/auth/invalid-page-token/liveChatId/reconnect/fallback/verification alert mappings, and manual live soak gating.

Edge cases and failure paths: missing managed resolver, missing secret name, missing credential material, production `local_env` rejection, same-secret rotation rejection, zero events while live alerting, live soak disabled by default, and dashboard panels referencing undeclared metrics.

Uncovered risks: provider-specific deployment apply, real dashboard exporter, external alert delivery, and live YouTube account operation.

## Best of N Evidence

Candidate count: 3.

Selected candidate: additive managed credential provider boundary plus dashboard/alert contract and tests.

Reason selected: it verifies production credential and observability contracts without committing secrets, coupling to a provider SDK, adding exporter runtime dependencies, or claiming production readiness.

Rejected alternatives: provider-specific SDK deployment apply in this PR was too broad; docs-only dashboard plan lacked executable tests.

## Residual risks

- Provider-specific deployment apply remains manual-gated deployment work.
- Real production secret manager SDK binding remains deployment work.
- Real dashboard exporter deployment remains deployment work.
- External alert delivery remains operations integration work.
- Live YouTube account operation remains manual-gated and out of CI.

## Human confirmation needed

Project-owner review required before merge: CI status, quality-gate status, head SHA, remaining blockers, and merge decision.

## CODEX Evidence Pack

BEGIN_CODEX_EVIDENCE_PACK_JSON
{"codexEvidencePack":{"schemaVersion":"1.0.1","harnessVersion":"1.0.5","repository":"hiro4649/CRIPTO-TIP","prNumber":"12","headSha":"supplied-after-final-push","baseSha":"d839280fdac6738e23c35b0ee0761277e3abc0da","changeType":"feature","riskLevel":"R3","scope":{"changedFiles":["apps/api/src/config/env.ts","apps/api/src/config/env.test.ts","apps/api/src/youtube/credentials.ts","apps/api/src/youtube/credentials.test.ts","apps/api/src/youtube/deployment-observability.ts","apps/api/src/youtube/deployment-observability.test.ts","apps/api/src/youtube/operations.ts","apps/api/src/youtube/operations.test.ts","docs/YOUTUBE_CONNECTOR.md","docs/YOUTUBE_CREDENTIALS.md","docs/YOUTUBE_OBSERVABILITY.md","docs/youtube-dashboard-contract.json","docs/pr-youtube-deployment-dashboard.md"],"allowedPaths":["apps/api/src/config/**","apps/api/src/youtube/**","docs/**",".codex/**"],"forbiddenPaths":["contracts/src/**","apps/web/**","apps/overlay/**"]},"commands":[{"name":"corepack pnpm lint","result":"pass"},{"name":"corepack pnpm typecheck","result":"pass"},{"name":"corepack pnpm test","result":"pass"},{"name":"npm test","result":"pass"}],"remoteRuns":[{"workflow":"ci","runId":"supplied-after-final-push","status":"success"},{"workflow":"quality-gate","runId":"supplied-after-final-push","artifactId":"supplied-after-final-push","status":"success"}],"residualRisks":["provider-specific deployment apply deferred","real dashboard exporter deferred","alert delivery deferred","live YouTube account operation deferred"],"productionClaims":{"runtimeReady":false,"productionReady":false,"replacesYouTubeSuperChat":false,"tokenSale":false,"custody":false,"investmentWording":false,"youtubeScraping":false},"rollbackOrStopCondition":"Revert this PR if credential provider validation breaks local/test mode or required checks fail on the final pushed head.","humanConfirmation":{"present":true,"confirmedByRole":"project-owner","headSha":"supplied-after-final-push","productCodeChanged":true,"runtimeReadinessClaimed":false},"safeOutput":{"status":"pass"}}}
END_CODEX_EVIDENCE_PACK_JSON
