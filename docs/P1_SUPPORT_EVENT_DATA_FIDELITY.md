# P1 Support Event Data Fidelity

This change preserves safe support event metadata when YouTube support inputs are normalized into `support.received` and prepared for repository persistence.

It does not call real YouTube, OAuth, RPC, wallet, IRIS Core, TTS, Live2D, OBS, or a real DB. It does not add a dependency, change package files, change contracts, or claim runtime, production, legal, or YouTube policy readiness.

## Fidelity Rules

- YouTube Super Chat and Super Sticker support events keep the input currency as `support.currency_or_token`.
- Token tip normalization and repository persistence do not invent token metadata when the input does not provide a safe token symbol.
- Postgres repository persistence writes `support.currency_or_token` to `support_events.currency_or_token` when present.
- Postgres repository persistence preserves `previous_affinity`, `new_affinity`, `relationship_level`, and reaction policy fields needed to reconstruct `support.received`.
- The repository uses `null` for missing currency metadata instead of substituting the support source.

## Migration Boundary

Migration `0006_support_event_data_fidelity_columns.sql` adds support event data-fidelity columns and backfills existing rows with the previous derived behavior. It does not drop tables, truncate data, or execute against a live database in local verification.

## Verification Focus

Tests cover Super Chat currency metadata, Super Sticker currency metadata, token-tip no-guess behavior, Postgres insert parameters, Postgres row round-trip reconstruction, and migration shape without a live DB connection.
