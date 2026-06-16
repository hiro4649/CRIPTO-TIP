# Summary

Add local/internal dry-run adapter boundary preview metadata from an active lease and reviewed attempt plan without external adapter execution.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal dry-run adapter boundary preview metadata from an active lease and reviewed attempt plan without external adapter execution.

Allowed scope: dry-run adapter boundary preview metadata, admin auth guard, active lease guard, reviewed attempt plan guard, lease id match guard, safe request preview hash, read-only no-mutation checks, no external execution checks, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, outbox mutation, lease mutation, attempt plan mutation, reaction execution, overlay execution, external outbox dispatch, external adapter execution, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin dry-run adapter boundary requires admin auth; unknown attempt plan returns 404; active lease is required; lease_id must match reviewed plan; planned_internal attempt plan is required; safe request preview metadata only; no support event mutation; no outbox mutation; no lease mutation; no attempt plan mutation; no reaction execution; no overlay execution; no external outbox delivery; no adapter execution; no external runtime execution.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 6da6c4a281a68888c018e2121e60ccd65de36794

Product CI: success

Quality-gate: success

CI run: 27652523423

Quality-gate run: 27652523450

Quality-gate artifact: 7681333643

Tests: 90 test files, 1944 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-reaction-dispatch-dry-run-adapter-boundary.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-reaction-dispatch-dry-run-adapter-boundary.test.ts apps/api/src/p0-admin-reaction-dispatch-attempt-plan-review-surface.test.ts apps/api/src/p0-reaction-dispatch-internal-outbox-attempt-planning.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal dry-run adapter boundary preview endpoint.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal safe request preview metadata only.

Review scope and verification:

- Scope: P0 reaction dispatch dry-run adapter boundary preview, admin auth, active lease, reviewed plan guard, safe preview metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental external adapter execution, raw data exposure, mutation of support/outbox/lease/attempt plan state, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Dry-run adapter boundary tests, attempt plan review tests, attempt planning tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 90 files, 1944 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, RPC, wallet, or deploy change is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, VOXWEAVE call, or external adapter execution is performed.
- The new dry-run adapter boundary endpoint returns safe preview metadata and does not mutate support events, outbox records, leases, approvals, or attempt plans.
- No reaction, overlay, external outbox delivery, or runtime dispatch is executed.
- Dry-run adapter boundary metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, stdout, stderr, jobs_url, logs_url, adapter URLs, webhook URLs, full prompts, LLM output, TTS text, audio URLs, and renderer URLs.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal dry-run adapter boundary preview metadata only.
- Actual adapter execution, IRIS Core, VOXWEAVE, TTS, Live2D, OBS, renderer, and WebSocket delivery remain out of scope.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
