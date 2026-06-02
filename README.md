# IRIS Web Companion for YouTube LIVE Crypto Tip

This repository is **CRIPTO-TIP**. Keep that spelling exactly.

CRIPTO-TIP is an external IRIS Web Companion that accepts crypto Tip intents during YouTube LIVE streams and normalizes confirmed support into `support.received` events for IRIS Core.

YouTube LIVE remains the broadcast and chat surface. CRIPTO-TIP does not replace YouTube Super Chat payment, does not sell or exchange tokens, does not custody viewer assets, and does not provide cash-out.

## MVP

- `apps/web`: viewer companion UI with safety notices and mocked wallet flow.
- `apps/api`: Fastify API, mock storage, typed schemas, support event pipeline, admin token checks, overlay WebSocket.
- `apps/overlay`: OBS Browser Source overlay that renders `overlay.tip_alert` with text-only React rendering.
- `packages/shared`: Zod schemas, sanitizers, moderation, normalizers, affinity, event builders.
- `contracts`: Foundry Solidity `TipRouterV1` using OpenZeppelin `SafeERC20`, `Pausable`, and `Ownable2Step`.

## Commands

```bash
corepack enable || true
pnpm install
pnpm lint
pnpm typecheck
pnpm test
cd contracts && forge test
```
