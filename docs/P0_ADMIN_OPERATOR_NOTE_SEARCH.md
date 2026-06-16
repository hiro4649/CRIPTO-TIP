# P0 Admin Operator Note Search

This change adds local/internal admin operator note search.

The endpoint is `GET /admin/operator-notes`.

This is local/internal admin operator note search only. It does not mutate support events or notes, trigger side effects, expose notes publicly, create production Admin Console readiness, use a real DB, add Redis, Kafka, DB driver, package, or lockfile changes, expose raw payloads, expose secrets, or claim runtime, production, legal, or YouTube policy readiness.
