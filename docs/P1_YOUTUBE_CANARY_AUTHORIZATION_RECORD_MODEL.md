# P1 YouTube Canary Authorization Record Model

The YouTube canary authorization record model is a pure non-executable schema
and evaluator. It does not persist records, add repository routes, mutate server
state, run OAuth, call YouTube, read secrets, or enable network execution.

The model can reference a safe authorization bundle hash and a safe audit
receipt hash. These are safe correlation IDs only. They are not signatures,
owner approvals, or execution authority.

The record schema is intentionally stricter than the evaluator. A declared
`recorded_non_executable` record must have every opaque reference status
recorded. Missing references are valid only for `draft` records. This prevents a
record from claiming a completed non-executable state while relying on evaluator
downgrade behavior.

## Statuses

- `draft`: references are incomplete.
- `recorded_non_executable`: all references are recorded as opaque references,
  but execution remains forbidden.
- `revoked`: revocation wins over expiry and recorded status.
- `expired`: injected clock is at or after `expires_at`.

Revoked records require both `revoked_at` and `revocation_reason_code`.
Non-revoked records cannot carry revocation metadata. `revoked_at` and
`expires_at` must both be after `created_at`.

Every effective status returns:

- `execution_status: forbidden`
- `network_enabled: false`
- `oauth_configured: false`
- `secret_accessed: false`
- `real_api_execution: false`
- `record_persisted: false`
- `persistence_status: not_implemented`

## Forbidden Data

The strict schema rejects unknown fields, so raw owner identity, credential
values, tokens, URLs, channel IDs, live stream IDs, wallet addresses, database
URLs, IP addresses, user agents, and raw request bodies are not part of this
model.

## Persistence Boundary

This PR intentionally does not add DB persistence, migrations, repository
interfaces, admin persistence routes, audit-log storage, authorization-record
storage, or runtime readiness.

## Receipt Binding Boundary

The record model now has a pure binding companion that compares a record, a safe
audit receipt, and an authorization bundle. Binding checks recompute safe hashes
and verify receipt integrity, but they still create no persistence, no network
permission, no OAuth configuration, no owner approval, and no execution
authority.
