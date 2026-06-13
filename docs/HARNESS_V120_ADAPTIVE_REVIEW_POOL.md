# Harness v1.2.0 Adaptive Review Pool

v1.2.0 improves judgment quality and token efficiency for CRIPTO-TIP work. It does not weaken safety, reduce required checks, or change product runtime behavior.

The active source-of-record is Codex Harness v1.2.0, while v1.1.8 Final Decision authority and v1.1.9 orchestration/status compatibility remain preserved.

This profile set adds named references for:

- Token-aware model-tier routing
- Typed blockers
- Review-pool policy
- Escalation hysteresis
- High-tier repair planning

This PR does not create owner approval, GitHub approval review, merge authority, release authority, deploy authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

This PR is not product runtime implementation. It does not implement the P0 Super Chat to `support.received` vertical slice.

## Active Profiles

- `modelTierRoutingProfile`: `V120_TOKEN_AWARE_MODEL_TIER_ROUTING`
- `typedBlockerProfile`: `V120_TYPED_BLOCKERS`
- `reviewPoolProfile`: `V120_REVIEW_POOL_POLICY`
- `escalationHysteresisProfile`: `V120_ESCALATION_HYSTERESIS`
- `highTierRepairPlanningProfile`: `V120_HIGH_TIER_REPAIR_PLANNING`
- `forbiddenScopeProfile`: `CRIPTO_TIP_SAFETY_CORE_V1`
- `verificationProfile`: `PRODUCT_R3_FULL_V1`
- `evidenceProfile`: `CANONICAL_PREVIOUS_HEAD_PLUS_CURRENT_ARTIFACT_V1`
- `mergeReadinessProfile`: `SAME_HEAD_CLEAN_REQUIRED_V1`

