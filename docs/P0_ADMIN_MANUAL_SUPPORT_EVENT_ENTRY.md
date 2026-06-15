# P0 Admin Manual Support Event Entry

This is local/internal admin manual support entry only.

It adds a safe admin path for `admin_manual_support`, which is already part of the `support.received` source model. Manual support remains distinct from YouTube Super Chat, crypto token tips, and wallet/RPC activity.

Approved manual support enters the existing `support.received` side-effect path for affinity, reaction request, overlay event, and outbox enqueue. Held manual support enters the moderation path and does not trigger side effects. Rejected manual support does not trigger side effects.

This does not create production Admin Console readiness. It does not use real DB. It does not add Redis, Kafka, DB driver, package, or lockfile changes. It does not expose raw messages, raw payloads, or secrets. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
