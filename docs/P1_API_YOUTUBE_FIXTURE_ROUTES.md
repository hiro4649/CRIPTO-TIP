# P1 API YouTube Fixture Routes

This refactor moves internal YouTube fixture routes from `server.ts` into `apps/api/src/routes/youtube-fixture-routes.ts`.

## Route Scope

- `POST /internal/fixtures/youtube-superchat/normalize`
- `POST /internal/fixtures/youtube-superchat/ingest`
- `POST /internal/fixtures/youtube-live-chat/cursors`
- `GET /internal/fixtures/youtube-live-chat/cursors/:cursorId`
- `POST /internal/fixtures/youtube-live-chat/cursors/:cursorId/failure-state`
- `DELETE /internal/fixtures/youtube-live-chat/cursors/:cursorId/failure-state`
- `POST /internal/fixtures/youtube-live-chat/cursors/:cursorId/pages`
- `POST /internal/fixtures/youtube-live-chat/cursors/:cursorId/pages/ingest`

## Dependency Boundary

The route module receives dependencies from `server.ts`: repository, internal auth checker, clock, reaction preview callback, and support apply callback. It does not read `process.env`, import the server singleton, create a repository, call global fetch, or access secrets.

## Compatibility

`server.ts` remains the composition root. Route paths, methods, auth behavior, status codes, response fields, idempotency behavior, cursor mutation behavior, support side effects, and failure-state behavior are intended to remain unchanged.

## Non-goals

No real YouTube API call, OAuth execution, network execution, real DB connection, package change, lockfile change, runtime readiness claim, production readiness claim, legal compliance claim, or YouTube policy compliance claim is introduced.
