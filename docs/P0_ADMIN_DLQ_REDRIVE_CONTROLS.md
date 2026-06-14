# P0 Admin DLQ Redrive Controls

This change adds local/internal admin DLQ redrive controls for retry candidates created by the P0 support.received pipeline.

It is intentionally narrow:

- Admin bearer authentication is required.
- Unknown DLQ ids return not found.
- Unsafe DLQ payloads fail closed.
- Retry reason codes are allowlisted.
- Duplicate retry requests reuse the same outbox event instead of creating duplicate jobs.
- Retry responses return safe metadata only.
- Raw payloads, secret-like values, connection strings, private URLs, and external payload details are not returned.
- Moderation hold events are not treated as retryable DLQ entries.

This is local/internal admin DLQ redrive control only.

This does not create production Admin Console readiness.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not expose raw payloads.

This does not expose secrets.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.
