# Chain Listener

PR scope: production Chain Listener boundary for TipRouterV1 logs, confirmation windows, reorg status transitions, block cursor persistence, and durable outbox handoff.

## Boundaries

YouTube LIVE remains the broadcast surface. IRIS Web Companion remains the external crypto Tip surface. The listener only observes TipRouterV1 `TipSent` logs and writes durable transaction state. It does not replace YouTube Super Chat, sell tokens, exchange tokens, cash out tokens, custody user assets, keep internal crypto balances, or call production IRIS Core delivery.

## Event Flow

1. WebSocket subscription receives new `TipSent` logs.
2. `eth_getLogs` catch-up scans from the persisted `chain_cursors.last_scanned_block`.
3. Each log is decoded with the TipRouterV1 event ABI.
4. `tip_transactions` is inserted idempotently by `chain_id + contract_address + tx_hash + log_index`.
5. New detections enqueue `chain.tip.detected`.
6. Pending transactions wait for `confirmationBlocks`.
7. Confirmed transactions enqueue `support.normalize` exactly once by idempotency key.
8. Reorged logs or block hash mismatches move transactions to `reorged` and do not enqueue `support.normalize`.

## Cursor And Reorg Model

`migrations/0002_chain_listener_reorg.sql` adds `chain_cursors` with `chain_id`, `contract_address`, `last_scanned_block`, `last_finalized_block`, and `last_seen_block_hash`. The listener updates this cursor after catch-up scans.

The confirmation path checks the canonical block hash for each pending transaction. If the stored transaction block hash differs from the canonical hash, the transaction is marked `reorged`, confirmations reset to zero, and downstream support normalization is withheld.

## Adapter Model

`EvmRpcProvider` is an injected interface. Tests use `MockEvmRpcProvider`. Production RPC endpoint configuration and secret management are intentionally deferred to the deployment wiring PR. The listener code does not embed production RPC URLs or secrets.

## Personal Data Boundary

TipRouterV1 logs carry addresses, bytes32 stream and character identifiers, amount, message hash, client tip id, token, and timestamp. They do not carry display names, comment text, YouTube names, YouTube IDs, or wallet labels. Tests assert decoded log payloads do not include user personal text fields.
