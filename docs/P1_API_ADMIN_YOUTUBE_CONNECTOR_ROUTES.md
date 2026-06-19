# P1 API Admin YouTube Connector Routes

This refactor moves read-only Admin YouTube connector routes from `server.ts` into `apps/api/src/routes/admin-youtube-connector-routes.ts`.

## Route Scope

- `GET /admin/youtube-live-chat/connector-capability`
- `GET /admin/youtube-live-chat/real-connector-readiness`
- `GET /admin/youtube-live-chat/controlled-canary-preflight`
- `POST /admin/youtube-live-chat/controlled-canary-preflight/evaluate`

## Dependency Boundary

The route module receives an admin auth checker, capability provider, readiness evaluator, default controlled canary input provider, and controlled canary evaluator from `server.ts`. It does not read `process.env`, import the server singleton, create a repository, call global fetch, or access secrets.

## Safety

The extracted routes remain read-only. They do not enable network execution, OAuth, real YouTube API calls, real DB connections, deployment, release authority, owner approval, GitHub approval review, or merge authority.
