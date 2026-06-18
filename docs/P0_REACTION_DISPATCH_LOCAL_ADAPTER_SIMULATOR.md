# P0 Reaction Dispatch Local Adapter Simulator

This adds a local-only simulator for an approved adapter execution boundary preview.

The simulator records deterministic local simulation results for success, retryable failure, and terminal failure cases. It does not execute a real adapter.

## Scope

- Adds an admin simulation endpoint for approved adapter execution boundary previews.
- Adds a read endpoint for stored local simulation results.
- Requires an `approved_for_local_simulation` approval.
- Requires the approval snapshot, preview, lease, outbox, candidate, boundary, and adapter kind to remain current and safe.
- Stores safe simulation metadata keyed by the approval snapshot and simulation case.
- Keeps duplicate simulation requests idempotent.

## Safety Boundary

- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not call TTS, Live2D, renderer, OBS, or WebSocket delivery.
- This does not execute adapters.
- This does not dispatch external outbox events.
- This does not increment dispatch attempts.
- This does not mutate support events, outbox delivery state, leases, attempt plans, dry-run boundaries, or real adapter status.
- This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Safe Metadata

Simulation results include IDs, statuses, hashes, simulation case, attempt count, and reason codes only.

They exclude raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, adapter URLs, webhook URLs, headers, tokens, prompts, LLM output, TTS text, audio bytes, renderer output, and raw lease tokens.
