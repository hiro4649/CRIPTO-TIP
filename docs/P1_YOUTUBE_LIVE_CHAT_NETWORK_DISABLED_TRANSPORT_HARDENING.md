# P1 YouTube Live Chat Network-Disabled Transport Hardening

This hardens the fake-fetch direct REST list transport path before any real network connector work.

The transport remains network-disabled. It uses an injected fake fetch in tests, never global fetch, and releases acquired credential handles after success, HTTP failures, redirects, content-type failures, oversized responses, invalid JSON, safe page projection failures, and injected fetch exceptions.

The planner, config contract, and kill-switch language now distinguish `fake_transport` from future `controlled_network_canary` planning. `fake_transport` requires an armed fake-transport kill switch and `network_authorized: false`. Controlled network canary remains out of scope here.

The response boundary projects only safe list-page fields: `items`, `nextPageToken`, and `pollingIntervalMillis`. Root metadata such as `kind` and `etag` is ignored. Raw response bodies, raw credentials, Authorization headers, and secret values are not returned or stored.

This is not runtime readiness, production readiness, legal compliance, or YouTube policy compliance. It does not add a DB driver dependency, Google SDK, package change, lockfile change, real OAuth, real YouTube API call, real network call, migration, deployment, owner approval, GitHub approval review, or merge authority.
