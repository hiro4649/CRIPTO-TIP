# P0 Admin Support Event Adjustment Controls

This is local/internal admin support event adjustment only.

It provides safe correction controls for an existing `support.received` event after creation. It allows sanitized display name correction, safe moderation status movement from hold to rejected, and tier correction without changing amount semantics.

This does not create refund, exchange, cash-out, custody, or balance features. It does not mutate amount, currency, wallet, source, or direct affinity fields. It does not create production Admin Console readiness.

This does not use real DB. It does not add Redis, Kafka, DB driver, package, or lockfile changes. It does not expose raw messages, raw payloads, or secrets. It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
