# P0 Reaction Dispatch Local E2E Fixture

This adds an app.inject-based local integration fixture for the internal reaction dispatch lifecycle.

It verifies the current internal chain without creating new real endpoints or performing external execution.

## Covered Flow

- Admin manual support event.
- Support event validation through the server flow.
- Reaction dispatch preview and candidate persistence.
- Candidate approval.
- Outbox boundary and internal outbox enqueue.
- Lease and attempt plan.
- Attempt plan and dry-run review surfaces.
- Dry-run approval.
- Adapter execution boundary preview, review, and approval.
- Local simulation success, retryable failure, and terminal failure.
- Simulation review.
- Simulation failure DLQ.
- Blocked and state drift paths.
- Idempotent duplicate simulation path.

## Safety Boundary

- This uses local app injection only.
- This does not call real YouTube, OAuth, RPC, IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, or WebSocket delivery.
- This does not execute adapters.
- This does not dispatch external outbox events.
- This keeps dispatch attempt count at zero.
- This keeps external delivery status `not_attempted`.
- This keeps adapter execution status `not_executed`.
- This does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
