# P0 Reaction Dispatch Internal Outbox Attempt Planning

This change adds local/internal attempt planning metadata for leased reaction dispatch internal outbox records.

The plan records only safe metadata: `attempt_plan_status`, `plan_id`, `lease_id`, `planned_adapter_type`, `planned_action`, `plan_context_hash`, timestamps, and safe reason codes.

Planning requires:
- admin authentication
- an existing `queued_internal` outbox record
- an active unexpired lease
- a matching `lease_id`
- `external_delivery_status` equal to `not_attempted`
- `adapter_execution_status` equal to `not_executed`
- `dispatch_attempt_count` equal to `0`

This does not execute the plan. It does not dispatch runtime work, call IRIS Core, call VOXWEAVE, execute an AI reaction, call real TTS, call real Live2D, call a renderer, call OBS, or perform WebSocket delivery.

This does not mutate support events, execute reactions, execute overlays, externally deliver outbox records, increment `dispatch_attempt_count`, change `external_delivery_status`, or change `adapter_execution_status`.

Responses and audit metadata exclude raw messages, raw payloads, wallet addresses, secrets, private URLs, adapter URLs, webhook URLs, raw logs, job URLs, and log URLs.

This does not create production Admin Console readiness. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
