# P1 YouTube Canary Authorization Preflight Gate

This gate is the canonical authorization contract for the controlled YouTube
canary authorization preflight. It is a read-only evaluator only. It does not
execute OAuth, read secrets, call YouTube, enable network access, or create
owner approval.

## Source Of Truth

`apps/api/src/youtube-live-chat-canary-authorization-gate.ts` owns the
canonical domain bundle schema, evidence wrapper schema, default bundle,
evaluation result, stable safe hash, legacy preflight projection, and real
connector readiness projection.

`apps/api/src/youtube-live-chat-canary-audit-receipt.ts` owns the safe
non-persistent audit receipt projection for a single evaluation.

Legacy controlled-canary preflight and real connector readiness gates delegate
to this evaluator, then preserve their existing response shapes for route
compatibility.

Runtime code does not read `.codex` files or docs. Those files are evidence
only. Evidence-only metadata such as repository name, harness version, package
status, workflow status, readiness claims, and PR phase is intentionally outside
the runtime domain bundle.

## Admin Routes

Canonical route:

- `GET /admin/youtube-live-chat/canary-authorization-preflight`
- `POST /admin/youtube-live-chat/canary-authorization-preflight/evaluate`

The previous `/admin/youtube-live-chat/canary-authorization` route remains a
deprecated alias wired to the same handler. It does not duplicate evaluation
logic.

GET responses evaluate the committed safe bundle with `preview_only: false`.
POST evaluate responses are untrusted previews with `preview_only: true` and
`state_persisted: false`. A complete POST preview does not mutate the committed
GET bundle and does not create canary execution readiness.

Admin routes use the injected request clock for `evaluated_at`. Tests inject
fixed clocks; runtime routes do not use historical fixed dates.

## Authorization States

- `awaiting_owner_authorization`: one or more owner-controlled fields are
  absent, unselected, unconfirmed, incomplete, or blocked.
- `authorization_fields_complete`: all authorization fields are recorded as
  opaque references or owner decisions, while execution remains forbidden.
- `invalid_authorization_bundle`: the preview body does not match the strict
  canonical schema or contains unsafe-looking values.

## Execution Boundary

Every evaluation returns:

- `execution_status: forbidden`
- `state_persisted: false`
- `network_enabled: false`
- `oauth_configured: false`
- `secret_accessed: false`
- `real_api_execution: false`
- `owner_approval_created: false`
- `github_approval_review_created: false`
- `merge_authority_created: false`

Each evaluation also includes `audit_receipt`. The receipt is derived from the
evaluation, remains non-persistent, and is not an owner authorization record or
server audit log.

GET default evaluation uses `input_trust: committed_safe_bundle`.

POST bodies use `input_trust: untrusted_preview`. They do not mutate the GET
default, do not persist owner decisions, and do not create authority to run a
canary.

Legacy controlled-canary preflight compatibility output may still return
`code_ready_network_blocked`, but its canonical authorization status remains
`awaiting_owner_authorization` unless individual owner fields are present in the
canonical domain bundle.

Real connector readiness never emits `controlled_canary_candidate`. Complete
authorization fields still produce `blocked_pending_network_enablement`,
`code_ready_network_blocked`, and `execution_status: forbidden`.

## First Canary Limits

The first canary remains constrained to one test channel, one test live stream,
list-only mode, `maxResults` 200, at most 3 API calls, at most 60 seconds, no
automatic fallback, no automatic retry, safe parse preview only, and no support
side effects.

All support side effects are explicitly false: affinity, reaction, overlay,
external outbox, IRIS Core, VOXWEAVE, TTS, Live2D, OBS, wallet, chain, and
production data.

## Safety Checks

The gate rejects unknown fields, raw credential-like input, URL-like input,
local endpoint-like input, DB URL-like input, wallet-like input, execution
flags set to true, side effects set to true, and first-canary limits outside
the configured bounds.

No package, lockfile, migration, workflow, contract, wallet/RPC, DB driver, or
server runtime expansion is part of this PR.
