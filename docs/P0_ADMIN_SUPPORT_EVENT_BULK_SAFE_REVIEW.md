# P0 Admin Support Event Bulk Safe Review

This document defines the local/internal admin bulk review preview for support events.

## Scope

`POST /admin/support-events/bulk-review/preview` accepts a bounded list of support event IDs and returns safe eligibility metadata for each requested event.

This is local/internal admin bulk review preview only.

This does not approve or reject events in bulk.

This does not mutate support events.

This does not trigger side effects.

This does not create production Admin Console readiness.

## Safety Boundary

The response is safe metadata only. It may include event ID, existence status, stream ID, character ID, source, moderation status, eligible action IDs, and an ineligible reason.

The endpoint does not expose raw messages.

The endpoint does not expose raw payloads.

The endpoint does not expose secrets.

The endpoint does not call real TTS.

The endpoint does not call real Live2D.

The endpoint does not call a real renderer.

The endpoint does not call real OBS.

The endpoint does not perform real WebSocket delivery.

The endpoint does not change web or overlay app behavior.

The endpoint does not use real DB.

The endpoint does not add Redis, Kafka, DB driver, package, or lockfile changes.

The endpoint does not claim runtime readiness.

The endpoint does not claim production readiness.

The endpoint does not claim legal compliance.

The endpoint does not claim YouTube policy compliance.

## Eligible Actions

Eligible actions are drawn only from this allowlist:

- `approve_hold`
- `reject_hold`
- `view_timeline`
- `view_side_effects`
- `overlay_resend`
- `reaction_resend`
- `adjust_safe_fields`

Held events may be eligible for hold approval or rejection.

Rejected events do not receive approval eligibility.

Unknown event IDs are returned as safe missing entries.

## Verification

The tests cover admin auth, invalid input, max event count, duplicate event IDs, unknown event IDs, safe metadata, eligible action allowlist, read-only behavior, no reaction enqueue, no overlay enqueue, and committed evidence boundaries.
