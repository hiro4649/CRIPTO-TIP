# P0 Admin Bulk Moderation Apply Controls

This document defines local/internal admin bulk moderation apply controls for held support events.

## Scope

`POST /admin/support-events/bulk-review/apply` accepts a bounded list of support event IDs and an action.

Allowed actions are:

- `approve_hold`
- `reject_hold`

This is local/internal admin bulk moderation apply control only.

This only allows `approve_hold` or `reject_hold` for held support events.

This does not approve or reject arbitrary states.

This does not mutate amount, source, wallet, or direct affinity fields.

This does not create production Admin Console readiness.

## Side Effects

For `approve_hold`, the endpoint uses the same held-support approval path as the single-item approval flow:

- affinity application
- reaction request
- overlay event
- outbox enqueue
- safe audit metadata

The operation is idempotent. Repeating the same apply request must not double-apply side effects.

For `reject_hold`, the endpoint records the rejection and safe audit metadata without reaction, overlay, affinity, or outbox side effects.

## Safety Boundary

The response is safe metadata only.

The endpoint does not call real TTS.

The endpoint does not call real Live2D.

The endpoint does not call a real renderer.

The endpoint does not call real OBS.

The endpoint does not perform real WebSocket delivery.

The endpoint does not change web or overlay app behavior.

The endpoint does not use real DB.

The endpoint does not add Redis, Kafka, DB driver, package, or lockfile changes.

The endpoint does not expose raw messages.

The endpoint does not expose raw payloads.

The endpoint does not expose secrets.

The endpoint does not claim runtime readiness.

The endpoint does not claim production readiness.

The endpoint does not claim legal compliance.

The endpoint does not claim YouTube policy compliance.

## Verification

Tests cover admin auth, invalid input, safe max event count, duplicate event IDs, unsupported actions, unknown event IDs, hold-only behavior, approve side effects once, reject side-effect suppression, idempotency, safe audit metadata, and safe output.
