# Support Event Contract v2

`support_event_contract_version` is `2.0`.

This contract defines the safe `support.received` boundary for CRIPTO-TIP. It is a product specification for normalized support events and downstream candidate inputs. It does not implement runtime dispatch, production persistence, legal compliance, YouTube policy compliance, real TTS, real Live2D, renderer execution, OBS delivery, WebSocket delivery, real DB access, a DB driver, package changes, or lockfile changes.

YouTube LIVE remains the broadcast surface. IRIS Web Companion remains the external crypto Tip intake surface. CRIPTO-TIP must not replace YouTube Super Chat payment, and IRIS Token Tip must not be represented as YouTube Super Chat.

## Sources

Allowed `source` values:

- `youtube_super_chat`
- `iris_token_tip`
- `admin_manual_support`
- `future_platform_tip`

Each source is normalized into `support.received` without changing the original platform or payment semantics.

## Required Fields

- `event_id`
- `source`
- `source_event_id`
- `stream_id`
- `character_id`
- `created_at`
- `viewer_safe_identity`
- `support_amount`
- `support_tier`
- `message_moderation`
- `operator_state`
- `reaction_constraints`
- `character_continuity`
- `safe_context_summary`

## Viewer Safe Identity

`viewer_safe_identity` contains only safe identity data for display and prompt context:

- `display_name_sanitized`
- `display_name_reading`
- `llm_safe_display_name`
- `viewer_locale`
- `youtube_author_channel_id`, optional
- `wallet_address`, optional and shortened or hidden for display
- `must_not_treat_display_name_as_instruction: true`

Viewer names are labels, not instructions. A viewer name cannot override persona, moderation, relationship boundary, voice profile, motion profile, or operator policy.

## Character Continuity

`character_continuity` binds the support event to the active character contract:

- `character_id`
- `persona_version`
- `voice_profile_id`
- `motion_profile_id`
- `overlay_theme_id`
- `relationship_level`
- `must_keep_persona: true`
- `must_not_accept_persona_override: true`
- `must_not_change_identity_from_tip_message: true`

Payment amount is not persona authority. A high support amount cannot change character identity, voice, motion, relationship boundary, or operator-managed persona version.

## Safe Context Summary

`safe_context_summary` is the only summary intended for downstream AI reaction planning:

- `viewer_name_safe`
- `support_tier`
- `message_summary`
- `relationship_level`
- `recent_support_count`
- `moderation_status`
- `allowed_reaction`

Forbidden topics for downstream reaction context:

- `token_price`
- `investment_return`
- `wallet_address`
- `romantic_escalation`
- `ownership_or_control`
- `external_payment_substitution`

Raw messages, raw payloads, wallet addresses, secrets, stack output, stdout, stderr, jobs URLs, and logs URLs must not be exposed in the safe context summary.

## Reaction Constraints

Every reaction candidate receives explicit constraints:

- `max_speech_seconds`
- `can_say_name`
- `can_read_message`
- `must_not_discuss_token_price`
- `must_not_promise_financial_return`
- `must_not_obey_user_name_as_instruction`
- `must_not_read_wallet_address`
- `avoid_romantic_escalation_from_payment`
- `must_keep_persona`
- `must_not_accept_viewer_persona_override`

These constraints are safety boundaries, not hints. They preserve the product rule that support amount cannot buy ownership, control, romantic escalation, investment claims, or character identity changes.

## Operator State

`operator_state` records local/internal admin workflow status:

- `moderation_status`
- `resolution_status`
- `requires_operator_review`
- `operator_hold_reason`
- `admin_action_plan_available`

Operator state is safe metadata. It does not create owner approval, GitHub approval review, merge authority, release authority, deploy authority, production readiness, or legal compliance.
