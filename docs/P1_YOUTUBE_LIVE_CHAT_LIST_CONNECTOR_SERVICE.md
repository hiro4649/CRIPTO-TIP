# P1 YouTube Live Chat List Connector Service

This adds a bounded, network-disabled list connector service for fake transport execution.

The service depends on injected interfaces only: a list transport and a cursor gateway. It does not import the Fastify server, does not self-call HTTP endpoints, does not use global fetch, does not start timers, and does not sleep.

The service observes a cursor, plans a fake list poll, calls the injected fake transport, ingests the safe page projection through the cursor gateway, re-observes cursor state through the ingest result, and stops at completion, cycle cap, safe backoff, blocker, cursor missing, or ingest failure.

Result metadata is safe and bounded. It reports counts, statuses, safe reason codes, and optional safe failure capsules only. It does not return raw pages, raw comments, display names, credentials, Authorization headers, wallet data, private URLs, endpoint URLs, or query values.

This PR does not enable a real YouTube connector, real OAuth, real network execution, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
