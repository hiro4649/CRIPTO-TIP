# P0 Admin DLQ Audit Export Safe Summary

This change adds local/internal admin audit log safe-summary visibility for DLQ operations.

The endpoint is an internal admin surface. It requires existing admin bearer authentication before returning any audit summaries.

The audit export returns safe metadata only:

- allowlisted audit actions
- allowlisted audit target types
- safe target ids
- safe stream ids
- bounded result counts
- safe outbox event ids
- redacted metadata when unsafe audit fields are present

The audit export does not return raw payloads, secrets, OAuth tokens, DB URLs, wallet secrets, private URLs, stack traces, stdout, stderr, raw logs, log URLs, or job URLs.

This is local/internal admin audit safe-summary visibility only.

This does not create production Admin Console readiness.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not change migrations.

This does not use real YouTube API, real OAuth, real RPC, wallet, or deploy operations.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.

Moderation hold remains separate from DLQ audit targets.
