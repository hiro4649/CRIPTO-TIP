# P0 Reaction Dispatch Safe Candidate Persistence

This change adds a local/internal safe candidate persistence step between the Support Event Contract v2 admin surface and any future reaction dispatch approval gate.

It persists safe metadata only. It does not enqueue reaction requests, overlay events, outbox events, TTS work, Live2D work, renderer work, OBS work, WebSocket delivery, or IRIS Core work.

## Admin Endpoints

- `POST /admin/support-events/:eventId/reaction-dispatch/candidates`
- `GET /admin/support-events/:eventId/reaction-dispatch/candidates`
- `GET /admin/support-events/:eventId/reaction-dispatch/candidates/:candidateId`

All endpoints require the admin bearer token. Missing or invalid admin auth returns `401`. Unknown support events return `404`.

## Candidate Model

The candidate is derived from the existing reaction dispatch preview and Support Event Contract v2 validator. The stored metadata includes:

- candidate id
- support event id
- stream id
- character id
- source
- contract version
- validation status and validation errors
- persona, voice, motion, and overlay profile ids
- safe context hash
- constraints hash
- candidate purpose
- candidate status
- reason codes
- idempotency key
- safe preview summary
- safe constraints summary

The idempotency key is based on support event id, persona version, safe context hash, constraints hash, and candidate purpose. Duplicate creation returns the existing candidate metadata.

## Status Values

- `candidate_ready`
- `candidate_blocked`
- `candidate_invalid`
- `candidate_superseded`

## Reason Codes

- `contract_v2_valid`
- `missing_character_continuity`
- `unsafe_context`
- `moderation_not_approved`
- `resolution_blocked`
- `already_superseded`
- `unsupported_source`

## Safety Boundary

The candidate response excludes raw messages, raw payloads, wallet addresses, authorization values, secrets, stdout/stderr, job/log URLs, full prompts, LLM output, model-generated TTS text, and private URLs.

This is not runtime dispatch readiness. This is not production readiness. This is not legal compliance. This is not YouTube policy compliance.

## Next Step

The next product step is an admin approval gate for safe reaction dispatch candidates. That future gate must still avoid real TTS, real Live2D, real renderer, real OBS, real WebSocket delivery, wallet/RPC changes, and readiness claims unless separately authorized.
