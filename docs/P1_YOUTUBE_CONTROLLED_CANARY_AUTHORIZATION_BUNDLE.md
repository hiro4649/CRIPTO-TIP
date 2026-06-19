# P1 YouTube Controlled Canary Authorization Bundle

This bundle defines the owner authorization required before any real YouTube
controlled canary is executed.

## Current Status

The bundle status is `awaiting_owner_authorization`. This is not a failure and
does not authorize network execution.

No OAuth flow, secret lookup, YouTube API call, credential exchange, canary run,
support side effect, affinity update, reaction request, overlay event, outbox
enqueue, IRIS Core call, TTS, Live2D, OBS, wallet, chain, or production data
access is authorized by this document.

## Required Owner Inputs

Before a canary can run, the owner must provide or approve all of the following
as opaque references or decisions, not raw secret values:

- network authorization
- credential provider
- client ID reference status
- client secret reference status
- refresh token reference status
- redirect URI confirmation
- test channel
- test live stream
- quota budget
- privacy review
- data deletion review
- kill switch owner and activation path

Raw credential values, private secret names, token values, and private endpoints
must not be committed to docs, PR bodies, artifacts, or logs.

## First Canary Limits

The first canary, when separately authorized, is limited to:

- one test channel
- one test live stream
- list-only mode
- `maxResults` 200
- maximum API calls 3
- maximum duration 60 seconds
- no automatic fallback
- no automatic retry
- safe parse preview only
- no support side effects
- no affinity
- no reaction
- no overlay
- no external outbox
- no IRIS Core
- no VOXWEAVE
- no TTS
- no Live2D
- no OBS
- no wallet
- no chain
- no production data

## Blocked Until Authorized

The canary remains blocked while any required owner field is absent,
unconfirmed, incomplete, or unselected. Manual confirmation cannot override
secret safety, unsafe output, missing same-head checks, forbidden scope, or raw
log restrictions.
