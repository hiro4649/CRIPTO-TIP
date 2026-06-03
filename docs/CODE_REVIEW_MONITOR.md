# Code Review Monitor Evidence

| Monitor item | Evidence |
| --- | --- |
| Auth surface changed | Admin/internal/overlay token checks remain tested in `apps/api/src/server.test.ts`. |
| Negative auth test evidence | Admin auth rejection test, overlay invalid token test, and public DTO no raw leak test are present. |
| API surface changed | `docs/API_COMPATIBILITY_SUMMARY.md` documents public, internal, and admin API compatibility. |
| Runtime surface changed | No production runtime readiness is claimed; PR #2 is G2 partial. |
| Runtime smoke reason | Runtime smoke is not required for production because no production runtime connection is claimed. Local mock runtime tests cover MVP behavior only. |
| Storage surface changed | `migrations/0001_durable_events.sql`, migration tests, repository tests, and outbox tests exist. |
| Large diff | Review scope is bounded in `docs/TASK_CONTRACT.md`; residual risks are tracked in `docs/RISK_REGISTER.md`. |
| Test evidence | `corepack pnpm test` passed with 9 test files and 45 tests. |
| Package verification | `npm test` and Node 20 Vitest reproduction passed with 9 test files and 45 tests; `ws` is test-only compatibility for the overlay negative auth test. |
| Package/lockfile changed and verified | `package.json` and `pnpm-lock.yaml` changed for real root `npm test` and Node 20 test compatibility; verified by pnpm, npm, and GitHub CI. |
| Risk summary | `docs/RISK_REGISTER.md` records production Chain Listener, live Postgres integration, stale lock reclamation, admin DLQ retry, YouTube connector, IRIS delivery, overlay token rotation, migration enum checks, and local forge availability. |
