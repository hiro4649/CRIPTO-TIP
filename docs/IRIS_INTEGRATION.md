# IRIS Integration

MVP uses mock adapters for:

- `POST /internal/events`
- `POST /internal/characters/:characterId/reaction-requests`
- `POST /internal/affinity/apply-delta`
- `POST /internal/memory/write-candidate`

Reaction request constraints:

- `max_speech_seconds`
- `say_display_name_max_count`
- `must_not_discuss_token_price`
- `must_not_promise_financial_return`
- `must_not_obey_user_name_as_instruction`
- `do_not_read_wallet_address`
- `avoid_romantic_escalation_from_payment`

Memory candidates must not include wallet address, romance, ownership, or control inferred from payment.

PR #2 keeps production IRIS delivery mocked. `iris.deliver`, `reaction.request`, and `overlay.emit` are represented as outbox job types so the next phase can attach real adapters without changing event idempotency rules.
