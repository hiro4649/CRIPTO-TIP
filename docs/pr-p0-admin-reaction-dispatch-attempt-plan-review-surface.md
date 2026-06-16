# Summary

Add read-only admin review surface for local/internal reaction dispatch attempt plans without external execution.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add read-only admin review surface for local/internal reaction dispatch attempt plans without external execution.

Allowed scope: read-only admin attempt plan review surface, safe attempt plan list/detail metadata, admin auth guard, safe filters and pagination, adapter kind allowlist metadata, safe validation summary, read-only no-mutation checks, no external execution checks, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, outbox mutation from review endpoints, lease mutation from review endpoints, attempt plan mutation from review endpoints, reaction execution, overlay execution, external outbox dispatch, external adapter execution, dry-run adapter request, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin attempt plan review requires admin auth; unknown attempt plan returns 404; list returns safe metadata only; detail returns safe metadata only; filters cover support_event_id, outbox_id, lease_id, character_id, stream_id, plan_status, outbox_status, lease_status, adapter_kind, created range, limit, and offset; safe validation summary is included; no support event mutation; no outbox mutation; no lease mutation; no attempt plan mutation; no reaction execution; no overlay execution; no external outbox delivery; no external runtime execution.

## Evidence Integrity

Head SHA: ac5496c3e60f906822a83d960ad50dfed561544b

Base SHA: 7dbcff32ee2ec5d639a0a941ba81102b3dd06c90

Product CI: success

Quality-gate: success

CI run: 27651426937

Quality-gate run: 27651426901

Quality-gate artifact: 7680913722

Tests: 89 test files, 1931 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-dispatch-attempt-plan-review-surface.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-admin-reaction-dispatch-attempt-plan-review-surface.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-attempt-planning.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-lease.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-cancel.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-enqueue.test.ts apps/api/src/p0-admin-reaction-dispatch-outbox-review-surface.test.ts apps/api/src/p0-admin-reaction-dispatch-approval-gate.test.ts apps/api/src/p0-reaction-dispatch-safe-candidate-persistence.test.ts apps/api/src/p0-reaction-dispatch-approved-candidate-outbox-boundary.test.ts apps/api/src/p0-support-event-contract-v2-validator.test.ts apps/api/src/p0-support-event-contract-v2-admin-surface.test.ts apps/api/src/p0-admin-reaction-dispatch-preview.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds read-only local/internal admin attempt plan review endpoints.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal read-only attempt plan review metadata only.

Review scope and verification:

- Scope: P0 admin reaction dispatch attempt plan review surface, admin auth, safe filters, safe list/detail metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental external dispatch, raw data exposure, mutation of support/outbox/lease/attempt plan state, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Attempt plan review tests, attempt planning tests, lease tests, cancel tests, outbox review tests, internal enqueue tests, approval gate tests, safe candidate persistence tests, contract v2 tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 89 files, 1931 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, RPC, wallet, or deploy change is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, VOXWEAVE call, or external adapter execution is performed.
- The new admin attempt plan review endpoints are read-only and do not mutate support events, outbox records, leases, approvals, or attempt plans.
- No reaction, overlay, external outbox delivery, dry-run adapter request, or runtime dispatch is executed.
- Attempt plan review metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, stdout, stderr, jobs_url, logs_url, adapter URLs, webhook URLs, full prompts, LLM output, TTS text, audio URLs, and renderer URLs.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal attempt plan review metadata only.
- Dry-run adapter boundary metadata remains future scoped work.
- Actual runtime dispatch, adapter execution, IRIS Core, VOXWEAVE, TTS, Live2D, OBS, renderer, and WebSocket delivery remain out of scope.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
