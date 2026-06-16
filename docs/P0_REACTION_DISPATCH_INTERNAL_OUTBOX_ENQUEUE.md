# P0 Reaction Dispatch Internal Outbox Enqueue

This change adds a local/internal reaction dispatch outbox enqueue boundary for approved `boundary_ready` candidates.

It creates internal outbox records for approved boundary-ready candidates. It does not dispatch runtime work.

## Endpoints

- `POST /admin/reaction-dispatch/boundaries/:boundaryId/enqueue-internal-outbox`
- `GET /admin/reaction-dispatch/outbox`
- `GET /admin/reaction-dispatch/outbox/:outboxId`

All endpoints require the admin bearer token. Missing or invalid auth returns `401`. Unknown boundary and unknown outbox records return `404`.

## Internal Outbox Contract

Only a `boundary_ready` record that references an `approved_for_dispatch` candidate can create a `queued_internal` outbox record.

The candidate is validated again against Support Event Contract v2 before enqueue. Rejected, invalid, blocked, superseded, stale, or unsafe candidates fail closed with `blocked_internal` response metadata and no persisted internal outbox record.

The enqueue is idempotent by `boundary_id` and `candidate_id`. A duplicate request returns the existing internal outbox record and does not write a duplicate audit entry.

Internal outbox records use safe metadata only:

- `outbox_id`
- `boundary_id`
- `candidate_id`
- `support_event_id`
- `stream_id`
- `character_id`
- `source`
- `contract_version`
- `candidate_status`
- `boundary_status`
- `outbox_status`
- `external_delivery_status`
- `adapter_execution_status`
- `dispatch_attempt_count`
- `safe_context_hash`
- `constraints_hash`
- `idempotency_key`
- `created_at`
- `updated_at`
- `safe_reason_codes`

For this PR, the only persisted success status is `queued_internal`. Blocked responses use `blocked_internal`.

`external_delivery_status` is always `not_attempted`, `adapter_execution_status` is always `not_executed`, and `dispatch_attempt_count` is always `0`.

## Security Boundaries

This is local/internal reaction dispatch outbox enqueue boundary only.

This does not call IRIS Core.

This does not call VOXWEAVE.

This does not execute AI reaction.

This does not call real TTS.

This does not call real Live2D.

This does not call real renderer.

This does not call real OBS.

This does not perform real WebSocket delivery.

This does not mutate support events.

This does not execute reaction.

This does not execute overlay.

This does not externally deliver outbox.

This does not expose raw messages.

This does not expose raw payloads.

This does not expose wallet addresses.

This does not expose secrets.

This does not expose private URLs.

This does not create production Admin Console readiness.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.
