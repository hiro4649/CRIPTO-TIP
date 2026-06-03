# Runbook

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

Stale lock reclamation is not implemented yet. The next worker hardening PR should reclaim jobs whose `locked_at` is older than the configured timeout while preserving active locks. The same PR should add an admin DLQ retry endpoint that writes an audit log.

Raw messages and raw display names are access-restricted operational data. Sanitized values are used for overlay and IRIS-facing events. Raw message retention should be limited to moderation review windows, with deletion or anonymization after the documented retention period.
