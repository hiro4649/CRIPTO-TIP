# P0 Admin Reaction Dispatch Simulation Review Surface

This adds a read-only admin review surface for local adapter simulation results.

It helps operators inspect local simulation outcomes without executing adapters or changing runtime delivery state.

## Scope

- Adds a list endpoint for local adapter simulation results.
- Keeps the existing simulation result detail endpoint read-only.
- Supports filters by support event, preview, dry-run boundary, plan, outbox, lease, adapter kind, simulation case, simulation status, and created time.
- Supports bounded pagination with `limit` and `offset`.
- Returns a summary count by simulation status.

## Safety Boundary

- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not call TTS, Live2D, renderer, OBS, or WebSocket delivery.
- This does not execute adapters.
- This does not dispatch external outbox events.
- This does not mutate support events, outbox delivery state, leases, attempt plans, or simulation results.
- This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Safe Projection

The review surface returns stored safe simulation metadata only.

It excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, adapter URLs, webhook URLs, headers, tokens, prompts, LLM output, TTS text, audio bytes, renderer output, and raw lease tokens.
