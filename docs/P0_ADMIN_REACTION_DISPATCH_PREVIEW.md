# P0 Admin Reaction Dispatch Preview

This change adds local/internal admin reaction dispatch preview for support events.

The preview endpoints are:

- `GET /admin/support-events/:eventId/reaction-dispatch`
- `POST /admin/support-events/:eventId/reaction-dispatch/preview`

They require the admin bearer token and return 404 for unknown support events. Both endpoints are preview-only. They compute safe reaction context from an existing support event and do not mutate support events, enqueue reaction requests, enqueue overlay events, enqueue outbox jobs, write runtime delivery side effects, call real TTS, call real Live2D, call a renderer, call OBS, or perform real WebSocket delivery.

The response includes safe metadata only:

- support event id, stream id, character id, source, tier, moderation status, and resolution status
- safe viewer name and safe message summary
- relationship level and recent support count
- character continuity fields
- reaction constraints
- reaction, overlay, motion, and outbox candidate labels
- skipped side-effect statuses

The response excludes raw messages, raw payloads, wallet addresses, secrets, stack output, stdout, stderr, jobs URLs, and logs URLs.

This is local/internal admin preview only. It does not create runtime readiness, production readiness, legal compliance, YouTube policy compliance, real DB persistence, DB driver dependency, Redis dependency, Kafka dependency, package changes, lockfile changes, migrations, contracts changes, workflows, web UI, overlay app behavior, wallet/RPC/deploy changes, real YouTube API usage, or OAuth usage.

YouTube LIVE remains the broadcast surface. IRIS Web Companion remains the external crypto Tip intake surface. This preview does not replace YouTube Super Chat payment and does not represent IRIS Token Tip as YouTube Super Chat.
