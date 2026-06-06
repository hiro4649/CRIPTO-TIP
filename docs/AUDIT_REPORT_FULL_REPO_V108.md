# Full Repository Pro Audit v1.0.8

## Scope

This audit was performed from `main` after PR #25 merged at `b6cbee8d0c44f7683f9d386884ed581fba46e4ed`, on branch `feat/full-repo-pro-audit-v108`.

Audited areas:

- `apps/api/**`, including server, config, repositories, outbox, chain listener, IRIS delivery, YouTube connector, dashboard/alert deployment, manual gates, and evidence tests.
- `apps/web/**` and `apps/overlay/**`.
- `packages/shared/**`, `contracts/**`, and `migrations/**`.
- `.github/workflows/**`, `scripts/**`, `.codex/**`, `docs/**`, root compliance/security docs, package metadata, and AGENTS routing.

The audit used safe-summary evidence only. Raw CI logs, raw diffs, raw payloads, secret values, endpoint values, private paths, production data, and personal data were not read or copied into this report.

## Executive Summary

Critical findings: 0.

High findings: 0.

Medium findings: 3.

Low findings: 4.

The repository is broadly aligned with the v1.0.8 harness direction: product/runtime boundaries remain explicit, YouTube ingestion is constrained to the official API boundary, provider-specific apply is manual-gated, evidence CI and quality self-protection are wired into required paths, and safe CI artifacts are designed to avoid raw transcript exposure.

The main remaining risks are operational maturity gaps rather than immediate merge blockers: production provider SDK wiring is still deferred, manual gate evidence is not durable production storage, production RPC/listener operation remains gated, and full live YouTube/account validation is intentionally manual.

## Critical Findings

None found.

## High Findings

None found.

## Medium Findings

1. Provider-specific deployment/apply remains boundary-only.
   - Impact: Dashboard and external alert provider wrappers protect manual gates and secret references, but real provider SDK/apply behavior is intentionally deferred.
   - Evidence: `docs/RISK_REGISTER.md`, `docs/DASHBOARD_DEPLOYMENT.md`, `docs/ALERT_DELIVERY.md`, and provider wrapper tests.
   - Recommendation: Next PR should add provider-safe apply result recording, rollback evidence, and audit evidence while still forbidding real credentials and ungated apply.

2. Manual gate evidence is not durable production storage.
   - Impact: In-memory/manual JSON evidence validates approval shape and single-use semantics, but does not yet provide durable operator audit storage.
   - Evidence: `apps/api/src/manual-gates.ts`, `docs/MANUAL_GATES.md`, `.codex/manual-gates/manual-gates.json`.
   - Recommendation: Add persistent audit storage later; keep current production-like apply fail-closed until that exists.

3. Evidence rendering still depends on post-PR GitHub refresh for final run/artifact IDs.
   - Impact: The auto-injection flow is much stronger than earlier manual evidence, but final merge readiness still depends on the refresh command after GitHub runs complete.
   - Evidence: `scripts/refresh-pr-evidence.mjs`, `scripts/fetch-github-run-evidence.mjs`, and PR evidence workflow.
   - Recommendation: Keep `evidence:ci` fail-closed and require final PR body refresh before merge.

## Low Findings

1. Local Foundry is not guaranteed on every developer workstation.
   - Impact: Local `forge test` may be unavailable, so GitHub `contracts` remains the merge oracle.
   - Recommendation: Document local setup or provide a containerized Foundry helper later.

2. Docs contain many historical PR evidence files.
   - Impact: Broad keyword scans surface many intentional historical forbidden-scope statements and old PR bodies, increasing review noise.
   - Recommendation: Keep placeholder checks strict, but consider moving archived PR bodies under an archive path with explicit scan expectations.

3. `evidence:render` previously targeted a past PR doc by default.
   - Impact: A generic package script should not encode a stale PR-specific output target.
   - Fix applied: Changed `evidence:render` to use the renderer default output unless an explicit `--output` is provided.

4. Production live YouTube soak remains manual-only.
   - Impact: Correct for safety, but live provider behavior is not continuously verified in CI.
   - Recommendation: Keep deterministic mock soak in CI and add safe manual soak result ingestion evidence when live credentials exist.

## Product Boundary Audit

Pass. The audited source and docs preserve these boundaries:

- YouTube LIVE is the broadcast surface.
- IRIS Web Companion remains the external crypto Tip intake surface.
- IRIS Backend normalizes support sources into `support.received`.
- IRIS Core remains responsible for AI reaction, TTS, Live2D/3D motion, affinity, memory, and stream progression.
- OBS Browser Source remains the overlay alert display surface.
- YouTube Super Chat payment is not replaced.
- IRIS Token Tip is not represented as YouTube Super Chat.
- The official YouTube Live API boundary is used; scraping, browser automation, and HTML parsing are not introduced.

## Security And Compliance Audit

Pass with deferred production risks.

Observed controls:

- Secret-like values are blocked by repository scans and safe-output policies.
- Provider credentials are represented as secret references, not committed values.
- Manual gate records reject secret-like values, private URLs, and wallet-like values.
- Alert payloads sanitize labels and exclude unsafe keys and values.
- IRIS delivery tests verify wallet addresses and secrets are not sent to IRIS Core reaction/memory payloads.
- YouTube comments and display names are treated as untrusted and sanitized/moderated.

Deferred risks remain visible in the risk register:

- Production RPC deployment wiring.
- Provider-specific secret manager SDK wiring.
- Persistent manual gate/audit storage.
- Real dashboard/alert provider apply, still manual-gated and not implemented with real credentials.
- Live YouTube account operation, still manual-gated.

## Quality Gate And Evidence Audit

Pass with one low-risk script cleanup applied.

Observed controls:

- CI runs `pnpm evidence:ci` without mutating PR body.
- Quality self-protection is available as `quality:self-protection` and is executed in evidence CI.
- Placeholder checks scan `.codex`, `docs`, `.github`, `README.md`, and `package.json`.
- Freshness validation checks head SHA, CI run, quality-gate run, and quality-gate artifact when supplied.
- GitHub run/artifact selection is constrained to successful runs on the current head and the selected quality-gate run artifact.
- Quality-gate workflow requires safe summary and safe artifact upload with missing artifacts treated as errors.

## Verification Commands

Planned and required for this audit PR:

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/write-test-summary.mjs`
- `node scripts/check-evidence-placeholders.mjs`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-quality-gate-self-protection.mjs`
- `node scripts/codex-secret-safety-scan.mjs`
- prohibited product wording scan
- no-scraping / unsafe DOM scan
- repository internals scan
- safe-output/raw-log pattern scan

## Recommendation

Merge recommendation: merge after current-head CI, contracts, quality-gate, evidence CI, placeholder check, and quality self-protection pass on the audit PR.

Next recommended task: provider-safe deployment/apply boundary hardening with approved manual gate records, safe apply summaries, rollback evidence, and no real provider secrets or production apply.
