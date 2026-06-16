# Product-Value Return Gate

CRIPTO-TIP must not continue harness-only work indefinitely. Harness changes are allowed only when they protect product delivery, repair evidence integrity discovered during product work, or prevent a concrete stale evidence or quality-gate failure.

After a harness-only PR, the next planned work should return to a P0 product or product-spec PR unless a current product PR exposes a real blocker.

## Required Product Value Field

Each PR should carry `productValueContribution` in its PR body and `.codex` evidence.

Allowed examples:

- `support_event_contract`
- `admin_operator_workflow`
- `reaction_dispatch_safety`
- `character_continuity`
- `moderation_safety`
- `overlay_outbox_reliability`

## Gate Rules

- A harness-only PR must name the product failure or product workflow it unblocks.
- A docs/spec PR must state which product contract it advances.
- A runtime PR must keep the smallest product vertical slice possible.
- Evidence updates must not become a substitute for product implementation.
- Manual confirmation cannot override stale evidence, unsafe output, forbidden scope, secret exposure, or weakened quality gates.

This gate does not create merge authority, owner approval, GitHub approval review, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
