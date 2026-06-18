# P0 Reaction Dispatch Adapter Execution Boundary Preview

This is a local/internal adapter execution boundary preview only.

It builds a safe request envelope preview from an approved dry-run boundary so a future adapter executor can consume a stable shape. It does not execute the adapter.

## Scope

- Requires an approved dry-run boundary.
- Re-checks current dry-run boundary safety before preview.
- Binds preview readiness to the approval-time dry-run snapshot hashes.
- Blocks stale approval snapshots when the current dry-run boundary, lease, outbox lifecycle, adapter kind, or request hashes drift.
- Returns deterministic safe envelope hashes and metadata.
- Keeps support events, outbox delivery state, leases, and attempt plans unchanged.

## Safety Boundary

- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not execute AI reaction.
- This does not call real TTS.
- This does not call real Live2D.
- This does not call real renderer.
- This does not call real OBS.
- This does not perform real WebSocket delivery.
- This does not execute adapter requests.
- This does not increment dispatch attempt count.
- This does not change external delivery status from `not_attempted`.
- This does not change adapter execution status from `not_executed`.
- This blocks expired or released leases.
- This blocks cancelled, blocked, superseded, already-attempted, externally delivered, or adapter-executed outbox state.
- This blocks unknown adapter kinds fail-closed.

## Safe Metadata

Responses include IDs, statuses, reason codes, hashes, and counters only.

They do not expose raw messages, raw payloads, wallet addresses, secrets, private URLs, adapter URLs, webhook URLs, headers, or tokens.

## Timestamp Semantics

`snapshot_at` is the approval snapshot update time.

`derived_from_approval_at` is the approval time used to derive the preview.

## Readiness Boundary

This preview does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
