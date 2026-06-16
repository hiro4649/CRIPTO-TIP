# P0 Admin Support Event Action Plan

This change adds a local/internal admin read model for a single support event action plan.

The endpoint is:

`GET /admin/support-events/:eventId/action-plan`

It requires the admin bearer token and returns safe metadata only. The action plan is read-only: it does not mutate support events, write audit logs, enqueue reaction requests, enqueue overlay events, or deliver any runtime output.

## Response Shape

The response includes:

- Support event identifiers: `event_id`, `source`, `stream_id`, and `character_id`.
- Current moderation state: `moderation_status` and `review_status`.
- Safe delivery metadata: `delivery_status`.
- A fixed local action allowlist: `approve_hold`, `reject_hold`, `view_timeline`, `view_side_effects`, `overlay_resend`, `reaction_resend`, `adjust_safe_fields`, and `bulk_preview`.
- State-specific blocked action reasons.
- A side-effect ledger summary.
- A timeline reference containing only the event id and entry count.

Blocked reason codes include `already_approved`, `already_rejected`, `held_requires_review`, `unsupported_source`, `side_effect_already_applied`, and `state_transition_blocked`.

## Boundaries

This is not a product runtime execution feature. It does not call YouTube, OAuth, RPC, DB drivers, TTS, Live2D, a renderer, OBS, or WebSocket delivery.

This change does not add package dependencies, DB drivers, migrations, contracts, workflow changes, web UI changes, or overlay app changes.

It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
