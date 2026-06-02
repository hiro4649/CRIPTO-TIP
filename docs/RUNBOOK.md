# Runbook

Local:

```bash
corepack enable || true
pnpm install
pnpm dev:api
pnpm dev:web
pnpm dev:overlay
```

Failure behavior:

- YouTube API outage pauses YouTube-derived support but token Tip mock flow can continue.
- RPC outage shows delayed confirmation and resumes from block cursor.
- IRIS Core outage queues `support.received`.
- Overlay outage is resendable and does not stop AI reaction.
- Moderation outage routes new Tips to hold.
- Contract pause disables Tip form.

Queue and DLQ are documented for production; MVP uses in-memory maps.
