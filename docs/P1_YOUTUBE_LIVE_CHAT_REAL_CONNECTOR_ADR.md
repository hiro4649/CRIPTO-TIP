# P1 YouTube Live Chat Real Connector ADR

## Status

Pending owner scope.

## Options

### googleapis_sdk

Requires explicit package and lockfile permission, dependency review, and Google SDK behavior review.

### direct_rest_fetch

Avoids SDK dependency but requires custom OAuth header handling, request classification, retry handling, and stream handling.

### grpc_streaming

Requires stream framing and reconnect review plus likely package and transport complexity review.

## Decision

No transport is selected in this PR.

## Consequence

Real connector implementation remains blocked until owner scope selects transport, network authorization, OAuth scope, secure secret storage, quota budget, privacy review, data deletion review, and operator kill switch.
