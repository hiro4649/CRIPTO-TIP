# P0 Super Chat Event Pipeline Hardening

This is still local/internal pipeline hardening.

This does not use real YouTube API.

This does not use real OAuth token.

This does not use real DB.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.

support.received processing is shared by fixture and internal event input.

## Boundary

The shared pipeline receives sanitized support.received events and applies the same downstream behavior for the local Super Chat fixture endpoint and direct internal event input.

The pipeline stores support.received idempotently by source and source_event_id, applies affinity once for approved events, enqueues reaction and overlay side effects once, and keeps moderation hold events out of reaction and overlay queues.

This PR does not replace YouTube Super Chat payment with custom crypto. It does not represent IRIS Token Tip as YouTube Super Chat. IRIS does not custody user assets and does not provide token sale, exchange, cash-out, internal balance, or investment claims.
