# P0 Admin Reaction Dispatch Dry-Run Review Surface

This change adds a local/internal admin review surface for reaction dispatch dry-run adapter boundary metadata.

It reviews deterministic dry-run boundary metadata before any approval or adapter execution. It does not approve dry-run requests, dispatch runtime work, call IRIS Core, call VOXWEAVE, execute AI reaction, call real TTS, call real Live2D, call a renderer, call OBS, or perform WebSocket delivery.

The admin endpoints expose safe dry-run metadata only:

- `GET /admin/reaction-dispatch/dry-run-boundaries`
- `GET /admin/reaction-dispatch/dry-run-boundaries/:dryRunBoundaryId`

The list endpoint supports safe filters for support event, outbox, lease, attempt plan, candidate, boundary, stream, character, adapter kind, dry-run status, plan status, outbox status, lease status, created range, limit, and offset.

The response includes identifiers, safe statuses, safe reason codes, safe hashes, validation status, and compact summaries. It excludes raw messages, raw payloads, wallet addresses, authorization values, secrets, private URLs, adapter URLs, webhook URLs, request bodies containing raw user text, auth material, full prompts, LLM output, TTS text, audio URLs, renderer URLs, stdout, stderr, jobs URLs, and logs URLs.

This does not mutate support events, candidates, boundaries, outbox records, leases, attempt plans, dry-run boundaries, or approvals. It does not execute reaction, overlay, external outbox delivery, IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, or WebSocket delivery. It does not increment `dispatch_attempt_count`; `external_delivery_status` remains `not_attempted`; `adapter_execution_status` remains `not_executed`.

This is not production Admin Console readiness. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
