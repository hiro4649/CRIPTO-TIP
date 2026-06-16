# P0 Reaction Dispatch Approved Candidate Outbox Boundary

This change adds a local/internal outbox boundary record for reaction dispatch candidates that are already `approved_for_dispatch`.

This is not an outbox enqueue operation. It does not call `enqueueOutbox`, does not create runtime delivery jobs, and does not execute an external adapter.

## Endpoints

- `POST /admin/reaction-dispatch/candidates/:candidateId/outbox-boundary`
- `GET /admin/reaction-dispatch/candidates/:candidateId/outbox-boundary`

All endpoints require admin bearer auth. Unknown candidates return `404`.

## Boundary Behavior

Only candidates with existing `approved_for_dispatch` approval metadata can create a `boundary_ready` record.

The boundary record is idempotent by candidate id, approval status, safe context hash, and constraints hash. A duplicate request returns the existing boundary metadata and does not write duplicate audit metadata.

Unapproved, unsafe, invalid, blocked, or superseded candidates are fail-closed with safe metadata.

## Safety Boundary

This is local/internal approved-candidate outbox boundary metadata only.

This does not enqueue reaction. This does not enqueue overlay. This does not enqueue outbox. This does not call IRIS Core. This does not call VOXWEAVE. This does not execute AI reaction. This does not call real TTS. This does not call real Live2D. This does not call real renderer. This does not call real OBS. This does not perform real WebSocket delivery.

This does not mutate support events. This does not expose raw messages, raw payloads, wallet addresses, authorization values, secrets, private URLs, stdout, stderr, jobs URLs, logs URLs, full prompts, LLM output, or model-generated TTS text.

This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Next Step

A future PR may convert `boundary_ready` into an internal outbox enqueue record. That future work must remain separate and must still avoid external adapter execution unless explicitly authorized.
