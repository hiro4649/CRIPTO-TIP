# P0 Public Wallet Live Session Fail Closed

This change removes public mock success from surfaces that are not backed by a
configured fixture or verifier.

## Public Live Session

`GET /api/live/:streamId` now returns `live_session_not_found` for an unknown
stream. It does not create a live session, assign a default YouTube video,
assign a default channel, or select a default character.

Local and test fixtures are created through `POST /internal/fixtures/live-sessions`.
That route requires the internal token and is unavailable outside local or test
configuration.

## Public Tip Intent

`POST /api/live/:streamId/tip-intents` now requires an existing live session.
Unknown streams return `live_session_not_found` and do not create a tip intent or
update recent-tip counters.

`GET /api/tip-intents/:tipIntentId` now returns HTTP 404 with
`tip_intent_not_found` when the public tip intent does not exist.

## Wallet Verification

The default runtime does not include a fake wallet verifier. Public nonce and
verify routes return `wallet_verifier_not_configured` with HTTP 501 until a
verifier is explicitly injected.

Test injection supports one-time nonce verification. The nonce store keeps a
nonce hash and binding metadata, not the raw nonce. Replays, mismatched wallet,
mismatched domain, mismatched purpose, expired nonce, or unknown nonce do not
produce verified success.

## Boundaries

This is not real wallet verification. It does not call RPC, OAuth, YouTube,
secret manager, or a real database. It does not claim runtime, production, legal,
or YouTube policy readiness.
