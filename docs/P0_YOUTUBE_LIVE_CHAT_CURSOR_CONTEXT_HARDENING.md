# P0 YouTube Live Chat Cursor Context Hardening

This document records the local fixture cursor context hardening for the YouTube Live Chat fixture path.

The cursor create contract now requires `character_id` and binds the cursor identity to `stream_id`, `youtube_video_id`, `live_chat_id`, and `character_id`. The same full tuple is idempotent, while a different video or character creates a separate cursor.

The page fixture parser context uses the cursor's stored `character_id`. It does not use a default character for the cursor path.

This is an internal fixture contract update only. It does not persist `support.received` from page fixtures, does not call YouTube, does not use OAuth, does not use network calls, and does not claim runtime, production, legal, or YouTube policy readiness.
