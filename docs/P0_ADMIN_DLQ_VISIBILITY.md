# P0 Admin DLQ Visibility

This is local/internal admin DLQ visibility only.

This adds an admin bearer protected API for reading DLQ safe summaries created by the P0 event pipeline DLQ/retry boundary.

It does not create production Admin Console readiness.

It does not use a real DB.

It does not add Redis, Kafka, DB driver, package, or lockfile changes.

It does not expose raw payloads.

It does not expose secrets.

It does not claim runtime readiness.

It does not claim production readiness.

It does not claim legal compliance.

It does not claim YouTube policy compliance.

## Endpoint

`GET /admin/live-sessions/:streamId/dlq`

The endpoint requires the existing admin bearer token.

The response returns allowlisted DLQ metadata only:

```json
{
  "id": "dlq_xxx",
  "event_id": "evt_xxx",
  "source": "youtube_super_chat",
  "source_event_id": "yt_sc_xxx",
  "stream_id": "str_xxx",
  "character_id": "char_mio",
  "reason_code": "reaction_enqueue_failed",
  "retry_status": "candidate",
  "created_at": "2026-..."
}
```

## Excluded Fields

- `payload_json`
- `raw_payload`
- `raw_youtube_payload`
- `raw_external_payload`
- `oauth_token`
- `refresh_token`
- `access_token`
- `database_url`
- `connection_string`
- `wallet_private_key`
- `private_url`
- `stack`
- `stack_trace`
- `stdout`
- `stderr`
- `logs_url`
- `jobs_url`

## Residual Risks

This is an in-memory/local admin visibility step. Durable production admin visibility remains future scoped work.
