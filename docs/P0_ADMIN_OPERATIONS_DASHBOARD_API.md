# P0 Admin Operations Dashboard API

This change adds a local/internal admin operations summary API.

It aggregates safe metadata for current P0 admin operations:

- DLQ entry counts
- DLQ counts grouped by stream id
- recent safe audit action counts
- local in-memory rate-limit summary

This is API-only. No web UI is added.

This is local/internal admin operations summary API only.

This does not create web Admin Console readiness.

This does not create production operations readiness.

This does not use Redis.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not store or expose raw admin token.

This does not store or expose IP/user-agent.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.
