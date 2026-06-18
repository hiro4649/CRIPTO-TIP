# P1 YouTube Live Chat Real Connector Config Contract

This contract adds a planning-only configuration boundary for a future real YouTube Live Chat connector.

It does not enable a real connector. It does not read environment variables, files, secret values, OAuth responses, refresh credentials, or network resources. The default state is unselected transport, network disabled, OAuth unconfigured, real API execution false, and no quota budget.

Secret references are opaque handles only. They are never projected to admin output, and raw bearer values, token-shaped values, JSON credential blobs, and private URLs are rejected as unsafe input.

The candidate capability `youtube_api_candidate` is a type-level planning surface. It does not replace the current fake fixture capability, does not add a package dependency, and does not authorize network, OAuth, quota, deployment, production, legal, or YouTube policy readiness.
