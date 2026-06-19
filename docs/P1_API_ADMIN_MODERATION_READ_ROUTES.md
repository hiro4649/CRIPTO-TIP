# P1 API Admin Moderation Read Routes

This note records the read-only Admin moderation route extraction.

## Scope

- `GET /admin/moderation/held-support`
- `GET /admin/moderation/summary`

The routes are registered through `registerAdminModerationReadRoutes`.
`server.ts` remains the composition root and injects the repository, admin auth
checker, safe held-support mapper, and moderation summary builder.

## Safety Boundaries

This change does not add runtime behavior. It does not add a DB driver, package
dependency, real DB connection, migration, real YouTube API call, OAuth flow,
wallet/RPC path, deployment path, or readiness/compliance claim.

The route module does not read environment variables, tokens, secrets, global
repository state, or network transports.

## Verification

Focused coverage is in `apps/api/src/p1-api-admin-moderation-read-routes.test.ts`.
Existing behavior coverage remains in
`apps/api/src/p0-admin-moderation-hold-review-controls.test.ts` and
`apps/api/src/p0-admin-moderation-queue-summary.test.ts`.
