# P0 YouTube Live Chat Fixture Cursor Boundary

This adds a local cursor boundary for YouTube Live Chat page fixtures.

It tracks safe fixture cursor metadata for page replay, out-of-order page rejection, duplicate message handling, and caught-up fixture state. It does not call YouTube, use OAuth, poll, sleep, make network calls, or scrape YouTube.

## Scope

- Creates cursors idempotently by stream and live chat identity.
- Ingests local page fixtures only when the expected page token matches.
- Treats first page as an initial null-token page.
- Replays the same page idempotently.
- Rejects wrong or out-of-order page tokens.
- Deduplicates repeated messages across pages.
- Does not advance the cursor when page root validation fails.
- Stores safe metadata and safe page fingerprints only.

## Safety Boundary

Page fingerprints include cursor ID, input page token, next page token, and sorted message IDs only.

They do not include raw comments, raw display names, raw payloads, secrets, headers, OAuth material, or API keys.

This is not a runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim.
