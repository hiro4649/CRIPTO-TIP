# Manual Gate Audit Storage

Manual gate records are approval evidence, not secret storage. Audit logs are
safe operation evidence, not payload or provider response storage.

## Scope

This PR adds repository boundaries, in-memory implementations, tests, and a
PostgreSQL migration design for persistent manual gate audit readiness. It does
not connect to a production database, does not apply a migration in production,
and does not execute real provider SDK apply.

## Manual Gate State

Allowed statuses are `not_requested`, `requested`, `approved`, `rejected`,
`expired`, and `used`. Production-like apply requires an approved manual gate
record for the target environment and target commit SHA.

Used gates are not reusable. The migration design records `used_at` only when
the status is `used`.

The persistent repository boundary rejects duplicate `gate_id` values and
closes invalid state transitions. A gate can be approved only from
`requested` or `not_requested`, and it can be marked `used` only after it is
approved. `used`, `rejected`, and `expired` gates cannot be re-approved.
`used_at` is returned with stored and listed persistent records after use.

## Secret Boundary

`secret_source_ref` may contain a safe reference name only. It must not contain
secret values, webhook URLs, OAuth tokens, API keys, wallet addresses, private
URLs, raw messages, raw display names, raw YouTube author IDs, raw payloads, raw
provider responses, raw logs, stdout, stderr, or stack traces.

Audit records omit `secret_source_ref` and store only safe summaries.

The migration design also requires approved gates to carry
`approved_by_role = 'project-owner'` and an approval timestamp. It requires
JSON safe-summary columns to be JSON objects. These checks are design-time
guards for future DB-backed persistence and do not claim production database
rollout in this PR.

## Current Limit

The persistent transaction boundary remains future work. This PR prepares the
interface and schema shape so a later DB-backed repository can atomically bind
manual gate state transition, provider job state, and audit log writes.
