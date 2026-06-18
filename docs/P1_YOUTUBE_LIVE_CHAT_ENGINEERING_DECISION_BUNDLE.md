# P1 YouTube Live Chat Engineering Decision Bundle

This bundle records code-only engineering decisions for the future YouTube Live Chat real connector. It does not create owner approval, network authorization, OAuth authorization, secret access, release authority, deploy authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Official References Checked

- YouTube LiveChatMessages `list`: https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list
- YouTube LiveChatMessages `streamList`: https://developers.google.com/youtube/v3/live/docs/liveChatMessages/streamList
- Google OAuth web-server application guide: https://developers.google.com/identity/protocols/oauth2/web-server
- YouTube Data API quota calculator: https://developers.google.com/youtube/v3/determine_quota_cost
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies

## Verified Planning Facts

- `list` uses `GET https://www.googleapis.com/youtube/v3/liveChat/messages`.
- `list` requires `liveChatId` and `part`.
- `part` supports `id`, `snippet`, and `authorDetails`.
- `list` returns `nextPageToken`; a later request uses it as `pageToken`.
- `list` returns `pollingIntervalMillis`; clients should not poll earlier than that interval.
- `streamList` is server-streaming and is contract-first in this repository.
- Google OAuth supports `state`; this remains required for CSRF/session binding.
- Google OAuth `access_type=offline` is the documented way to request refresh-capable authorization, but this repository does not execute consent or token exchange in this phase.
- YouTube quota costs must be operator-configured from official quota data; no runtime default project quota is assumed.
- The selected planning scope is `https://www.googleapis.com/auth/youtube.readonly`, verified from official/discovery method metadata for live chat read methods.

## Engineering Decisions

- Transport decision: `direct_rest_fetch`.
- Reason: Node has built-in fetch, so a future direct REST transport can avoid Google SDK dependency and package/lockfile churn.
- Initial execution mode: `list_controlled_canary`.
- Stream mode: `contract_first`; implementation remains disabled until later owner-scoped authorization.
- List fallback policy: `explicit_only`; implicit fallback remains forbidden.
- Secret provider decision: `opaque_secret_provider_interface`.
- Actual secret provider: `unselected`.
- Quota policy: operator-configured only; no runtime default project quota.
- Kill switch: mandatory; default state is `blocked`.
- Network authorization: absent.
- Real API execution: false.

## Boundaries

This PR is documentation and machine-readable evidence only. It does not change product runtime behavior, does not call YouTube, does not start OAuth, does not read secrets, and does not add dependencies.
