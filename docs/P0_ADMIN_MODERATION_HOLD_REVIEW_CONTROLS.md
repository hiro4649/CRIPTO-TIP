# P0 Admin Moderation Hold Review Controls

This change adds local/internal admin controls for support.received events that are held by message moderation.

The controls are API-only. They let an admin list held support events, approve a held event, or reject a held event. Approving a held event applies the same local side effects as an approved support.received event: affinity, reaction request, overlay event, and outbox enqueue. Rejecting a held event does not trigger affinity, reaction, overlay, or outbox side effects.

The endpoint responses use safe metadata only. Held-list responses do not expose raw payloads, secrets, raw authorization material, raw message payloads, stack output, stdout, stderr, jobs_url, or logs_url.

This is local/internal admin moderation hold review only. It does not create production Admin Console readiness. It does not use real DB. It does not add Redis, Kafka, DB driver, package, or lockfile changes. It does not expose raw payloads. It does not expose secrets. It does not claim runtime readiness. It does not claim production readiness. It does not claim legal compliance. It does not claim YouTube policy compliance.
