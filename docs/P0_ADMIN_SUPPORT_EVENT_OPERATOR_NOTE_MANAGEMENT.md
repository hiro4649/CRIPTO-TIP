# P0 Admin Support Event Operator Note Management

This change adds local/internal admin operator note patch and archive controls.

The endpoints are `PATCH /admin/support-events/:eventId/operator-notes/:noteId` and `POST /admin/support-events/:eventId/operator-notes/:noteId/archive`.

This is local/internal admin operator note management only. It does not mutate support financial, source, wallet, moderation, or affinity fields. It does not trigger side effects, expose notes publicly, create production Admin Console readiness, use a real DB, add Redis, Kafka, DB driver, package, or lockfile changes, expose raw payloads, expose secrets, or claim runtime, production, legal, or YouTube policy readiness.
