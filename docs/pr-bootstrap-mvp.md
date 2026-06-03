# Summary

Bootstraps CRIPTO-TIP as a pnpm TypeScript monorepo and implements the first secure MVP vertical slice for IRIS Web Companion for YouTube LIVE Crypto Tip.

Follow-up hardening adds event idempotency-before-side-effects, moderation gates, public TipIntent DTOs, bytes32-compatible hashes, deterministic wallet redaction, YouTube Super Chat moderation, malformed overlay message handling, overlay WS token checks, and stronger contract tests.

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
- Duplicate support events return the existing event before affinity, overlay, reaction, or memory side effects.
- `approved`, `display_only`, `hold`, `rejected`, and `shadow_ignored` have explicit MVP gates.

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
- secret/risky rendering grep, excluding lockfile and `.env.example`
- prohibited scope wording scan across app, package, contract, and docs paths
- `gitleaks detect --source . --no-git`
- `semgrep scan --config auto`
- `slither contracts/src/TipRouterV1.sol`

# Test results

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- Initial `corepack pnpm test`: passed, 4 test files and 16 tests.
- After hardening `corepack pnpm test`: passed, 4 test files and 27 tests.
- `cd contracts && forge test`: not run locally because `forge` is not installed in this environment; GitHub Actions contract job runs it.

# Audit results

Initial audit report is in `docs/AUDIT_REPORT_INITIAL.md`.

Critical: none open.
High: none open.
Medium: durable queue/DB/chain listener behavior is documented but not implemented in MVP.
Low: development default mock bearer tokens must be rejected in production mode later.
Low: overlay token is a shared mock token in MVP and must become stream-scoped, hashed, and rotated.

# Known gaps

- Production YouTube connector is documented only; no official API integration yet.
- Production chain listener is documented only; no RPC/reorg worker yet.
- PostgreSQL schema is documented conceptually; MVP uses in-memory storage.
- Foundry tests are authored but not executed locally because Foundry is unavailable.
- gitleaks, semgrep, and slither were unavailable locally.
- Production overlay auth still needs stream-scoped hashed token storage and rotation.

# Follow-up issues

- Implement durable PostgreSQL schema and queue/DLQ.
- Implement official YouTube Live API connector.
- Implement chain listener with WebSocket subscription, `eth_getLogs` catch-up, cursor, and confirmation window.
- Add production config validation that rejects default mock tokens.
- Run local Foundry, slither, semgrep, and gitleaks in a prepared local toolchain.
- Replace shared mock overlay token with stream-scoped hashed token storage.

# Commit SHA

See current PR head SHA.
