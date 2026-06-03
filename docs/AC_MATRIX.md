# Acceptance Criteria Matrix

| AC | Status | Evidence files | Tests | Remaining work |
| --- | --- | --- | --- | --- |
| AC-LIVE-001 | partial | `docs/ARCHITECTURE.md`, `docs/PRD_SUMMARY.md` if present | Web/API mock tests | Production live progression remains IRIS Core scope. |
| AC-YT-001 | partial | `docs/IRIS_INTEGRATION.md`, `docs/EVENT_SCHEMA.md` | Shared schema tests | Official YouTube connector not implemented. |
| AC-YT-002 | partial | `docs/API_CONTRACT.md`, `docs/PRODUCT_VERIFICATION.md` | Normalizer tests | Future official API connector and verification code flow. |
| AC-WALLET-001 | partial | `apps/web`, `apps/api/src/server.ts` | API wallet mock tests | Real wallet integration not implemented. |
| AC-TIP-001 | partial | `apps/web`, `apps/api/src/server.ts`, `packages/shared` | API and shared tests | Production RPC not connected. |
| AC-TIP-002 | pass | `packages/shared`, `apps/api/src/server.ts` | Moderation and public DTO tests | None for MVP boundary. |
| AC-CHAIN-001 | partial | `contracts/src/TipRouterV1.sol`, `migrations/0001_durable_events.sql` | GitHub contract CI | Production chain listener not implemented. |
| AC-CHAIN-002 | partial | `migrations/0001_durable_events.sql`, `docs/RUNBOOK.md` | Migration tests | Reorg listener logic not implemented. |
| AC-EVENT-001 | pass | `packages/shared`, `apps/api/src/repositories/*`, `apps/api/src/server.ts` | Idempotency tests and live Postgres integration tests | Production chain listener still future work. |
| AC-AI-001 | partial | `packages/shared`, `docs/IRIS_INTEGRATION.md` | Shared AI request privacy tests | Production IRIS Core adapter not implemented. |
| AC-AFF-001 | pass | `packages/shared`, `apps/api/src/repositories/*` | Affinity cap, idempotency tests, and live Postgres unique constraint test | Production IRIS Core adapter remains future work. |
| AC-OBS-001 | partial | `apps/overlay`, `apps/api/src/server.ts`, `docs/SECURITY.md` | Overlay schema and token rejection tests | Production token hashing/rotation not implemented. |
| AC-MOD-001 | pass | `packages/shared`, `apps/api/src/server.ts` | Moderation tests | MVP heuristics only. |
| AC-ADMIN-001 | pass | `apps/api/src/server.ts`, `migrations/0001_durable_events.sql` | Admin auth, audit log, and DLQ retry endpoint tests | Production admin UI remains future work. |
| AC-LEGAL-001 | pass | `COMPLIANCE.md`, `docs/COMPLIANCE.md`, `apps/web` | UI prohibited wording test | Continue legal review before production. |
| AC-SEC-001 | partial | `docs/SECURITY.md`, `docs/THREAT_MODEL.md`, `.env.example` | Config, DTO, moderation, overlay token tests | Live secret management and token rotation remain deployment work. |
