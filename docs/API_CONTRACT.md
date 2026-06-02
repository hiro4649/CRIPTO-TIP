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
