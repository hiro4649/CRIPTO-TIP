# P1 YouTube Fixture Cursor Operations

This refactor extracts internal YouTube Live Chat fixture cursor operations from `server.ts` into a focused operations module.

## Scope

- Cursor identity creation and idempotent create-or-get lookup.
- Cursor lookup by cursor id.
- Safe connector failure-state set and clear transitions.
- Safe page message id extraction without raw payloads or unknown placeholders.
- Safe page fingerprint generation from bounded metadata.
- Page-token ordering guard.
- Page replay and successful page result lookup.
- Cursor page-advance mutation in one helper.

## Non-goals

- No product runtime readiness claim.
- No production readiness claim.
- No legal compliance claim.
- No YouTube policy compliance claim.
- No real YouTube API call.
- No OAuth execution.
- No real DB connection.
- No package or lockfile change.

## Compatibility

The HTTP routes remain in `server.ts`. The route layer keeps auth, request parsing, parser invocation, support side-effect application, and response assembly. Cursor state mutation is delegated to `youtube-live-chat-fixture-cursor-operations.ts` to reduce future drift as the P1 YouTube connector surface grows.

## Safety Boundary

The operations module only handles in-memory fixture cursor state. It does not read secrets, call network APIs, perform OAuth, add dependencies, change persistence, or create production readiness evidence.
