# P1 Support Domain Numeric Identity Correctness

This change tightens local support-domain input identity before Super Chat or token-tip inputs become `support.received`.

The product boundary is unchanged. This is not live YouTube execution, OAuth execution, real DB execution, package dependency work, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Correctness Rules

- Support amount raw values are positive decimal strings.
- YouTube `amount_micros` values are positive decimal strings with no leading zero, decimal, exponent, sign, or zero representation.
- Currency codes are uppercase three-letter ISO-style codes.
- `source_event_id` is non-empty and bounded before it is used for support idempotency.
- The fixture normalizer reuses shared schemas instead of maintaining a second numeric/currency regex contract.

## Safety Boundary

The change does not call YouTube, OAuth, RPC, wallet, IRIS Core, TTS, Live2D, OBS, or a real DB. It does not add a DB driver, change package files, change migrations, or change contracts.

## Verification Focus

Tests cover accepted canonical values and rejected ambiguous numeric identity values such as zero, leading-zero, decimal, and exponent amounts. Tests also cover empty Super Chat source event IDs.
