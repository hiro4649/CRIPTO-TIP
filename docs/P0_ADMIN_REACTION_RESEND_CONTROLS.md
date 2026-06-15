# P0 Admin Reaction Resend Controls

This change adds local/internal admin controls for re-enqueueing one AI reaction request candidate for an already approved support event.

The endpoint is `POST /admin/support-events/:eventId/reaction-resend`.

It is intentionally narrow:

- Admin bearer auth is required.
- Unknown support events return 404.
- Held support events cannot be reaction-resent until approved.
- Rejected support events cannot be reaction-resent.
- Approved support events enqueue one idempotent reaction resend candidate.
- Duplicate resend requests do not duplicate reaction requests or outbox jobs.
- Reaction resend does not apply affinity.
- Reaction resend does not enqueue overlay.
- Reaction resend does not mutate support amount, source, wallet, or moderation state.
- Responses and audit logs contain safe metadata only.

This is local/internal admin reaction resend control only. It does not call real TTS, real Live2D, real renderer, real OBS, or real WebSocket delivery. It does not change web or overlay app code, use a real DB, add Redis, Kafka, DB driver, package, or lockfile changes, expose raw messages, expose raw payloads, expose secrets, or claim runtime, production, legal, or YouTube policy readiness.
