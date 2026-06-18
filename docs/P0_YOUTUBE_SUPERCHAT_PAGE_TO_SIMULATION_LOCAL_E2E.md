# P0 YouTube Super Chat Page To Simulation Local E2E

This local E2E connects the fixture-only YouTube Live Chat page path to the existing local support and reaction-dispatch simulation lifecycle.

The test creates a fixture cursor, ingests a page through the explicit page ingest route, persists approved and held `support.received` events, runs the approved event through the local admin lifecycle, and verifies a local simulation result. Held messages remain blocked from reaction dispatch.

The path remains fixture-only. It does not call YouTube, use OAuth, use network calls, add a Google SDK, execute IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, WebSocket delivery, wallet/RPC/deploy, real DB, or external adapters.

This is not runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
