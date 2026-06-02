# Summary

Adds the durable event storage and queue boundary needed before production chain listener, official YouTube connector, and IRIS Core delivery work.

# Scope

- Adds `migrations/0001_durable_events.sql`.
- Adds repository interface, `InMemoryRepository`, and `PostgresRepository` boundary.
- Adds DB-backed outbox/DLQ types and worker boundary.
- Adds config validation for production rejection of default mock tokens.
- Updates API event flow to use repository/outbox methods.
- Adds migration, repository, outbox, config, and existing API safety tests.

# Security boundaries

YouTube LIVE remains the broadcast and chat surface. IRIS Web Companion remains the external Tip surface. YouTube Super Chat payment is not replaced.

CRIPTO-TIP does not implement token sale, swap, exchange, cash-out, custody, internal crypto balances, lottery, NFT prize, ranking reward, token price chart, or investment language.

# DB schema decisions

The migration separates raw and sanitized fields, stores bytes32-compatible `message_hash` and `client_tip_id`, keeps chain idempotency via `chain_id + contract_address + tx_hash + log_index`, and stores overlay token hashes rather than raw production tokens.

# Outbox/DLQ design

The outbox is DB-backed by design and at-least-once. Jobs use unique `idempotency_key`, lock fields, retry counters, next-attempt scheduling, and DLQ movement after max retries. Consumers must be idempotent.

# Repository boundary

API code now depends on `CriptoTipRepository`. Tests use `InMemoryRepository`. `PostgresRepository` defines the SQL boundary without requiring a live database in CI.

# Commands run

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `cd contracts && forge test || true`
- `git grep -n "PRIVATE_KEY\\|SECRET\\|API_KEY\\|MNEMONIC\\|innerHTML\\|dangerouslySetInnerHTML" -- . ':!pnpm-lock.yaml' ':!.env.example' || true`
- `rg -n "price increase|profit|yield|cash-out|cashout|swap|exchange|internal balance|lottery|NFT prize|token price" apps packages contracts docs README.md COMPLIANCE.md SECURITY.md AGENTS.md -g '!node_modules' || true`
- `gitleaks detect --source . --no-git || true`
- `semgrep scan --config auto || true`
- `slither contracts/src/TipRouterV1.sol || true`

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

# Follow-up issues

- Implement full PostgreSQL repository and integration tests.
- Add stale-lock reclamation and admin DLQ retry endpoint.
- Implement production chain listener with confirmation window and reorg handling.

# Commit SHA

Pending commit.
