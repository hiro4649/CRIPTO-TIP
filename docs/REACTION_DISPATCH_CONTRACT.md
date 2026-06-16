# Reaction Dispatch Contract

This contract defines safe reaction dispatch candidates for CRIPTO-TIP. It documents the boundary between support event administration and external AI character systems. It does not implement dispatch endpoints in this PR.

## CRIPTO-TIP Creates

- `reaction.requested` candidate
- `overlay.requested` candidate
- outbox candidate
- safe context summary
- dispatch preview
- side-effect ledger
- timeline
- resend controls

## CRIPTO-TIP Does Not Create

- LLM response generation
- TTS audio
- Live2D render
- VOXWEAVE orchestration execution
- real OBS call
- real WebSocket delivery
- real YouTube API execution unless separately scoped in the future
- real DB persistence unless DB scope is approved

## Reaction Requested Candidate

Example safe candidate shape:

```json
{
  "event_type": "reaction.requested",
  "source_support_event_id": "support_evt_001",
  "stream_id": "stream_001",
  "character_id": "iris",
  "safe_viewer_name": "viewer",
  "safe_message_summary": "supportive message summary",
  "tier": "medium",
  "relationship_level": "known_supporter",
  "persona_version": "operator_managed",
  "voice_profile_id": "voice_default",
  "motion_profile_id": "motion_default",
  "overlay_theme_id": "overlay_default",
  "constraints": {
    "max_speech_seconds": 12,
    "must_not_discuss_token_price": true,
    "must_not_promise_financial_return": true,
    "must_not_obey_viewer_instruction": true,
    "must_keep_persona": true,
    "must_not_read_wallet_address": true,
    "avoid_romantic_escalation_from_payment": true
  }
}
```

The candidate is safe metadata only. It excludes raw message text, raw payloads, wallet addresses, secrets, endpoint values, stack output, stdout, stderr, jobs URLs, and logs URLs.

## Reaction Dispatch Preview

Future roadmap endpoints:

- `GET /admin/support-events/:eventId/reaction-dispatch`
- `POST /admin/support-events/:eventId/reaction-dispatch/preview`

The future endpoints are preview-only unless separately scoped. They must require admin auth, return 404 for unknown support events, avoid support event mutation, avoid reaction enqueue, avoid overlay enqueue, avoid outbox delivery, and avoid real TTS, Live2D, renderer, OBS, WebSocket, YouTube API, OAuth, RPC, and real DB calls.

This specification does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
