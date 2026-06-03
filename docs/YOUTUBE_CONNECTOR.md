# YouTube Connector

The YouTube connector uses official YouTube Live API JSON responses only. It does not scrape YouTube pages, parse YouTube HTML, use browser automation, or replace YouTube Super Chat payment.

## Scope

- `liveChatMessages.streamList` adapter boundary.
- `liveChatMessages.list` fallback boundary.
- Super Chat normalization to `support.received` with source `youtube_super_chat`.
- Super Sticker normalization to `support.received` with source `youtube_super_sticker`.
- Regular chat normalization to `youtube.chat.message.received`.
- `IRIS-XXXXXX` verification code detection.

## Verification Codes

Verification codes are stream-scoped, one-time use, and expire after 10 minutes. A YouTube `authorChannelId` maps to an IRIS user id only after a valid code is consumed.

## Safety

Viewer names and messages are untrusted. The connector sanitizes display names, redacts wallet addresses, and sends Super Chat comments through moderation. It does not pass wallet addresses, raw names, raw messages, YouTube IDs, or secrets to AI prompts or memory candidates.

## Operations

Quota exceeded and server errors are retryable at the adapter boundary. If `streamList` is unavailable, the connector falls back to `list`. Production credentials are environment boundaries only; no real OAuth token or API key is committed.
