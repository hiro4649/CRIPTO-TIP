# Summary

Adds production YouTube credential and operations hardening for CRIPTO-TIP without connecting to a real production YouTube account or committing secrets.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Task mode: product_minor_r2

Goal: add YouTube credential source validation, quota/rate-limit metric contracts, streamList reconnect/list fallback operational boundaries, liveChatId acquisition boundary, deterministic mock soak coverage, and runbook evidence.

Allowed scope: YouTube config validation, YouTube operations boundary, tests, docs, quality evidence.

Forbidden scope: token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping; TikTok connector; multi-platform connector; multi-chain support; multi-token support; wallet custody.

Runtime readiness claim: no

Product code changed: yes

Done criteria: `corepack pnpm lint` pass; `corepack pnpm typecheck` pass; `corepack pnpm test` pass; `npm test` pass; GitHub typescript pass; GitHub contracts pass; GitHub quality-gate pass; production official YouTube connector rejects local-env credential source; operations tests cover metrics, liveChatId boundary, reconnect, fallback, polling interval, and deterministic soak; no scraping scan has no runtime scraping dependency.

Verification surface: config validation tests, YouTube operations unit tests, existing connector tests, local lint/typecheck/test, GitHub CI, quality-gate, secret/risky rendering scan, prohibited wording scan, and no-scraping scan.

Solvability constraints: no production YouTube account is used; no real credential is committed; no production runtime readiness is claimed; only deterministic tests and documented operational boundaries are added.

Release gate oracle: required GitHub checks must pass on the current head before merge; project-owner review decides merge.

Rollback condition: revert this commit if production credential validation blocks local/test mode, if connector tests regress, or if quality-gate fails on current head.

## Evidence Integrity

Base SHA: b01db3c5bc7e8af3ac3c0f4925f7400e1bb83259

Head SHA: current PR head at creation

Product CI: pending until GitHub Actions run

Quality-gate: pending until GitHub Actions run

Commit SHA: current PR head at creation

Evidence freshness: current local head before push.

## Product Verification

- Production official YouTube connector rejects local-env credential source.
- Metrics names are defined for quota, rate-limit, reconnect, fallback, events, connection, and verification outcomes.
- `liveChatId` acquisition is constrained to live session data, not scraping.
- Quota/rate-limit 403 reasons classify as retry/backoff operational errors.
- Auth, invalid page token, and non-quota 403 states remain operator-action/non-retry.
- `streamList` reconnect is bounded by retryability and max attempts.
- `list` fallback remains limited to unavailable streamList responses.
- Fallback polling respects `pollingIntervalMillis` with a local minimum.
- Deterministic mock soak covers long-running behavior without network, secrets, sleeping, scraping, or HTML parsing.

## Tests or checks run

- `corepack pnpm install`: pass.
- `corepack pnpm lint`: pass.
- `corepack pnpm typecheck`: pass.
- `corepack pnpm test`: pass, 14 test files, 100 passed tests, 6 skipped tests.
- `npm test`: pass, 14 test files, 100 passed tests, 6 skipped tests.
- `forge test`: local forge unavailable; contracts are covered by GitHub CI.
- Secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs`: run.

## Testing and review

Tests or checks run locally before commit: `corepack pnpm install` pass; `corepack pnpm lint` pass; `corepack pnpm typecheck` pass; `corepack pnpm test` pass with 14 test files, 100 passed tests, and 6 skipped tests; `npm test` pass with 14 test files, 100 passed tests, and 6 skipped tests; local forge unavailable; secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs` run.

Review focus: credential boundary, no secret commit, no scraping, quota metrics, reconnect/fallback behavior, liveChatId boundary, and deferred production runtime claims.

Writer evidence: present
Review evidence: present
Writer evidence present: true
Review evidence present: true
Review checklist present: true
Reviewer role: project-owner
Reviewer checklist: present
Review checklist: correctness, regression, security, data integrity, runtime safety, test evidence, diff scope, known gaps.
Risk summary: product code, config, runtime-operation docs, and API-adjacent YouTube boundary changed; no database migration, package change, production connector activation, or runtime readiness claim.

## Test Coverage Evidence

Test files: 14
Tests passed: 100
Tests skipped: 6
Changed area: YouTube production credential config and YouTube operations boundary.
Test command: `corepack pnpm test` and `npm test`.
What the test covers: production credential source validation, metric names, liveChatId acquisition, quota/rate-limit classification, non-retry operator actions, streamList reconnect, list fallback, polling interval handling, deterministic mock soak, and no-scraping guard.
Edge cases: missing liveChatId throws, non-quota 403 remains non-retryable, invalid page token is operator action, fallback is limited to 404/501, and local minimum polling prevents tight loops.
Coverage evidence file: `.codex/test-coverage-evidence.json`
Covered risks: YouTube production credential source boundary, metric name contract, liveChatId acquisition boundary, quota/rate-limit operational classification, non-retry operator actions, bounded streamList reconnect, list fallback scope, polling interval handling, deterministic mock soak, and no-scraping guard.
Uncovered risks: live YouTube account soak, dashboard exporter, alert routing, and provider-specific secret manager wiring.

## API Compatibility Summary

Public API: no public API surface changes.
Internal API: adds YouTube operations helper functions and production credential config fields.
Breaking changes: none intended.
Compatibility: local/test default mode remains `mock`; production official mode gains stricter credential source validation.

## Best of N Evidence

Candidate count: 3.
Candidates: document-only operations hardening; implement production provider-specific secret manager client; add config/operations boundary with deterministic tests.
Selected candidate: add config/operations boundary with deterministic tests.
Reason selected: it improves production readiness evidence without adding real secrets, provider coupling, live YouTube dependencies, or runtime readiness claims.

## Complexity Governance

Reasoning evidence: this is a product_minor_r2 operations-hardening change with config, runtime-operation boundary, docs, and evidence files.
Auth oracle: `apps/api/src/config/env.test.ts` verifies production official connector mode requires secret manager credential source.
API compatibility oracle: this PR adds internal helpers only and preserves public API compatibility.
Split reason: provider-specific secret manager wiring, dashboard exporter, alert routing, and live YouTube soak are split out to deployment/observability work.

## Residual risks

Live YouTube API soak, real dashboard wiring, alert routing, provider-specific secret manager integration, and production account authorization review remain follow-up work.

## CODEX Evidence Pack

BEGIN_CODEX_EVIDENCE_PACK_JSON
{"codexEvidencePack":{"schemaVersion":"1.0.1","harnessVersion":"1.0.1","repository":"hiro4649/CRIPTO-TIP","prNumber":"10","headSha":"HEAD_SHA_PLACEHOLDER","baseSha":"b01db3c5bc7e8af3ac3c0f4925f7400e1bb83259","changeType":"feature","riskLevel":"R3","scope":{"changedFiles":[".env.example","apps/api/src/config/env.ts","apps/api/src/config/env.test.ts","apps/api/src/youtube/operations.ts","apps/api/src/youtube/operations.test.ts","docs/pr-youtube-ops-hardening.md"],"allowedPaths":["apps/api/src/config/**","apps/api/src/youtube/**","docs/**",".codex/**",".env.example"],"forbiddenPaths":["contracts/src/**","apps/web/**","apps/overlay/**"]},"commands":[{"name":"corepack pnpm lint","result":"pass"},{"name":"corepack pnpm typecheck","result":"pass"},{"name":"corepack pnpm test","result":"pass"},{"name":"npm test","result":"pass"}],"remoteRuns":[],"residualRisks":["live YouTube account soak deferred","dashboard exporter deferred","provider-specific secret manager wiring deferred"],"productionClaims":{"runtimeReady":false,"productionReady":false,"replacesYouTubeSuperChat":false,"tokenSale":false,"custody":false,"investmentWording":false,"youtubeScraping":false},"rollbackOrStopCondition":"Revert this PR if credential validation breaks local/test mode or required checks fail on the current head.","humanConfirmation":{"present":true,"confirmedByRole":"project-owner","headSha":"HEAD_SHA_PLACEHOLDER","productCodeChanged":true,"runtimeReadinessClaimed":false},"safeOutput":{"status":"pass"}}}
END_CODEX_EVIDENCE_PACK_JSON

## Security Boundaries

Production YouTube credentials must be supplied through a secret manager boundary. `.env.example` contains placeholders only. This PR does not implement token sale, exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok, multi-platform, multi-chain, or multi-token behavior.

## Known gaps

Live YouTube API soak, real dashboard wiring, alert routing, and provider-specific secret manager integration remain follow-up deployment work.
