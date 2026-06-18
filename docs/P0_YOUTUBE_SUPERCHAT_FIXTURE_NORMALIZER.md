# P0 YouTube Super Chat Fixture Normalizer

This adds a local fixture normalizer only.

It normalizes a safe YouTube Super Chat-shaped fixture into `support.received` without persisting the event or triggering downstream side effects.

## Scope

- Accepts a strict local fixture shape.
- Requires internal bearer auth.
- Normalizes `live_chat_message_id` to `source_event_id`.
- Keeps `amount_micros` as a string.
- Validates currency, tier, and timestamp.
- Sanitizes display names.
- Applies existing message moderation conventions.
- Returns Contract v2 validation status.
- Returns deterministic idempotency identity for `youtube_super_chat + live_chat_message_id`.

## Boundaries

This does not call the YouTube API.
This does not use OAuth.
This does not scrape YouTube.
This does not replace YouTube Super Chat payment with an IRIS token.
This does not represent IRIS Token Tip as YouTube Super Chat.
This does not persist the event in this PR.
This does not trigger affinity, reaction, overlay, outbox, TTS, Live2D, OBS, or WebSocket work.
This does not use real DB.
This does not add a DB driver, Redis, or Kafka.
This does not claim runtime readiness.
This does not claim production readiness.
This does not claim legal compliance.
This does not claim YouTube policy compliance.
