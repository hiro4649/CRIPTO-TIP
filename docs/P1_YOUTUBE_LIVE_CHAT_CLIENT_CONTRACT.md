# P1 YouTube Live Chat Client Contract

This defines the local TypeScript contract for a future YouTube Live Chat client and implements a fake fixture client only.

The fake client returns deterministic fixture pages and safe failures. It does not call YouTube, does not use OAuth, does not enable network, does not read secrets from the filesystem or environment, and does not add a Google SDK.

This does not claim connector readiness, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
