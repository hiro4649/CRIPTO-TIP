# Threat Model

Key risks:

- User input injection in display names and messages.
- Wallet address leakage into AI speech or memory.
- Duplicate chain events causing duplicate affinity.
- Reorgs causing premature support events.
- Overlay token leakage.
- YouTube scraping or API policy drift.
- Admin route abuse.

Mitigations:

- Zod validation at API boundaries.
- Sanitizer, moderation, and LLM-safe display name separation.
- Confirmation window and block cursor design for chain listener.
- Read-only stream-scoped overlay token.
- Official YouTube Live API connector only.
- Admin/internal bearer token checks in MVP and audit log design for production.

Durable storage threats:

- Duplicate outbox jobs can produce repeated external side effects. Mitigation: unique `idempotency_key` plus idempotent consumers.
- Stale locks can block delivery. Mitigation: production workers must reclaim expired locks.
- Raw message access can expose personal data. Mitigation: access controls, retention limits, deletion workflows, and sanitized event payloads.
