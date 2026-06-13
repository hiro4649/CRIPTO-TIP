# P0 Super Chat Support Received Vertical Slice

This is a local fixture vertical slice.

This does not use real YouTube API.

This does not use real OAuth token.

This does not use real DB.

This does not claim runtime readiness.

This does not claim production readiness.

This does not claim legal compliance.

This does not claim YouTube policy compliance.

Super Chat fixture is normalized into support.received.

support.received drives affinity, reaction request, overlay event, outbox, and admin list.

## Boundary

YouTube LIVE is the distribution surface. IRIS Web Companion is the crypto tip intake surface. IRIS Backend normalizes support inputs into support.received. IRIS Core handles AI reaction, TTS, Live2D/3D, affinity, and memory. OBS Browser Source renders tip effects.

The fixture does not replace YouTube Super Chat payment with a custom crypto payment. It does not represent IRIS Token Tip as YouTube Super Chat. It does not custody user assets, provide token sale, exchange, cash-out, internal balance, or investment claims.

## Flow

1. A local Super Chat fixture is posted to the internal fixture endpoint.
2. The fixture is sanitized and normalized into support.received with source youtube_super_chat.
3. Duplicate source_event_id values return the existing support event without applying side effects again.
4. Approved events apply affinity once.
5. Approved events enqueue one reaction request and one overlay event.
6. Approved events enqueue outbox jobs for reaction and overlay delivery.
7. The admin tips list exposes the stored support event.
8. Moderation hold stores support.received for review but does not enqueue reaction or overlay side effects.
