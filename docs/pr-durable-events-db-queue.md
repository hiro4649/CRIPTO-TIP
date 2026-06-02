# Summary

Adds the durable event storage and queue boundary needed before production chain listener, official YouTube connector, and IRIS Core delivery work.

Follow-up fix completes the server-side repository boundary so `buildServer(repo)` no longer reads `InMemoryRepository` internals.

# Goal

Make PR #2 reviewable as a durable idempotency, repository, outbox, and DLQ boundary without adding production chain listener, production YouTube connector, production IRIS delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording, or speculative reward behavior.

# Scope

- Adds `migrations/0001_durable_events.sql`.
- Adds repository interface, `InMemoryRepository`, and `PostgresRepository` boundary.
- Adds DB-backed outbox/DLQ types and worker boundary.
- Adds config validation for production rejection of default mock tokens.
- Updates API event flow to use repository/outbox methods.
- Adds migration, repository, outbox, config, and existing API safety tests.
- Adds server tests that inject `new InMemoryRepository()` explicitly.
- Adds PostgresRepository tests for server-path methods, public DTO safety, default affinity, and parameterized SQL.

# Security boundaries

YouTube LIVE remains the broadcast and chat surface. IRIS Web Companion remains the external Tip surface. YouTube Super Chat payment is not replaced.

CRIPTO-TIP does not implement token sale, swap, exchange, cash-out, custody, internal crypto balances, lottery, NFT prize, ranking reward, token price chart, or investment language.

# DB schema decisions

The migration separates raw and sanitized fields, stores bytes32-compatible `message_hash` and `client_tip_id`, keeps chain idempotency via `chain_id + contract_address + tx_hash + log_index`, and stores overlay token hashes rather than raw production tokens.

# Outbox/DLQ design

The outbox is DB-backed by design and at-least-once. Jobs use unique `idempotency_key`, lock fields, retry counters, next-attempt scheduling, and DLQ movement after max retries. Consumers must be idempotent.

# Repository boundary

API code now depends on `CriptoTipRepository`. Tests use `InMemoryRepository`. `PostgresRepository` defines the SQL boundary without requiring a live database in CI.

The server path now uses repository methods for recent tip counts, current affinity, stream support event listing, and durable event side effects. The global default repository export remains only as the default injected implementation.

# Product verification

The product verification scope is the API/repository/outbox boundary and docs. Verification checks that duplicate events stay idempotent, public TipIntent DTOs do not expose raw viewer or wallet fields, moderation gates prevent unsafe side effects, Postgres SQL uses placeholders, and the overlay remains token-gated and text-only. No production YouTube API, RPC, or IRIS Core endpoint is connected in this PR.

# Commands run

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `cd contracts && forge test || true`
- secret/risky rendering grep, excluding lockfile and `.env.example`
- `rg -n "price increase|profit|yield|cash-out|cashout|swap|exchange|internal balance|lottery|NFT prize|token price" apps packages contracts docs README.md COMPLIANCE.md SECURITY.md AGENTS.md -g '!node_modules' || true`
- `gitleaks detect --source . --no-git || true`
- `semgrep scan --config auto || true`
- `slither contracts/src/TipRouterV1.sol || true`

# Tests or checks run

Local pnpm install, lint, typecheck, and unit tests passed on current head. Local Foundry execution was attempted but `forge` is not installed in this Windows environment; GitHub Actions runs the pinned Foundry contract job.

# Test results

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed, 8 test files and 38 tests.
- `forge test`: not run locally because `forge` is not installed in this environment.

# Audit results

See `docs/AUDIT_REPORT_DB_QUEUE.md`.

# Known gaps

- Full Postgres repository implementation is not yet wired to a real pool.
- Production chain listener is still a follow-up.
- Official YouTube connector is still a follow-up.
- IRIS Core delivery remains a mock/outbox boundary.
- Stale lock reclamation and admin DLQ retry endpoint are not implemented yet.
- Migration status text columns still need enum check constraints in a follow-up migration.

# Residual risks

Postgres behavior is covered by SQL-boundary tests but not live integration tests. The outbox worker has retry/DLQ boundaries but no stale-lock reclaim job or admin DLQ retry endpoint yet. Production stream-scoped hashed overlay token storage and rotation remain follow-up work.

# Follow-up issues

- Implement full PostgreSQL repository and integration tests.
- Add stale-lock reclamation and admin DLQ retry endpoint.
- Implement production chain listener with confirmation window and reorg handling.

# Commit SHA

Pending commit.
