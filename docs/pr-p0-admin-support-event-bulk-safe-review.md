# Summary

Add POST /admin/support-events/bulk-review/preview for safe local/internal support event bulk review preflight.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add POST /admin/support-events/bulk-review/preview for safe local/internal support event bulk review preflight.

Allowed scope: local/internal admin support event bulk review preview API, admin auth guard, read-only support event eligibility preflight, safe metadata only, docs, .codex evidence.

Forbidden scope: bulk approve or reject mutation, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay app changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin bulk review preview requires admin bearer token; admin bulk review preview rejects empty and oversized event ID lists; admin bulk review preview rejects duplicate event IDs; admin bulk review preview handles unknown event IDs safely; admin bulk review preview returns safe metadata only; admin bulk review preview returns eligible actions from allowlist; admin bulk review preview is read-only; admin bulk review preview does not enqueue reaction or overlay.

## Evidence Integrity

Head SHA: 4dd664d9c344827fe1b87db28d3a6e3e1ade60a5

Base SHA: 4dd664d9c344827fe1b87db28d3a6e3e1ade60a5

Product CI: pre_pr

Quality-gate: pre_pr

CI run: 0

Quality-gate run: 0

Quality-gate artifact: 0

Tests: 70 test files, 1803 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-support-event-bulk-safe-review.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:


Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal admin support event bulk review preview.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal read-only support event eligibility preflight only.

Review scope and verification:

- Scope: P0 admin support event bulk review preview, admin auth, safe eligibility metadata, read-only behavior, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidentally performing bulk moderation, exposing raw support data, mutating state, triggering side effects, or implying runtime readiness; tests and docs reject those outcomes.
- Verification oracle: Bulk safe review tests, existing search/timeline/ledger/resend tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 70 files, 1803 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No real TTS, Live2D, renderer, OBS, or WebSocket delivery is performed.
- No support event mutation or bulk moderation approval is performed.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay app changes.
- Raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin bulk review preview only.
- Actual bulk approve/reject workflow, production Admin Console UI, durable persistence, and operational replay policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
