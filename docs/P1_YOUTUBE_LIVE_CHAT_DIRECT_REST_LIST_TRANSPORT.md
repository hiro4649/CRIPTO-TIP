# P1 YouTube Live Chat Direct REST List Transport

This adds a direct REST list transport that is compatible with built-in fetch but does not use global fetch and does not execute real network requests.

The transport requires an injected `fetch_fn`. Tests use fake fetch only. Blocked preflight states never call fetch. Armed fake mode verifies fixed method, official host identifier, fixed path, exact part value, maxResults bounds, manual redirect policy, JSON content type, response size, parser compatibility, and safe error classification.

No package, lockfile, Google SDK, real YouTube API, OAuth execution, secret access, runtime readiness, production readiness, legal compliance, or YouTube policy compliance authority is created.
