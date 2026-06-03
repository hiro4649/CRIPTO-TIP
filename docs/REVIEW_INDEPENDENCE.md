# Review Independence

This evidence does not rely only on Codex self-report. It records external and code-level checks that a reviewer can reproduce.

| Evidence | Value |
| --- | --- |
| GitHub PR state | PR #2 open, mergeable at last check. |
| Head SHA before repair | `afb371ef29fb7fea9e5cc08fef866040441e3b79`. |
| Product CI run ID | `26835142098`. |
| Latest product CI run ID | `26858338314`. |
| Product CI status | `typescript` pass, `contracts` pass. |
| Latest failed quality-gate run ID | `26835148559`. |
| Latest inspected failed quality-gate run ID | `26858353061`. |
| Quality-gate artifact | `7374890965` from latest inspected failed quality-gate run `26861097867`. |
| Manual verification commands | `corepack pnpm install`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, security grep, prohibited wording rg, repository internals rg. |
| Package verification commands | `npm test`; Node 20 Vitest reproduction with `npx -y node@20 ./node_modules/vitest/vitest.mjs run packages/shared apps/api apps/overlay apps/web`. |
| Code-level evidence files | `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/api/src/repositories/*`, `apps/api/src/outbox/*`, `migrations/0001_durable_events.sql`. |
| Known gaps | Live DB integration, stale lock reclamation, admin DLQ retry, official YouTube connector, IRIS Core delivery adapter. |
| Human review required fields | Review scope, residual risks, production readiness gate, API compatibility, security boundary, and test coverage are documented in this evidence set. |
