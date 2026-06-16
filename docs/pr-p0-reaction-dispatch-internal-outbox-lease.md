# Summary

Add local/internal lease controls for queued reaction dispatch internal outbox records without external dispatch.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal lease controls for queued reaction dispatch internal outbox records without external dispatch.

Allowed scope: internal outbox lease metadata, admin auth guard, queued-only state guard, external-not-attempted guard, adapter-not-executed guard, lease expiry, lease extend, lease release, safe audit metadata, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, reaction execution, overlay execution, external outbox dispatch, external adapter execution, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: lease requires admin auth; unknown outbox returns 404; queued_internal can be leased; duplicate active lease is blocked; expired lease can be reclaimed; extend requires active matching lease; release is idempotent; lease status returns safe metadata; no support event mutation; no reaction execution; no overlay execution; no external outbox delivery; no external runtime execution.

## Evidence Integrity

Head SHA: a8774651ee063da20abb812e4f4467eb29643822

Base SHA: e6400bc174fad9d365e25f128dc7a586bfb00e4e

Product CI: success

Quality-gate: success

CI run: 27648550464

Quality-gate run: 27648550453

Quality-gate artifact: 7679798485

Tests: 87 test files, 1864 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-reaction-dispatch-internal-outbox-lease.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-reaction-dispatch-internal-outbox-lease.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-cancel.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-enqueue.test.ts apps/api/src/p0-admin-reaction-dispatch-outbox-review-surface.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal reaction dispatch outbox lease endpoints.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal lease metadata only.

Review scope and verification:

- Scope: P0 reaction dispatch internal outbox lease, admin auth, safe lease metadata, expiry, extend, release, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental external dispatch, raw data exposure, support event mutation, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Internal outbox lease tests, cancel tests, review surface tests, internal enqueue tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 87 files, 1864 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, RPC, wallet, or deploy change is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, VOXWEAVE call, or external adapter execution is performed.
- No support events are mutated.
- No reaction, overlay, external outbox delivery, or runtime dispatch is executed.
- Lease metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, stdout, stderr, jobs_url, logs_url, adapter URLs, webhook URLs, full prompts, LLM output, and raw lease tokens.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal lease metadata only.
- Actual runtime dispatch, adapter execution, IRIS Core, VOXWEAVE, TTS, Live2D, OBS, renderer, and WebSocket delivery remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
