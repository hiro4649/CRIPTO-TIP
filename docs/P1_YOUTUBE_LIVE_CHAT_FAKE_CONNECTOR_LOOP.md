# P1 YouTube Live Chat Fake Connector Loop

This implements a local fake connector loop for fixture pages.

The loop reads pages from a fake fixture client and hands each page to an injected local ingest callback. It has hard caps of five cycles and two repeated same failures, never sleeps, never polls a network, never recurses indefinitely, and emits safe failure capsules without raw page or secret data.

This is not a real YouTube connector. It does not use OAuth, network calls, Google SDKs, real YouTube API execution, or external adapter execution.
