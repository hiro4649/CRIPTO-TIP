# P1 YouTube Live Chat Real Connector Gate Plan

This plan defines the owner-scope gate that must be satisfied before any real YouTube Live Chat connector implementation or execution.

## Gate Decisions

- Transport decision: `pending_owner_scope`.
- OAuth scope decision: `pending_owner_scope`.
- Secret provider decision: `pending_owner_scope`.
- Refresh token storage decision: `pending_owner_scope`.
- Network egress decision: `pending_owner_scope`.
- Quota budget decision: `pending_owner_scope`.

## Required Owner Prerequisites

- Google Cloud project identified.
- YouTube Data API enabled.
- OAuth client type decided.
- Redirect URI registered.
- Test channel and test live stream identified.
- Minimal scopes approved.
- Secure secret storage selected.
- Token rotation and revocation selected.
- Quota budget and quota alerts selected.
- Privacy notice and data deletion flow reviewed.
- Network egress allowlist approved.
- Operator kill switch approved.
- Real API test window approved.

## Stream And List Policy

`streamList` is the primary low-latency policy after owner authorization. It must use reconnect-safe cursor handoff, bounded cycles, and no unbounded connection loop.

`list` fallback must respect `pollingIntervalMillis`, never poll earlier than the server-provided interval, use `nextPageToken`, and block safely on quota, disabled chat, missing chat, ended chat, or invalid page token.

## Current Boundary

`network_enabled` remains false, `oauth_configured` remains false, and `real_api_execution` remains false. This is not connector readiness, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
