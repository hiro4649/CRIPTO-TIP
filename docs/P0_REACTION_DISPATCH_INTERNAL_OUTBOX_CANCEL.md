# P0 Reaction Dispatch Internal Outbox Cancel

This change adds local/internal reaction dispatch outbox cancellation.

It cancels internal queued records before external delivery exists. It does not dispatch runtime work.

## Endpoints

- `POST /admin/reaction-dispatch/outbox/:outboxId/cancel`
- `GET /admin/reaction-dispatch/outbox/:outboxId/cancel-status`

Both endpoints require the admin bearer token. Missing or invalid auth returns `401`. Unknown internal outbox records return `404`.

## Cancel Contract

Only `queued_internal` and `pending_internal_dispatch` records are cancellable.

Cancel is allowed only when `external_delivery_status` is `not_attempted`, `adapter_execution_status` is `not_executed`, and `dispatch_attempt_count` is `0`.

Cancel changes the local/internal outbox status to `cancelled_internal`, records `cancelled_at`, records `cancelled_by_actor_type`, and keeps the record present.

Cancel is idempotent. A second cancel returns the existing `cancelled_internal` status and does not write duplicate audit side effects.

Cancel status returns safe metadata only:

- `outbox_id`
- `candidate_id`
- `boundary_id`
- `support_event_id`
- `outbox_status`
- `external_delivery_status`
- `adapter_execution_status`
- `cancelled_at`
- `cancelled_by_actor_type`
- `safe_reason_codes`
- `created_at`
- `updated_at`

## Security Boundaries

This is local/internal reaction dispatch outbox cancellation only.

This does not dispatch runtime work.

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
