# P0 Admin Reaction Dispatch Dry-Run Approval Gate

This is a local/internal reaction dispatch dry-run approval gate only.

It lets an admin approve or reject safe dry-run adapter boundary metadata for future adapter execution. It does not execute approved dry-run requests and does not dispatch runtime work.

## Scope

- Adds admin-only approval status for dry-run boundary metadata.
- Supports `approved_for_adapter_execution` and `rejected_by_admin` as local/internal approval metadata.
- Re-checks the current safe dry-run boundary state before approval.
- Writes safe audit metadata only.
- Keeps approval and rejection idempotent where safe.
- Fail-closes unsafe transitions, including approving rejected metadata and rejecting already approved metadata.

## Safety Boundary

- This does not call IRIS Core.
- This does not call VOXWEAVE.
- This does not execute AI reaction.
- This does not call real TTS.
- This does not call real Live2D.
- This does not call real renderer.
- This does not call real OBS.
- This does not perform real WebSocket delivery.
- This does not mutate support events.
- This does not mutate outbox delivery state.
- This does not mutate leases.
- This does not mutate attempt plans.
- This does not execute reaction.
- This does not execute overlay.
- This does not externally deliver outbox.

## Safe Metadata

Responses and audit metadata include IDs, statuses, reason codes, timestamps, adapter kind, and counters only.

They do not expose raw messages, raw payloads, wallet addresses, secrets, private URLs, adapter URLs, webhook URLs, headers, or tokens.

## Readiness Boundary

This approval gate does not create production Admin Console readiness.

It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
