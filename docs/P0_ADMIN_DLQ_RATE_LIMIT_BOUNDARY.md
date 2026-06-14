# P0 Admin DLQ Rate Limit Boundary

This change adds local/internal in-memory rate-limit boundaries for admin DLQ list, admin DLQ retry, and admin audit export endpoints.

The boundary is evaluated only after existing admin authentication succeeds. Missing or invalid admin authentication still returns 401, not 429.

The rate-limit key uses a short fingerprint derived from the admin authorization header. The raw admin token is not stored or returned.

The rate-limit response returns safe metadata only:

- `error`
- `scope`
- `retry_after_seconds`

This is local/internal in-memory admin rate-limit boundary only.

This does not create production rate-limit readiness.

This does not use Redis.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not store raw admin token.

This does not store IP/user-agent.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.
