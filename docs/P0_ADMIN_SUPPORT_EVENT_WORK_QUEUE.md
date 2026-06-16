# P0 Admin Support Event Work Queue

This change adds local/internal admin support event work queue visibility.

The endpoint is `GET /admin/support-events/work-queue`.

This is local/internal admin support event work queue visibility only. It does not mutate support events, trigger side effects, create production Admin Console readiness, use a real DB, add Redis, Kafka, DB driver, package, or lockfile changes, expose raw messages, expose raw payloads, expose secrets, or claim runtime, production, legal, or YouTube policy readiness.
