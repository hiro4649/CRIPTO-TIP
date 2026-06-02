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
- `WS /overlay/:streamId/ws` is read-only and stream-scoped in the MVP design.

All public input is validated with Zod schemas from `packages/shared`.
