# P0 YouTube Live Chat Page Fixture Parser

This adds a local YouTube Live Chat page fixture parser.

It extracts `superChatEvent` items from a local page-shaped fixture and reuses the local YouTube Super Chat fixture normalizer. It does not call the YouTube API, use OAuth, make network calls, poll, sleep, or scrape YouTube.

## Scope

- Parses local page metadata: page token, next page token, polling interval, and items.
- Normalizes `superChatEvent` items only.
- Skips unsupported item types without failing the whole page.
- Skips malformed super chat items with safe reason codes.
- Deduplicates repeated message IDs within a page.
- Returns safe skipped item metadata only.
- Returns page summary counts.

## Safety Boundary

`nextPageToken` is treated as `youtube_page_token` metadata, not authorization material.

The parser does not return raw page objects, raw comments for skipped items, raw display names for skipped items, headers, tokens, secrets, OAuth material, or API keys.

This is not a runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim.
