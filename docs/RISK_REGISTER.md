# Risk Register

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| High | Production Chain Listener is not implemented. | Backend/chain integration owner | chain-listener PR | Keep mock connector only; require confirmation window, reorg handling, and `tx_hash + log_index` idempotency before production. |
| High | Live Postgres integration test is not implemented. | Backend storage owner | postgres-integration PR | Add docker-compose backed migration/repository tests before DB mode is used outside local. |
| High | Stale lock reclamation is not implemented. | Queue/worker owner | outbox-worker-hardening PR | Add reclaim query with lock age threshold and tests for expired vs active locks. |
| High | Admin DLQ retry endpoint is not implemented. | Backend/admin owner | dlq-admin PR | Add authenticated retry endpoint, audit log write, and idempotent requeue behavior. |
| Medium | Official YouTube connector is not implemented. | YouTube integration owner | youtube-connector PR | Use official YouTube APIs only; keep mock connector in MVP. |
| Medium | IRIS Core delivery adapter is not implemented. | IRIS integration owner | iris-delivery PR | Keep outbox/mock adapter boundary; add idempotent delivery and retry telemetry. |
| Medium | Stream-scoped hashed overlay token rotation is not implemented. | Security/backend owner | overlay-token PR | Store token hashes only, add rotation and stream scope. |
| Medium | Migration status columns lack enum check constraints. | Backend storage owner | migration-hardening PR | Add additive check constraints for moderation, delivery, and outbox statuses. |
| Low | Local forge is unavailable. | Contract owner | toolchain setup PR if needed | GitHub CI contract job covers Foundry tests; local setup can be added separately. |

