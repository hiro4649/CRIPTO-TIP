# P0 Reaction Dispatch Simulation Failure DLQ

This adds a local failure DLQ boundary for local adapter simulation results.

It records retryable and terminal simulation failures as safe metadata. It does not retry, execute adapters, or deliver externally.

## Scope

- Adds a DLQ creation endpoint for failed simulation results.
- Adds read-only list and detail endpoints for simulation failure DLQ entries.
- Allows `simulated_retryable_failure` and `simulated_terminal_failure`.
- Blocks `simulated_success`.
- Marks retryable failures as `retry_candidate`.
- Marks terminal failures as `not_retryable`.
- Keeps duplicate DLQ creation idempotent.

## Safety Boundary

- This does not perform retry execution.
- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not call TTS, Live2D, renderer, OBS, or WebSocket delivery.
- This does not execute adapters.
- This does not dispatch external outbox events.
- This does not store raw payloads, raw messages, secrets, private URLs, adapter URLs, webhook URLs, headers, tokens, prompts, LLM output, TTS text, audio bytes, renderer output, or raw lease tokens.
- This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
