# API Contract

Public:

- `GET /health`
- `GET /api/live/:streamId`
- `POST /api/wallet/nonce`
- `POST /api/wallet/verify`
- `POST /api/live/:streamId/tip-intents`
- `GET /api/tip-intents/:tipIntentId`

Internal and admin:

- `POST /internal/events` requires `Bearer MOCK_INTERNAL_TOKEN`.
- `GET /admin/live-sessions/:streamId/tips` requires `Bearer MOCK_ADMIN_TOKEN`.
- `POST /admin/tips/:supportEventId/approve` requires `Bearer MOCK_ADMIN_TOKEN`.
- `POST /admin/tips/:supportEventId/reject` requires `Bearer MOCK_ADMIN_TOKEN`.
- `WS /overlay/:streamId/ws?token=...` requires a mock overlay token in the MVP and must become a hashed stream-scoped read-only token in production.

All public input is validated with Zod schemas from `packages/shared`.

`GET /api/tip-intents/:tipIntentId` returns only the public DTO. It does not expose wallet addresses, raw display names, raw messages, message hashes, or client Tip ids.

`POST /internal/events` remains idempotency-first: support event lookup by `source + source_event_id` happens before affinity, overlay, reaction, or outbox side effects.
