# P0 Reaction Dispatch Internal Outbox Lease

This change adds a local/internal lease boundary for queued reaction dispatch internal outbox records.

The lease is only a claim marker for future worker coordination. It does not dispatch runtime work, call IRIS Core, call VOXWEAVE, execute an AI reaction, call real TTS, call real Live2D, call a renderer, call OBS, or perform WebSocket delivery.

The outbox record remains `queued_internal`. Lease state is stored separately as safe metadata with `lease_status`, `lease_id`, `lease_expires_at`, `leased_by_actor_type`, timestamps, and safe reason codes.

Lease create is allowed only when:
- `outbox_status` is `queued_internal`
- `external_delivery_status` is `not_attempted`
- `adapter_execution_status` is `not_executed`
- `dispatch_attempt_count` is `0`

Cancelled, blocked, superseded, externally attempted, adapter-attempted, or non-zero dispatch-attempt records fail closed. An active unexpired lease blocks a second lease. An expired or released lease can be claimed again.

Extend and release require admin authentication plus the safe `lease_id`. No raw lease secret is created. The `lease_id` is a safe opaque metadata reference, not a bearer secret.

Responses and audit metadata exclude raw messages, raw payloads, wallet addresses, secrets, private URLs, adapter URLs, webhook URLs, raw logs, job URLs, and log URLs.

This change does not mutate support events. It does not execute reactions, execute overlays, externally deliver outbox records, increment `dispatch_attempt_count`, change `external_delivery_status`, or change `adapter_execution_status`.

This does not create production Admin Console readiness. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
