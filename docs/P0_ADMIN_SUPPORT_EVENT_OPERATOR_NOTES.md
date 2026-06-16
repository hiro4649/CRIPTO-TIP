# P0 Admin Support Event Operator Notes

This change adds local/internal admin operator notes for support events.

The endpoints are:

`POST /admin/support-events/:eventId/operator-notes`

`GET /admin/support-events/:eventId/operator-notes`

They require the admin bearer token and return safe metadata only. Notes are admin-only metadata and are not exposed through public support event responses.

## Boundaries

This does not mutate support financial, source, wallet, moderation, or affinity fields.

This does not trigger support side effects, enqueue reaction requests, enqueue overlay events, call real TTS, call real Live2D, call a renderer, call OBS, or perform real WebSocket delivery.

This does not use a real DB, add Redis, add Kafka, add a DB driver, change package files, change lockfiles, change migrations, change contracts, change workflows, change web UI, or change the overlay app.

This does not expose raw payloads, secrets, stack output, stdout, stderr, jobs_url, or logs_url.

This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
