# P1 YouTube Canary Record Persistence Threat Model

This document defines the persistence threat model for YouTube canary
authorization records and audit receipts before any database, repository, route,
or migration implementation begins.

This is a docs-only model. It does not implement persistence, add a DB driver,
change routes, create migrations, run real DB tests, enable OAuth, call YouTube,
or claim runtime, production, legal, or YouTube policy readiness.

## Assets

- Authorization record: a non-executable record that binds a safe authorization
  bundle hash to a safe audit receipt hash.
- Audit receipt: a safe receipt produced from a bundle evaluation.
- Append-only event stream: proposed future storage of create, revoke, expire,
  and replace decisions.
- Current-state projection: proposed future read model derived from append-only
  events.
- Safe hashes: correlation identifiers only. They are not signatures, owner
  approval, GitHub approval review, merge authority, release authority, deploy
  authority, or execution authority.

## Authority Separation

The persistence layer must not create owner approval. A stored record only proves
that a safe model artifact was stored under the current storage contract. It must
not imply OAuth readiness, network authorization, YouTube policy compliance,
legal compliance, production readiness, or permission to execute a real canary.

Write authority, read authority, revoke authority, and execution authority are
separate. A future write path may store safe records and receipts, but execution
must remain forbidden until a later owner-scoped runtime PR defines and verifies
the full execution boundary.

## Proposed Storage Model

Future implementation should use an append-only event model plus a derived
current-state projection.

- `record_created`: stores safe record metadata and safe hash correlations.
- `record_revoked`: records revocation reason and timestamp.
- `record_expired`: records expiry transition.
- `record_replaced`: links a new safe record to the replaced record.

The current-state projection should be rebuilt from events and should never be
the only source of truth. Projection corruption must be repairable from the
append-only event stream.

## State Transitions

Allowed transitions:

- `draft` to `recorded_non_executable`
- `recorded_non_executable` to `revoked`
- `recorded_non_executable` to `expired`
- `recorded_non_executable` to `replaced`

Forbidden transitions:

- any state to executable
- revoked back to active
- expired back to active
- replaced back to active
- preview receipt to authoritative record
- record created before its bound receipt evaluation

## Replay Prevention And Idempotency

Future writes should require an idempotency key derived from safe, non-secret
inputs such as record ID, safe bundle hash, safe receipt hash, and transition
kind. Replaying the same request must return the existing safe result, not create
another event.

Conflicting writes with the same idempotency key but different safe fields must
fail closed without echoing raw request bodies.

## Optimistic Concurrency

Current-state updates should use a version or expected-state guard. A revoke,
expire, or replace operation should only apply if the stored projection version
matches the caller's expected version.

Concurrency failures should return safe reason codes only. They must not include
raw rows, SQL diagnostics, database URLs, credentials, owner identity, live chat
IDs, or stack traces.

## Access Control

Owner decisions are still pending for:

- who may create a stored non-executable record
- who may read stored records
- who may revoke or replace records
- whether admin UI read access should be separate from write authority
- whether audit receipt retrieval requires a separate permission

Until those decisions exist, future code must fail closed and remain
non-executable.

## Retention And Deletion

Retention and deletion policy are owner decisions. The future design should
separate logical revocation from physical deletion. If deletion is allowed, it
must preserve enough safe audit material to explain why a record is no longer
usable, without storing raw user comments, wallet labels, OAuth secrets, or live
YouTube identifiers.

## Backup And Restore

Backups should preserve append-only events and enough projection metadata to
rebuild current state. Restore should verify safe hash correlations and reject
events whose receipt, record, or bundle correlation no longer matches the model
contract.

Restore must not upgrade any record to executable status.

## Clock Policy

Storage writes should use a single server-side UTC clock source. Client-provided
timestamps may be stored only as opaque, non-authoritative metadata if a future
owner-scoped design permits it.

Temporal binding must preserve the PR #184 rule: records created before their
bound receipt evaluation fail closed.

## Read-Time Integrity

Read paths should verify:

- record schema
- receipt schema and receipt integrity
- bundle hash correlation
- record receipt hash correlation
- receipt derivation from the bundle
- temporal binding
- effective record status

If read-time verification fails, the read model should return a safe blocked
status and should not expose raw stored rows.

## Failure Taxonomy

Future persistence should use typed safe reason codes for:

- `record_not_found`
- `record_version_conflict`
- `record_replay_conflict`
- `record_state_transition_forbidden`
- `record_created_before_receipt`
- `record_receipt_hash_mismatch`
- `record_bundle_hash_mismatch`
- `receipt_integrity_failed`
- `receipt_derivation_mismatch`
- `projection_rebuild_required`
- `access_control_owner_decision_required`
- `retention_policy_owner_decision_required`
- `storage_unavailable`

These codes are operator-safe summaries, not raw diagnostics.

## Non-Goals

This threat model does not add database schema, migrations, repository
interfaces, admin routes, read/write endpoints, real DB connections, DB driver
dependencies, OAuth execution, real YouTube API execution, wallet/RPC/deploy
changes, runtime readiness, production readiness, legal compliance, or YouTube
policy compliance.
