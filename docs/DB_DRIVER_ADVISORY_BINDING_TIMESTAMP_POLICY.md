# DB Driver Advisory Binding Timestamp Policy

Future advisory source binding timestamps must use ISO UTC seconds.

Rules:

- `source_checked_at` must be ISO UTC.
- `source_checked_at` must not be in the future.
- `source_expires_at` must be ISO UTC.
- `source_expires_at` must be after `source_checked_at`.
- `source_expires_at` must be within the configured freshness window.
- Expired source evidence cannot authorize dependency work.

Current committed evidence has null source timestamps because no advisory
source has been reviewed in this PR.
For future source evidence, the freshness window is category-specific. The
current staleness policy sets 7-day windows for advisory summaries and audit
summaries, 14 days for npm registry metadata summaries, and 30 days for
maintainer release notes summaries.
