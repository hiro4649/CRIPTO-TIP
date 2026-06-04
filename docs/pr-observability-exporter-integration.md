# Summary

Adds a provider-neutral observability exporter boundary for YouTube metrics, Prometheus/OpenTelemetry-compatible metric formatting, dashboard and alert parity tests, and manual live YouTube soak safe-summary ingestion.

PR profile: product_minor_r2
Task mode: feature

## Goal

Publish YouTube metric snapshots through an injected exporter boundary without committing provider credentials, applying provider-specific dashboard deployment, sending external alerts, or operating a live YouTube account without a manual gate.

## Risk level

R3 product operations integration. Product code changed; runtime readiness is not claimed.

## Files or scope

Allowed paths: `apps/api/src/youtube/**`, `.codex/**`, `docs/**`, and `docs/process/CODEX_CLASSIFICATION_REGISTRY.json`.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, actual production deployment apply, provider-specific dashboard deployment apply, external alert delivery with real credentials, and live YouTube account operation without manual gate.

## Task Contract

Task mode: product_minor_r2

Runtime readiness claim: no

Product code changed: yes

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, observability exporter mock test pass, Prometheus/OpenTelemetry output tests pass, dashboard contract parity test pass, alert routing parity test pass, manual live soak result ingestion gate test pass, no secret scan pass, and no scraping scan pass.

Verification surface: `apps/api/src/youtube/observability-exporter.test.ts`, `apps/api/src/youtube/deployment-observability.test.ts`, `docs/OBSERVABILITY_EXPORTER.md`, `docs/youtube-dashboard-contract.json`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `npm test`, secret scan, prohibited wording scan, and no-scraping scan.

Risk surface: exporter boundary, metric formatting, dashboard parity, alert label parity, safe-summary manual soak ingestion, docs/evidence parser inputs, and no production runtime claim.

Oracle provided: test.

Split reason: provider-specific dashboard deployment, external alert delivery, real provider credentials, and live YouTube account operation remain separate manual-gated deployment/runtime work.

## Evidence Integrity

Base SHA: 032d68390f005680b18d888241c20e65e9e71b7e

Head SHA: final pushed commit recorded in GitHub PR body

Product CI: success

Quality-gate: success

quality-gate run: 26940189299

quality-gate artifact: 7406617724

Commit SHA: final pushed commit recorded in GitHub PR body

Evidence freshness: local evidence collected before push; GitHub checks must pass on the current head before merge.

## Product Verification

- `ObservabilityExporter` publishes YouTube metrics through an injected provider-neutral boundary.
- `MockObservabilityExporter` records metric points for deterministic verification.
- Prometheus-compatible output preserves metric names and sanitized labels.
- OpenTelemetry-compatible output preserves metric names, values, and attributes.
- Dashboard contract metrics remain in parity with exporter output.
- Alert routing labels include `alert_id`, `operator_action`, and `source_metric`.
- Manual live YouTube soak result ingestion is skipped unless explicit flag and managed credential boundary are present.
- No YouTube scraping, browser automation, HTML parsing, provider secret commit, or production dashboard deployment apply is introduced.

## Acceptance Criteria

Acceptance criteria:

- Observability exporter mock test passes.
- Prometheus/OpenTelemetry compatible metric output tests pass.
- Metric snapshot publish test passes.
- Dashboard contract parity test passes.
- Alert routing contract parity test passes.
- Quota, rate limit, auth, invalid page token, liveChatId missing, stream reconnect storm, list fallback spike, zero events while live, and verification failure export mappings are covered.
- Manual live YouTube soak result ingestion remains gated.
- No public API route changes are introduced.
- No YouTube scraping, browser automation, HTML parsing, real secret commit, or production deployment apply is introduced.

## Complexity Governance

Solvability constraints: keep the change provider-neutral, avoid provider SDKs, avoid real credentials, avoid public API route changes, and verify output parity with tests instead of runtime dashboards.

Verification oracle: `apps/api/src/youtube/observability-exporter.test.ts` verifies exporter mock publishing, Prometheus output, OpenTelemetry output, dashboard parity, alert label parity, all required alert export mappings, and manual live soak safe-summary gate.

Auth oracle: no new authenticated route is introduced; credential safety is covered by negative manual soak gate evidence and exporter labels contain only metric names, numeric values, and sanitized operator labels.

Storage oracle: no database migration, queue mutation, or persisted secret storage is introduced.

API compatibility oracle: public API unchanged; internal YouTube observability helper surface is additive.

Reasoning evidence: selected exporter-boundary-only implementation avoids coupling this PR to provider-specific dashboard deployment, external alert delivery credentials, or live YouTube operation.

Rollback or stop condition: revert this PR if exporter output diverges from the dashboard contract, alert labels include unsafe data, or required checks fail on the current head.

## Best of N Evidence

Candidate count: 3

Selected candidate: provider-neutral exporter boundary with mock exporter, Prometheus/OpenTelemetry formatting, dashboard parity, alert label parity, and manual soak safe-summary gate.

Reason selected: it increases production observability readiness while keeping provider secrets and deployment apply out of scope.

Rejected alternative 1: provider-specific dashboard SDK integration in this PR. Rejected because it would require real provider credential and deployment handling.

Rejected alternative 2: docs-only exporter plan. Rejected because it would not provide executable evidence for metric output parity.

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

- `corepack pnpm test`: pass, 17 test files, 140 passed tests, 6 skipped tests.
- `npm test`: pass, 17 test files, 140 passed tests, 6 skipped tests.
- `forge test`: local forge may be unavailable; contracts remain covered by GitHub CI before merge.
- Secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs`: run.

## Testing and review

Local test counts: 17 test files, 140 passed tests, and 6 skipped tests.

Risk summary: product code, runtime observability helper surface, exporter output formatting, alert label mapping, docs, and quality evidence changed. No DB migration, public route, contract, wallet custody, token sale, exchange, cash-out, investment behavior, YouTube scraping, provider-specific deployment apply, or live account operation changed.

Review focus: exporter boundary, no real secret commit, metric name compatibility, dashboard JSON parity, alert label parity, manual live soak safe-summary gate, no scraping, and no production readiness claim.

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

Internal API: additive YouTube observability exporter helper surface.

Breaking changes: none intended.

Runtime readiness: not claimed.

## Test Coverage Evidence

Changed area: YouTube observability exporter boundary, metric formatting, dashboard parity, alert label parity, manual live soak safe-summary ingestion, and evidence docs.

Risk: exporter output could diverge from dashboard metrics, alert labels could lose operator context, or manual live soak evidence could imply live operation without a credential gate.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: mock exporter publishing, Prometheus-compatible output, OpenTelemetry-compatible output, dashboard contract parity, alert routing labels, all required alert export mappings, zero-events live gating, and manual live soak skip/ready behavior.

Edge cases and failure paths: malformed label names are sanitized for Prometheus output, zero-events alerts only export while live, and manual live soak remains skipped unless explicit flag and managed credential boundary are present.

Uncovered risks: provider-specific dashboard deployment apply, external alert delivery with real provider credentials, and live YouTube account operation.

## Residual risks

- Provider-specific dashboard deployment apply remains manual-gated deployment work.
- External alert delivery remains provider integration work.
- Live YouTube account operation remains manual-gated and out of CI.

## Human confirmation needed

Project-owner review required before merge: CI status, quality-gate status, head SHA, remaining blockers, and merge decision.
