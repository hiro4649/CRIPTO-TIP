# P0 YouTube Super Chat Support Received Local E2E

This connects the local YouTube Super Chat fixture normalizer to the existing `support.received` ingestion and internal reaction dispatch lifecycle.

It uses local app injection only. It does not call YouTube, OAuth, network, RPC, IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, or WebSocket delivery.

## Covered Paths

- Approved fixture persists one `support.received` event.
- Duplicate fixture returns the same source event without duplicate downstream side effects.
- Held fixture persists as moderation hold and blocks reaction dispatch candidate progression.
- Approved fixture reaches local simulated success.
- Retryable failure fixture reaches simulation DLQ as retry candidate.
- Terminal failure fixture reaches simulation DLQ as not retryable.
- Internal outbox dispatch attempt count remains zero.
- External delivery remains `not_attempted`.
- Adapter execution remains `not_executed`.

## Boundary

This is not a runtime readiness claim, production readiness claim, legal compliance claim, or YouTube policy compliance claim.
