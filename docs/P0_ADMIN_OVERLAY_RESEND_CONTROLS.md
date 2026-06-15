# P0 Admin Overlay Resend Controls

This change adds local/internal admin controls for re-enqueueing one overlay resend candidate for an already approved support event.

The endpoint is `POST /admin/support-events/:eventId/overlay-resend`.

It is intentionally narrow:

- Admin bearer auth is required.
- Unknown support events return 404.
- Held support events cannot be resent until approved.
- Rejected support events cannot be resent.
- Approved support events enqueue one idempotent overlay resend candidate.
- Duplicate resend requests do not duplicate overlay events or outbox jobs.
- Overlay resend does not apply affinity.
- Overlay resend does not enqueue an AI reaction request.
- Overlay resend does not mutate support amount, source, wallet, tier, or moderation fields.
- Responses and audit logs contain safe metadata only.

This is not real OBS delivery, real WebSocket delivery, production readiness, legal readiness, or YouTube policy readiness.
