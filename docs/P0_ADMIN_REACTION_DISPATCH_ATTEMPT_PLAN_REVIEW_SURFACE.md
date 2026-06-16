# P0 Admin Reaction Dispatch Attempt Plan Review Surface

This change adds a local/internal admin review surface for reaction dispatch attempt plan metadata created after an active internal lease.

It is read-only visibility before any adapter boundary. It does not dispatch runtime work, create a dry-run adapter request, call IRIS Core, call VOXWEAVE, execute AI reaction, call real TTS, call real Live2D, call a renderer, call OBS, or perform WebSocket delivery.

The admin endpoints expose safe plan metadata only:

- `GET /admin/reaction-dispatch/attempt-plans`
- `GET /admin/reaction-dispatch/attempt-plans/:planId`

The list endpoint supports safe filters for support event, outbox, lease, stream, character, plan status, outbox status, lease status, adapter kind, created range, limit, and offset. The detail endpoint returns the same safe projection for one plan.

The response includes plan identifiers, linked internal outbox and lease state, safe reason codes, safe hashes, validation status, and compact safe summaries. It excludes raw messages, raw payloads, wallet addresses, authorization values, secrets, private URLs, stdout, stderr, jobs or logs URLs, adapter URLs, webhook URLs, full prompts, LLM output, TTS text, audio URLs, and renderer URLs.

This does not mutate support events, candidates, boundaries, outbox records, leases, approvals, or attempt plans. It does not execute reaction, overlay, external outbox delivery, IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, or WebSocket delivery. It does not increment `dispatch_attempt_count`; `external_delivery_status` remains `not_attempted`; `adapter_execution_status` remains `not_executed`.

This is not production Admin Console readiness. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
