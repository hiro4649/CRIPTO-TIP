# P0 Admin DLQ Audit Trail

This change adds a local/internal audit trail for admin DLQ list and retry operations.

The audit records are safe metadata only:

- `actor_type` is `admin`.
- `actor_id` is a safe admin id or mock admin id.
- `action` is allowlisted.
- `target_type` is allowlisted.
- `target_id` is a safe stream id or dead letter id.
- `before_json` and `after_json` avoid raw payloads and secrets.
- IP address and user-agent are not handled in this PR.

This is local/internal admin DLQ audit trail only.

This does not create production Admin Console readiness.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not expose raw payloads.

This does not expose secrets.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.
