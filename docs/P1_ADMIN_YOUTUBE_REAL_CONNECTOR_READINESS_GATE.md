# P1 Admin YouTube Real Connector Readiness Gate

This adds a read-only admin endpoint for real connector readiness:

`GET /admin/youtube-live-chat/real-connector-readiness`

The endpoint always reports `blocked_pending_owner_scope` in this PR. It does not read environment variables, files, secret references, endpoint values, OAuth material, or network resources. It does not create owner approval, GitHub approval review, merge authority, release authority, deploy authority, network authority, OAuth authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

The endpoint exists so operators can see the remaining owner-scoped prerequisites before any real connector implementation begins.
