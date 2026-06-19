# P1 YouTube Canary Authorization Preflight Gate

This gate is the canonical authorization contract for the controlled YouTube
canary preflight. It is a preview evaluator only. It does not execute OAuth,
read secrets, call YouTube, enable network access, or create owner approval.

## Source Of Truth

`apps/api/src/youtube-live-chat-canary-authorization-gate.ts` owns the
canonical bundle schema, default bundle, evaluation result, stable safe hash,
legacy preflight projection, and real connector readiness projection.

Legacy controlled-canary preflight and real connector readiness gates delegate
to this evaluator, then preserve their existing response shapes for route
compatibility.

Runtime code does not read `.codex` files or docs. Those files are evidence
only.

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
- `input_trust: untrusted_preview`
- `network_enabled: false`
- `oauth_configured: false`
- `secret_accessed: false`
- `real_api_execution: false`
- `owner_approval_created: false`
- `github_approval_review_created: false`
- `merge_authority_created: false`

POST bodies are preview input only. They do not mutate the GET default, do not
persist owner decisions, and do not create authority to run a canary.

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
