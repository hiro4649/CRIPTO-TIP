# P0 Reaction Dispatch Dry-Run Adapter Boundary

This change adds a local/internal dry-run adapter boundary preview for a reviewed reaction dispatch attempt plan.

It uses an active internal lease and an existing `planned_internal` attempt plan to build deterministic safe request preview metadata. It does not call an adapter, IRIS Core, VOXWEAVE, real TTS, Live2D, a renderer, OBS, or WebSocket delivery.

Endpoint:

- `POST /admin/reaction-dispatch/attempt-plans/:planId/dry-run-adapter-boundary`

The endpoint requires admin bearer auth and a matching `lease_id`. It returns safe metadata only: plan, outbox, lease, support event identifiers, adapter kind, dry-run status, safe hashes, validation status, and compact side-effect summaries.

It does not mutate support events, candidates, boundaries, outbox records, leases, approvals, or attempt plans. It does not increment `dispatch_attempt_count`; `external_delivery_status` remains `not_attempted`; `adapter_execution_status` remains `not_executed`.

The response excludes raw messages, raw payloads, wallet addresses, authorization values, secrets, private URLs, adapter URLs, webhook URLs, full prompts, LLM output, TTS text, audio URLs, renderer URLs, stdout, stderr, jobs URLs, and logs URLs.

This is not runtime adapter execution and not production readiness. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
