# Summary

Bootstraps CRIPTO-TIP as a pnpm TypeScript monorepo and implements the first secure MVP vertical slice for IRIS Web Companion for YouTube LIVE Crypto Tip.

# Scope

- `packages/shared`: Zod schemas, sanitizers, moderation, normalizers, affinity caps, idempotency keys, AI reaction and overlay event builders.
- `apps/api`: Fastify API with in-memory store, token-protected admin/internal endpoints, mock support.received pipeline, and overlay WebSocket.
- `apps/web`: viewer Companion MVP UI with wallet/verification/tip/status/relationship/safety surfaces.
- `apps/overlay`: OBS Browser Source overlay for `overlay.tip_alert`.
- `contracts`: Foundry `TipRouterV1` using OpenZeppelin SafeERC20, Pausable, and Ownable2Step, plus tests.
- `docs`: architecture, API, compliance, security, threat model, runbook, event schema, IRIS integration, dependency decisions, and initial audit.

# Security boundaries

YouTube LIVE is the broadcast and chat surface only. CRIPTO-TIP is an external IRIS Web Companion and must not replace YouTube Super Chat payment.

The MVP does not implement token sale, token swap, cash-out, exchange, user asset custody, internal crypto balances, lottery, ranking reward, price chart, or speculative reward.

All viewer names and messages are untrusted. AI reaction requests receive only sanitized fields and explicit constraints against token price discussion, financial return promises, wallet address reading, and romantic escalation from payment.

# Architecture decisions

- Fastify was selected for the MVP API.
- In-memory storage is used for the first vertical slice while types map toward PostgreSQL.
- Mock YouTube, wallet, chain, and IRIS Core adapters preserve contracts without production connectivity.
- Overlay uses WebSocket now; SSE fallback is documented for production.
- Chain idempotency uses chain id, contract address, tx hash, and log index.
- Support idempotency uses source and source event id.

# Dependency decisions

Latest npm registry tags were checked on 2026-06-02 and recorded in `docs/DEPENDENCY_DECISIONS.md`.

# Commands run

- `gh auth status`
- `gh repo create hiro4649/CRIPTO-TIP --private --clone --description "IRIS Web Companion for YouTube LIVE Crypto Tip"`
- `gh repo view hiro4649/CRIPTO-TIP --json name,owner,visibility,defaultBranchRef,url`
- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `cd contracts && forge test`
- `git grep -n "PRIVATE_KEY\\|SECRET\\|TOKEN\\|API_KEY\\|MNEMONIC\\|innerHTML\\|dangerouslySetInnerHTML" -- . ':!pnpm-lock.yaml' ':!.env.example' || true`
- `rg -n "dangerouslySetInnerHTML|innerHTML|scrape|scraping|スクレイ|price chart|cashout|cash-out|internal balance" apps packages contracts docs README.md COMPLIANCE.md SECURITY.md AGENTS.md -g '!node_modules'`
- `gitleaks detect --source . --no-git`
- `semgrep scan --config auto`
- `slither contracts/src/TipRouterV1.sol`

# Test results

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed, 4 test files and 16 tests.
- `cd contracts && forge test`: not run locally because `forge` is not installed in this environment.

# Audit results

Initial audit report is in `docs/AUDIT_REPORT_INITIAL.md`.

Critical: none open.
High: none open.
Medium: durable queue/DB/chain listener behavior is documented but not implemented in MVP.
Low: development default mock bearer tokens must be rejected in production mode later.

# Known gaps

- Production YouTube connector is documented only; no official API integration yet.
- Production chain listener is documented only; no RPC/reorg worker yet.
- PostgreSQL schema is documented conceptually; MVP uses in-memory storage.
- Foundry tests are authored but not executed locally because Foundry is unavailable.
- gitleaks, semgrep, and slither were unavailable locally.

# Follow-up issues

- Implement durable PostgreSQL schema and queue/DLQ.
- Implement official YouTube Live API connector.
- Implement chain listener with WebSocket subscription, `eth_getLogs` catch-up, cursor, and confirmation window.
- Add production config validation that rejects default mock tokens.
- Run Foundry, slither, semgrep, and gitleaks in CI or a prepared local toolchain.

# Commit SHA

0f4c9221e2756d28345e0db05fa695c70d20642f
