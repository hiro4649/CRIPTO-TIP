# Summary

Add local/internal attempt planning metadata after active lease without external adapter execution.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal attempt planning metadata after active lease without external adapter execution.

Allowed scope: internal outbox attempt planning metadata, admin auth guard, active lease guard, lease id match guard, queued-only state guard, external-not-attempted guard, adapter-not-executed guard, dispatch attempt count guard, safe audit metadata, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, reaction execution, overlay execution, external outbox dispatch, external adapter execution, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: attempt plan requires admin auth; unknown outbox returns 404; active lease is required; lease_id must match; queued_internal only can be planned; duplicate plan is idempotent; expired or released lease is blocked; attempt status returns safe metadata; no support event mutation; no reaction execution; no overlay execution; no external outbox delivery; no external runtime execution.

## Evidence Integrity

Head SHA: 35ff14d980bd0bd023bc56b70a0e58d1223c78d0

Base SHA: da8f7c4f394e2afa56c12ec8a703c03eb41dcce3

Product CI: success

Quality-gate: success

CI run: 27650043128

Quality-gate run: 27650043149

Quality-gate artifact: 7680389135

Tests: 88 test files, 1881 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-reaction-dispatch-internal-outbox-attempt-planning.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-reaction-dispatch-internal-outbox-attempt-planning.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-lease.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-cancel.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-enqueue.test.ts apps/api/src/p0-admin-reaction-dispatch-outbox-review-surface.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal reaction dispatch outbox attempt planning endpoints.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal attempt planning metadata only.

Review scope and verification:

- Scope: P0 reaction dispatch internal outbox attempt planning, admin auth, active lease gate, safe plan metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental external dispatch, raw data exposure, support event mutation, attempt count mutation, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Attempt planning tests, lease tests, cancel tests, review surface tests, internal enqueue tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 88 files, 1881 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, RPC, wallet, or deploy change is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, VOXWEAVE call, or external adapter execution is performed.
- No support events are mutated.
- No reaction, overlay, external outbox delivery, or runtime dispatch is executed.
- Attempt plan metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, stdout, stderr, jobs_url, logs_url, adapter URLs, webhook URLs, full prompts, and LLM output.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal attempt planning metadata only.
- Actual runtime dispatch, adapter execution, IRIS Core, VOXWEAVE, TTS, Live2D, OBS, renderer, and WebSocket delivery remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
