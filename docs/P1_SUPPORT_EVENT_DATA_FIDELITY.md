# P1 Support Event Data Fidelity

This change preserves safe currency metadata when YouTube support inputs are normalized into `support.received` and prepared for repository persistence.

It does not call real YouTube, OAuth, RPC, wallet, IRIS Core, TTS, Live2D, OBS, or a real DB. It does not add a dependency, change package files, change migrations, change contracts, or claim runtime, production, legal, or YouTube policy readiness.

## Fidelity Rules

- YouTube Super Chat and Super Sticker support events keep the input currency as `support.currency_or_token`.
- Token tip normalization does not invent token metadata when the input does not provide a safe token symbol.
- Postgres repository persistence writes `support.currency_or_token` to `support_events.currency_or_token` when present.
- The repository keeps the existing fallback only when currency metadata is absent.

## Verification Focus

Tests cover Super Chat currency metadata, Super Sticker currency metadata, token-tip no-guess behavior, and Postgres insert parameters without a live DB connection.
