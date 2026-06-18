# P0 Admin Adapter Execution Boundary Approval Gate

This is a local/internal approval gate for adapter execution boundary preview snapshots.

It approves a current preview snapshot only for local simulation. It does not approve real adapter execution.

## Scope

- Adds admin approve, reject, and approval status endpoints for adapter execution boundary previews.
- Binds approval to the deterministic preview id and request hashes.
- Requires the current lease, outbox, candidate, boundary, and preview state to remain safe.
- Allows only `iris_core_reaction`, `voxweave_voice`, and `overlay_effect` for local simulation.
- Fails closed for `future_internal_adapter`.

## Safety Boundary

- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not call TTS, Live2D, renderer, OBS, or WebSocket delivery.
- This does not execute adapters.
- This does not dispatch external outbox events.
- This does not increment dispatch attempts.
- This does not mutate support events, outbox delivery state, leases, attempt plans, or dry-run boundaries.
- This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Safe Metadata

Responses and audit entries include IDs, statuses, hashes, actor type, and reason codes only.

They exclude raw messages, raw payloads, wallet addresses, authorization strings, secrets, private URLs, adapter URLs, webhook URLs, headers, tokens, prompts, LLM output, TTS text, audio URLs, renderer URLs, and raw lease tokens.
