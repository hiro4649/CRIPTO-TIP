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

## PR youtube-ops-hardening

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| Medium | Production YouTube credential provider wiring remains deferred. | Backend/operations | deployment integration PR | Production config rejects official connector mode unless credential source is `secret_manager`. |
| Medium | Live YouTube API soak and dashboard alert routing remain deferred. | Operations | production observability PR | Deterministic mock soak and metrics name contract are covered now. |
| Low | `liveChatId` acquisition still depends on upstream live session population. | YouTube integration owner | live session acquisition PR if needed | The connector boundary refuses missing `liveChatId` and does not scrape. |

## PR youtube-prod-observability

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| Medium | Provider-specific secret manager SDK is not wired. | Backend/DevOps | Deployment provider PR | This PR adds interface and resolver boundary only; deployment injects provider SDK later. |
| Medium | Real dashboard exporter is not implemented. | Backend/Observability | Dashboard exporter PR | Metric names and mapping are fixed by tests and docs. |
| Medium | Alert routing is documentation-only. | Operations | Alert integration PR | RUNBOOK and `docs/YOUTUBE_OBSERVABILITY.md` define routing and operator actions. |
| Medium | Live YouTube soak is manual-gated and not run in CI. | QA/Operations | Live environment validation | Tests prove the gate stays skipped unless explicit flag and secret manager boundary exist. |

## PR youtube-deployment-dashboard

| Severity | Risk | Owner | Next PR | Mitigation |
| --- | --- | --- | --- | --- |
| Medium | Provider-specific deployment apply is not executed by this repository. | Backend/DevOps | Deployment apply PR | `ProviderSpecificYouTubeCredentialProvider` and config validation exist; actual provider SDK/apply remains manual-gated and outside git secrets. |
| Medium | Real dashboard exporter deployment is not implemented. | Backend/Observability | Exporter integration PR | Metric snapshot builder, dashboard contract JSON, and tests fix the contract before exporter wiring. |
| Medium | Alert delivery into a paging provider is not implemented. | Operations | Alert provider integration PR | Alert routing config and runbook define operator actions for quota, auth, invalid token, missing liveChatId, reconnect storm, fallback spike, zero events, and verification failures. |
| Medium | Live YouTube account soak remains manual-gated. | QA/Operations | Live environment validation | Tests keep live soak skipped unless an explicit flag and managed credential boundary are present. |
| Low | Local forge may be unavailable on this Windows machine. | Contract owner | toolchain setup PR if needed | GitHub contracts CI remains required before merge. |
