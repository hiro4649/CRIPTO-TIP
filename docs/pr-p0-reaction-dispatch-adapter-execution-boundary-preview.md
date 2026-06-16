# Summary

Add local/internal adapter execution boundary preview for approved reaction dispatch dry-run metadata without adapter execution.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal adapter execution boundary preview for approved reaction dispatch dry-run metadata without adapter execution.

Allowed scope: local/internal adapter execution boundary preview, approved dry-run boundary requirement, safe envelope hashes, admin auth guard, state drift guards, read-only support/outbox/lease/attempt-plan checks, no external execution checks, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, outbox delivery mutation, lease mutation, attempt plan mutation, reaction execution, overlay execution, external outbox dispatch, external adapter execution, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin auth required; unknown dry-run boundary returns 404; approved dry-run boundary creates safe preview; unapproved or rejected dry-run boundary is blocked; state drift is blocked; no support event mutation; no outbox delivery mutation; no lease mutation; no attempt plan mutation; no adapter execution; no external runtime execution.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: de3217c85be021b4b015e89e93424bb7ddbf818c

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 91 test files, 1961 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-reaction-dispatch-adapter-execution-boundary-preview.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-reaction-dispatch-adapter-execution-boundary-preview.test.ts apps/api/src/p0-admin-reaction-dispatch-dry-run-approval-gate.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal adapter execution boundary preview endpoint.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal preview metadata only.

Review scope and verification:

- Scope: P0 admin reaction dispatch dry-run approval gate, admin auth, safe approval/rejection metadata, idempotency, state guards, safe audit metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental external execution, unsafe state approval, raw data exposure, mutation of support/outbox/lease/attempt plan, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Dry-run approval gate tests, dry-run review tests, dry-run adapter boundary tests, attempt plan review tests, attempt planning tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 91 files, 1961 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, RPC, wallet, or deploy change is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, VOXWEAVE call, or external adapter execution is performed.
- The new endpoint returns adapter execution boundary preview metadata only.
- The endpoint does not mutate support events, outbox delivery state, leases, or attempt plans.
- No reaction, overlay, external outbox delivery, or runtime dispatch is executed.
- Preview metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, adapter URLs, webhook URLs, request bodies, auth material, headers, and tokens.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal adapter execution boundary preview metadata only.
- Actual adapter execution remains future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
