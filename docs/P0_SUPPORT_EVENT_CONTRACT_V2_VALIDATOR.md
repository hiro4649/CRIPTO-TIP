# P0 Support Event Contract v2 Validator

This change adds a local validator for Support Event Contract v2 reaction dispatch previews.

The validator checks that preview responses contain required support event metadata, safe context summary fields, character continuity fields, reaction constraints, candidate labels, and skipped side-effect statuses. It rejects unsafe serialized output such as raw message markers, raw payload markers, wallet addresses, authorization strings, secret-like output, stdout, stderr, jobs URLs, logs URLs, and readiness claim markers.

The validator is used by the admin reaction dispatch preview response as `contract_validation`. It is a local contract check only. It does not execute AI reaction, call real TTS, call real Live2D, call a renderer, call OBS, perform WebSocket delivery, mutate support events, enqueue reaction requests, enqueue overlay events, enqueue outbox jobs, use real DB, add a DB driver, change package files, or claim runtime, production, legal, or YouTube policy readiness.
