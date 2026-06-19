# P1 Public Mock Runtime Truthfulness

Public mock routes must clearly disclose local mock execution and must not imply
real wallet verification, live YouTube execution, chain confirmation, runtime
readiness, production readiness, legal compliance, or YouTube policy compliance.

## Truthfulness Rules

- Public mock responses include `mock_runtime_truthfulness`.
- Mock nonce generation is not real wallet challenge issuance.
- Mock wallet verification is not real signature verification.
- Mock tip intent creation is not chain confirmation or real payment execution.
- Mock live session creation is not live YouTube API execution.
- Public mock responses avoid `runtime_ready` and `production_ready` wording.

## Safety Boundary

This change does not call YouTube, OAuth, RPC, wallet, IRIS Core, TTS, Live2D,
OBS, or a real DB. It does not add a DB driver, package dependency, lockfile
change, migration, contract change, or readiness/compliance claim.

## Verification Focus

Tests cover live session, wallet nonce, wallet verify, and tip intent mock
responses. They verify local mock disclosure and absence of readiness wording.
