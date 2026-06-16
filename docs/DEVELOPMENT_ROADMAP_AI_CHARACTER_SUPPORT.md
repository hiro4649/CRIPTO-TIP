# Development Roadmap: AI Character Support

This roadmap connects external AI character, AI VTuber, digital human, Live2D, and real-time AI design lessons to CRIPTO-TIP without moving CRIPTO-TIP outside its product boundary.

CRIPTO-TIP is not IRIS Core, VOXWEAVE, Live2D, TTS, or the AI conversation runtime. CRIPTO-TIP owns the safe support event contract, management workflow, audit metadata, search, resend controls, and safe reaction/overlay/outbox candidate inputs.

## Role Boundary Contract

CRIPTO-TIP owns:

- `support.received` normalization
- safe context summary
- operator admin workflow
- moderation state
- resolution state
- audit metadata
- reaction, overlay, and outbox candidates
- dispatch preview
- search, timeline, ledger, and work queue

CRIPTO-TIP never executes TTS, Live2D, VOXWEAVE orchestration, renderer delivery, OBS calls, WebSocket delivery, real YouTube API calls, real OAuth, real RPC, or real DB integration unless future owner scope explicitly authorizes that work.

IRIS Core owns:

- AI reaction generation
- character memory
- affinity interpretation
- persona policy application

IRIS Core is not crypto custody.

VOXWEAVE owns:

- voice orchestration
- TTS routing candidate execution when authorized

VOXWEAVE is not CRIPTO-TIP, not the token or custody layer, and not the Live2D renderer.

LIVE2D owns:

- rendering execution
- motion execution

LIVE2D does not decide payment state, moderation state, support tier, custody, wallet semantics, or raw crypto/payment parsing.

## Admin Operator Workflow Contract

Existing and planned admin workflows should connect in this order:

- search
- timeline
- side-effect ledger
- bulk preview
- bulk apply
- action plan
- operator notes
- operator note management
- operator note search
- resolution status
- work queue
- future reaction dispatch preview
- future support event contract v2 validator
- future character continuity enforcement
- future safe context summary validator

The operator workflow remains local/internal until separate owner scope authorizes production admin UI or deployment work.

## Adaptive Support Policy

Safe adaptation may use:

- prior support facts
- preferred display name or calling style
- preferred stream genre
- relationship level
- repeated or rough support patterns for stronger hold behavior
- daily caps and decay

Forbidden adaptation:

- romantic escalation from high Tip amount
- private conversation promise from high Tip amount
- control or ownership rights from high Tip amount
- investment expectation
- persona change due to high Tip amount

## Roadmap Sequence

1. Document Support Event Contract v2 and character continuity.
2. Add reaction dispatch preview for admin operators.
3. Add support event contract v2 validator.
4. Add safe context summary validator.
5. Add character continuity enforcement.
6. Connect preview candidates to authorized external execution adapters only after separate owner scope and current-head evidence.

This spec does not add runtime readiness, production readiness, legal compliance claim, or YouTube policy compliance claim. It does not add real TTS, real Live2D, real renderer, real OBS, real WebSocket delivery, real DB, a DB driver, package changes, or lockfile changes. It does not implement token sale, exchange, cash-out, custody, or internal balance. It does not represent IRIS Token Tip as YouTube Super Chat. It keeps YouTube LIVE and IRIS Web Companion separated.
