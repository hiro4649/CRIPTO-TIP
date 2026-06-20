# P1 YouTube Canary Preview Audit Receipt

The YouTube canary authorization audit receipt is a safe projection of one
authorization evaluation. It is not a server audit log, not an authorization
record, not an owner approval, and not merge or execution authority.

The receipt is built only by
`buildYouTubeCanaryAuthorizationAuditReceipt`. Route handlers do not duplicate
receipt fields and do not recalculate authorization status inside the receipt.

## Clock Truthfulness

Admin routes read the injected clock once per request and pass that value to
the canonical authorization evaluator and legacy controlled-canary preflight
projection. Runtime routes do not use historical fixed dates for
`evaluated_at`. Tests inject fixed clocks when deterministic timestamps are
needed.

## Receipt Fields

The receipt contains only safe evaluation metadata:

- `receipt_kind`
- `evaluation_mode`
- `input_trust`
- `authorization_status`
- `preflight_status`
- `execution_status`
- `preview_only`
- `state_persisted`
- `receipt_persisted`
- `audit_retrievable`
- `network_enabled`
- `oauth_configured`
- `secret_accessed`
- `real_api_execution`
- `safe_bundle_hash`
- `evaluated_at`
- `blocker_codes`
- `safe_receipt_hash`

It does not include raw request bodies, completed fields, pending fields,
credential references, owner identity, URLs, channel IDs, live stream IDs,
wallet addresses, database URLs, IP addresses, user agents, or repository
state.

## Persistence Boundary

`state_persisted`, `receipt_persisted`, and `audit_retrievable` are always
false. A complete POST preview remains non-persistent and cannot create owner
approval, GitHub approval review, merge authority, runtime readiness, or
production readiness.

## Safe Receipt Hash

`safe_receipt_hash` is a safe correlation identifier over the receipt fields
except itself. It is not a signature, proof of correctness, owner approval, or
authorization record.

## Receipt Integrity

The receipt schema now uses the canonical canary authorization blocker-code
registry. Unknown blocker codes are rejected. External receipt verification also
rejects duplicate blocker codes, non-canonical blocker ordering, and a
`safe_receipt_hash` that does not match the receipt fields excluding itself.

Receipt semantics are checked with the schema:

- committed input must use committed evaluation mode and `preview_only: false`
- preview input must use preview evaluation mode and `preview_only: true`
- complete authorization must have no blocker codes
- awaiting authorization must be blocked and have blocker codes
- invalid authorization must be blocked and include an invalid-bundle blocker

These checks make receipt correlation safer, but they still do not create
runtime readiness, production readiness, owner approval, GitHub approval review,
or merge authority.
