# P0 Event Pipeline DLQ Retry Boundary

This is local/internal failure-boundary hardening.

This does not use real YouTube API.

This does not use real OAuth token.

This does not use real DB.

This does not add Redis, Kafka, DB driver, package, or lockfile changes.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.

DLQ stores safe metadata only, not raw secrets or raw external payloads.

## Boundary

The P0 support.received pipeline now records local safe DLQ metadata when a downstream side-effect enqueue fails. The DLQ payload contains event id, source, source event id, stream id, character id, and a safe reason code.

Affinity failure is fail-closed. If affinity application fails, the pipeline stores the support.received event, records a safe DLQ entry, and does not emit reaction, overlay, or outbox side effects.

Reaction and overlay enqueue failures create safe DLQ entries for their failed side effect. Duplicate retry input remains idempotent because support.received is still keyed by source and source_event_id.

This PR does not replace YouTube Super Chat payment with custom crypto. It does not represent IRIS Token Tip as YouTube Super Chat. IRIS does not custody user assets and does not provide token sale, exchange, cash-out, internal balance, or investment claims.
