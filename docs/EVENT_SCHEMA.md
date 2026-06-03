# Event Schema

Shared Zod schemas live in `packages/shared`.

Events:

- `support.received`
- `support.rejected`
- `affinity.updated`
- `character.reaction.requested`
- `character.reaction.completed`
- `overlay.tip_alert`
- `youtube.chat.message.received`
- `youtube.viewer.verified`

All event producers must validate with schemas before enqueueing or calling IRIS adapters.

Durable schema:

- Chain logs are unique by `chain_id + contract_address + tx_hash + log_index`.
- Support events are unique by `source + source_event_id`.
- Affinity ledger is unique by `source_event_id + iris_user_id + character_id`.
- Overlay events are unique by `source_event_id + stream_id`.
- Reaction requests are unique by `source_event_id + character_id`.
- Outbox jobs are unique by `idempotency_key`.
