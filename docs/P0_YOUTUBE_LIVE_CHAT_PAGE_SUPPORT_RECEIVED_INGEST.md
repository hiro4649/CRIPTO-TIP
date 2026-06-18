# P0 YouTube Live Chat Page Support Received Ingest

This adds an explicit local fixture ingest route that bridges accepted YouTube Live Chat page fixture Super Chat events into the existing `support.received` local ingestion path.

The existing parse-only page route remains mutation-free. Only `POST /internal/fixtures/youtube-live-chat/cursors/:cursorId/pages/ingest` applies normalized Super Chat events to `support.received`.

The route keeps cursor token guards, page replay idempotency, cross-page duplicate handling, Contract v2 preview validation before apply, and safe result projection. Held messages are persisted with moderation hold and do not create reaction or outbox work.

This does not call YouTube, use OAuth, perform network calls, scrape YouTube, add a Google SDK, add a DB driver, change migrations, or claim runtime, production, legal, or YouTube policy readiness.
