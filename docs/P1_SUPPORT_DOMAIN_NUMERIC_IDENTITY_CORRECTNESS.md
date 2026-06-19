# P1 Support Domain Numeric Identity Correctness

This change tightens local support-domain input identity before Super Chat or token-tip inputs become `support.received`, and makes support side effects use the full `source + source_event_id` identity.

The product boundary is unchanged. This is not live YouTube execution, OAuth execution, real DB execution, package dependency work, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Correctness Rules

- Support amount raw values are positive decimal strings.
- High-tip moderation compares unsigned decimal strings without `Number`, `parseInt`, or `parseFloat`.
- YouTube `amount_micros` values are positive decimal strings with no leading zero, decimal, exponent, sign, or zero representation.
- Currency codes are uppercase three-letter ISO-style codes.
- `source_event_id` is non-empty and bounded before it is used for support idempotency.
- Support event identity authority is the structured pair `source + source_event_id`.
- Affinity, delivery, overlay, reaction, outbox, and side-effect ledger checks must not collapse distinct sources that share a `source_event_id`.
- `event_id` reuse across different support identities fails closed as `support_event_id_collision`.
- The fixture normalizer reuses shared schemas instead of maintaining a second numeric/currency regex contract.

## Safety Boundary

The change does not call YouTube, OAuth, RPC, wallet, IRIS Core, TTS, Live2D, OBS, or a real DB. It does not add a DB driver, change package files, or change contracts. The only migration change is additive/constraint-safe support side-effect identity alignment; it does not drop tables, truncate data, or execute against a live database in local verification.

## Verification Focus

Tests cover accepted canonical values and rejected ambiguous numeric identity values such as zero, leading-zero, decimal, and exponent amounts. Tests also cover empty Super Chat source event IDs, exact affinity lookup, source-aware side-effect idempotency, event-id collision fail-closed behavior, and migration constraint alignment.
