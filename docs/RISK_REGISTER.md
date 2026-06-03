# Risk Register

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| High | Production Chain Listener is not implemented. | Backend/chain integration owner | chain-listener PR | Keep mock connector only; require confirmation window, reorg handling, and `tx_hash + log_index` idempotency before production. |
| Resolved in PR #4 | Live Postgres integration test exists for migration, unique constraints, repository methods, outbox reclaim, and DLQ retry. | Backend storage owner | merged by postgres-integration PR | GitHub CI runs Postgres service with `RUN_LIVE_POSTGRES_TESTS=true`. |
| Resolved in PR #4 | Stale lock reclamation exists for DB-backed and in-memory repository paths. | Queue/worker owner | merged by outbox-worker-hardening PR | Worker helper reclaims only stale `processing` jobs and preserves active locks. |
| Resolved in PR #4 | Admin DLQ retry endpoint exists and writes audit log. | Backend/admin owner | merged by dlq-admin PR | Endpoint requires admin Bearer token and requeues original outbox job. |
| Medium | Official YouTube connector is not implemented. | YouTube integration owner | youtube-connector PR | Use official YouTube APIs only; keep mock connector in MVP. |
| Medium | IRIS Core delivery adapter is not implemented. | IRIS integration owner | iris-delivery PR | Keep outbox/mock adapter boundary; add idempotent delivery and retry telemetry. |
| Medium | Stream-scoped hashed overlay token rotation is not implemented. | Security/backend owner | overlay-token PR | Store token hashes only, add rotation and stream scope. |
| Medium | Migration status columns lack enum check constraints. | Backend storage owner | migration-hardening PR | Add additive check constraints for moderation, delivery, and outbox statuses. |
| Low | Local forge is unavailable. | Contract owner | toolchain setup PR if needed | GitHub CI contract job covers Foundry tests; local setup can be added separately. |
