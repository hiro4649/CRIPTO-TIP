# Architecture

YouTube LIVE is the broadcast and chat surface only. IRIS Web Companion is the external crypto Tip surface. CRIPTO-TIP must not replace YouTube Super Chat payment or present IRIS Token Tip as YouTube Super Chat.

Inputs are normalized into `support.received`:

- YouTube Super Chat from official YouTube Live APIs.
- YouTube Super Sticker from official YouTube Live APIs.
- IRIS Token Tip from `TipRouterV1` events.
- Future IRIS Credits.
- Admin manual support.

IRIS Core owns AI reaction, TTS, Live2D/3D motion, affinity, memory, and live progression. OBS Browser Source shows `overlay.tip_alert`.

The MVP uses mock connectors and in-memory storage while preserving typed contracts for PostgreSQL, queues, and chain listeners.
