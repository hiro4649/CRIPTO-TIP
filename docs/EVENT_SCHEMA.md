# Event Schema

Shared Zod schemas live in `packages/shared`.

Events:

- `support.received`
- `support.rejected`
- `affinity.updated`
- `character.reaction.requested`
- `character.reaction.completed`
- `overlay.tip_alert`
- `youtube.chat.message.received`
- `youtube.viewer.verified`

All event producers must validate with schemas before enqueueing or calling IRIS adapters.
