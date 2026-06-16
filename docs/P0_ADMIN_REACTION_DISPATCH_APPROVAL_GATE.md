# P0 Admin Reaction Dispatch Approval Gate

This change adds a local/internal admin approval gate for persisted safe reaction dispatch candidates.

The gate approves safe candidates for future dispatch. It does not dispatch reaction runtime work.

## Endpoints

- `POST /admin/reaction-dispatch/candidates/:candidateId/approve`
- `POST /admin/reaction-dispatch/candidates/:candidateId/reject`
- `GET /admin/reaction-dispatch/candidates/:candidateId/approval`

All endpoints require admin bearer auth. Unknown candidates return `404`.

## Approval Behavior

Only `candidate_ready` can become `approved_for_dispatch`.

Approval re-validates the candidate against Support Event Contract v2 by rebuilding the safe candidate metadata from the current support event and comparing safe context, constraints, persona version, and validation status.

Approval is idempotent. A second approve returns the existing approval metadata and does not write duplicate audit metadata.

## Rejection Behavior

`candidate_ready` can become `rejected_by_admin`.

Reject is idempotent. A second reject returns the existing rejection metadata and does not write duplicate audit metadata.

Reverting `approved_for_dispatch` to rejected is fail-closed in this PR. The gate blocks that transition with safe metadata because this PR does not implement dispatch lifecycle compensation.

## Safety Boundary

This is local/internal admin reaction dispatch approval gate only.

This does not call IRIS Core. This does not call VOXWEAVE. This does not execute AI reaction. This does not call real TTS. This does not call real Live2D. This does not call real renderer. This does not call real OBS. This does not perform real WebSocket delivery.

This does not mutate support events. This does not enqueue reaction. This does not enqueue overlay. This does not enqueue outbox.

This does not expose raw messages, raw payloads, wallet addresses, secrets, private URLs, stdout, stderr, jobs URLs, logs URLs, full prompts, LLM output, or model-generated TTS text.

This does not create production Admin Console readiness. This does not claim runtime readiness. This does not claim production readiness. This does not claim legal compliance. This does not claim YouTube policy compliance.

## Next Step

The next P0 boundary can add an approved-candidate outbox boundary record. That future work must still avoid external adapter execution unless separately authorized.
