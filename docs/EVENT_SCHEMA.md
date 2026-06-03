# Event Schema

## Chain Listener Events

`chain.tip.detected` is enqueued after an idempotent TipRouterV1 `TipSent` log is recorded in `tip_transactions`.

`support.normalize` is enqueued only after the transaction reaches the configured confirmation window and has not been reorged.

On-chain log payloads contain address and hash identifiers only. They do not contain display names, comment text, YouTube names, YouTube IDs, wallet labels, or raw messages.

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

## IRIS Delivery Payloads

`iris.deliver` jobs wrap sanitized IRIS Core delivery DTOs:

- `support.received`
- `character.reaction.requested`
- `affinity.apply`
- `memory.write_candidate`

Each delivery uses `source_event_id` plus delivery type as the idempotency key. IRIS delivery payloads exclude wallet addresses, secrets, raw display names, raw messages, YouTube IDs, and wallet labels.
