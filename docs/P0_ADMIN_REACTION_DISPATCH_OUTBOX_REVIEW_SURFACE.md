# P0 Admin Reaction Dispatch Outbox Review Surface

This change adds a read-only admin review surface for local/internal reaction dispatch outbox records.

It lets an operator inspect `queued_internal` outbox records and safe review blockers before any runtime dispatch work exists.

## Endpoints

- `GET /admin/reaction-dispatch/outbox-review`
- `GET /admin/reaction-dispatch/outbox-review/:outboxId`

Both endpoints require the admin bearer token. The list endpoint supports safe filters for `outbox_status`, `stream_id`, `character_id`, `source`, `limit`, and `offset`.

## Review Entry

The review surface returns safe metadata only:

- IDs for outbox, boundary, candidate, and support event
- stream, character, source, and contract version
- candidate, boundary, outbox, external delivery, and adapter execution statuses
- dispatch attempt count
- operator review status
- safe reason codes
- review blockers
- created and updated timestamps

`ready_for_operator_review` means the internal outbox record is still local, `queued_internal`, has no external delivery attempt, has no adapter execution, and has zero dispatch attempts.

`blocked_for_operator_review` means a safe status mismatch exists. It is review metadata only, not runtime execution.

## Security Boundaries

This is a read-only admin review surface.

This does not create internal outbox records.

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
