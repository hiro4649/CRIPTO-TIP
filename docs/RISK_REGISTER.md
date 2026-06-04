# Risk Register

## PR production-chain-listener-reorg

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| High | Production RPC deployment wiring is not complete. | Backend | listener-runtime-config PR | RPC provider is injected; no production RPC URL or secret is committed. |
| High | Listener process supervision and operational metrics export remain incomplete. | Backend/ops | listener-observability PR | Tests cover retry boundaries; runbook documents catch-up and reorg recovery. |
| Medium | Official YouTube connector production credential rollout is not complete. | YouTube integration owner | youtube-ops PR | Adapter boundary exists; production OAuth/API key provisioning and live API soak testing remain gated. |
| Resolved in iris-core-delivery-adapter PR | Production IRIS Core delivery adapter boundary exists. | IRIS integration owner | merged by iris-delivery PR | Sanitized DTOs, idempotency keys, retry/DLQ behavior, and secret boundary tests are added. |
| Medium | Multiple chain and multiple token support are not implemented. | Backend | multi-chain-token PR if product scope requires it | Current config is single chain and single TipRouter contract. |
| Low | Local forge may be unavailable on this Windows machine. | Contract owner | toolchain setup PR if needed | GitHub contracts CI remains the source of truth. |

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| High | Production Chain Listener is not implemented. | Backend/chain integration owner | chain-listener PR | Keep mock connector only; require confirmation window, reorg handling, and `tx_hash + log_index` idempotency before production. |
| Resolved in PR #4 | Live Postgres integration test exists for migration, unique constraints, repository methods, outbox reclaim, and DLQ retry. | Backend storage owner | merged by postgres-integration PR | GitHub CI runs Postgres service with `RUN_LIVE_POSTGRES_TESTS=true`. |
| Resolved in PR #4 | Stale lock reclamation exists for DB-backed and in-memory repository paths. | Queue/worker owner | merged by outbox-worker-hardening PR | Worker helper reclaims only stale `processing` jobs and preserves active locks. |
| Resolved in PR #4 | Admin DLQ retry endpoint exists and writes audit log. | Backend/admin owner | merged by dlq-admin PR | Endpoint requires admin Bearer token and requeues original outbox job. |
| Medium | Official YouTube connector production credential rollout is not complete. | YouTube integration owner | youtube-ops PR | Use official YouTube APIs only; no scraping; require production credential handling and quota monitoring before runtime claim. |
| Resolved in iris-core-delivery-adapter PR | IRIS Core delivery adapter exists. | IRIS integration owner | merged by iris-delivery PR | Runtime credentials remain outside git; delivery worker uses injected client and idempotent outbox jobs. |
| Medium | Stream-scoped hashed overlay token rotation is not implemented. | Security/backend owner | overlay-token PR | Store token hashes only, add rotation and stream scope. |
| Medium | Migration status columns lack enum check constraints. | Backend storage owner | migration-hardening PR | Add additive check constraints for moderation, delivery, and outbox statuses. |
| Low | Local forge is unavailable. | Contract owner | toolchain setup PR if needed | GitHub CI contract job covers Foundry tests; local setup can be added separately. |
