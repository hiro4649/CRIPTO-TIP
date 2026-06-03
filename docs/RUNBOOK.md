# Runbook

## Chain Listener Recovery

If RPC WebSocket disconnects, keep the listener process alive and run `eth_getLogs` catch-up from `chain_cursors.last_scanned_block + 1` after reconnect. Duplicate logs are safe because `tip_transactions` is unique by `chain_id + contract_address + tx_hash + log_index`.

If a reorg is detected by removed logs or block hash mismatch, the transaction must move to `reorged` or return to pending confirmation before downstream normalization. `support.normalize` must only be enqueued for confirmed transactions.

If cursor state appears stale, inspect `chain_cursors` for the target `chain_id` and `contract_address`, compare with the latest finalized block, and run a bounded catch-up window. Do not skip confirmation checks.

Local:

```bash
corepack enable || true
pnpm install
pnpm dev:api
pnpm dev:web
pnpm dev:overlay
```

Failure behavior:

- YouTube API outage pauses YouTube-derived support but token Tip mock flow can continue.
- RPC outage shows delayed confirmation and resumes from block cursor.
- IRIS Core outage queues `support.received`.
- Overlay outage is resendable and does not stop AI reaction.
- Moderation outage routes new Tips to hold.
- Contract pause disables Tip form.

Queue and DLQ are documented for production; MVP uses in-memory maps.

## Outbox and DLQ

The preferred MVP queue is a DB-backed outbox:

1. Producers insert `outbox_events` with a unique `idempotency_key`.
2. Workers claim pending rows by setting `locked_at` and `locked_by`.
3. Handlers deliver at least once. Consumers must be idempotent.
4. Failures increment `retry_count`, set `last_error`, and schedule `next_attempt_at` with backoff.
5. Jobs move to `dead_letter_events` after `max_retry_count`.
6. Admin retry creates or requeues a `dead_letter.retry` job and writes `audit_logs`.

Stale lock reclamation:

1. Configure `OUTBOX_STALE_LOCK_MS` for the maximum expected handler runtime.
2. A worker calls `reclaimStaleOutboxLocks` before normal claim loops, using `now - OUTBOX_STALE_LOCK_MS` as the stale threshold.
3. Only `processing` jobs with `locked_at` older than the threshold are moved back to `pending`.
4. Active locks are preserved.
5. Reclaimed jobs remain at-least-once; consumers must stay idempotent.

DLQ retry:

1. Inspect `dead_letter_events.last_error` and the original `outbox_events` row.
2. Call `POST /admin/dead-letter/:deadLetterId/retry` with the admin Bearer token.
3. The endpoint requeues the original outbox job as `pending`, resets `retry_count` to `0`, and writes `audit_logs` with `action = retry_dead_letter`.
4. Requeued jobs are delivered at least once by the normal worker path.
5. Do not retry jobs that would call production IRIS, YouTube, or chain adapters until those adapters have idempotent delivery evidence.

Local live PostgreSQL test:

```bash
docker compose up -d postgres
RUN_LIVE_POSTGRES_TESTS=true DATABASE_URL="${DATABASE_URL}" pnpm test apps/api/src/repositories/postgres.test.ts
```

The current local Codex environment does not have Docker CLI available. GitHub CI runs the live Postgres integration test with a Postgres service.

Raw messages and raw display names are access-restricted operational data. Sanitized values are used for overlay and IRIS-facing events. Raw message retention should be limited to moderation review windows, with deletion or anonymization after the documented retention period.

## IRIS Delivery Failure

IRIS Core delivery uses `iris.deliver` outbox jobs and idempotency keys. If IRIS Core is unavailable:

1. Inspect `outbox_events` for `job_type = 'iris.deliver'`.
2. Timeout and 5xx failures should remain retryable with increasing `retry_count` and future `next_attempt_at`.
3. 401 and 403 indicate credential or authorization failure and move to DLQ immediately, independent of `max_retry_count`. Rotate `IRIS_CORE_SHARED_SECRET`, verify `IRIS_CORE_API_URL`, then use the admin DLQ retry endpoint after the credential boundary is fixed.
4. Do not dump request bodies or shared secrets into logs.
5. Verify that retry does not send wallet addresses, raw messages, or secrets to IRIS Core.

Credential rotation:

1. Provision the new IRIS Core shared secret outside git.
2. Update runtime secret storage.
3. Restart only the IRIS delivery worker.
4. Confirm a test `iris.deliver` job succeeds.
5. Retry DLQ jobs through the authenticated admin endpoint.

## YouTube Connector

YouTube connector failures:

1. Confirm `YOUTUBE_CONNECTOR_MODE=official` only in an environment with managed YouTube credentials.
2. For quota exceeded responses, reduce polling pressure and follow the `pollingIntervalMillis` returned by the official API.
3. If `liveChatMessages.streamList` is unavailable, the connector falls back to `liveChatMessages.list`.
4. If verification codes fail, confirm the code matches `IRIS-XXXXXX`, is for the same stream, is unexpired, and has not been consumed.
5. Do not use scraping, HTML parsing, browser automation, or user-provided URLs for YouTube chat ingestion.
