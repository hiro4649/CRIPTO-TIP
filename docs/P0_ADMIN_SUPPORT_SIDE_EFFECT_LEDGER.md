# P0 Admin Support Side-Effect Ledger

This change adds local/internal read-only admin visibility for support event side effects.

The endpoint is `GET /admin/support-events/:eventId/side-effects`.

It returns safe metadata only: support identifiers, whether affinity/reaction/overlay/outbox side effects exist, resend candidate counts, and audit action counts. It does not mutate support events, trigger side effects, call real TTS, Live2D, renderer, OBS, WebSocket delivery, or use real DB/YouTube/OAuth/RPC.

This does not create production Admin Console readiness, runtime readiness, legal compliance, or YouTube policy compliance. It does not expose raw messages, raw payloads, secrets, stack output, stdout, stderr, jobs_url, or logs_url.
