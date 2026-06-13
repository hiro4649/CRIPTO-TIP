# Harness v1.2.0 Model-Tier Routing

`V120_TOKEN_AWARE_MODEL_TIER_ROUTING` routes low-risk, low-ambiguity work to lower-tier judgment and reserves higher-tier planning for high-risk surfaces.

Low-risk work can remain low-tier when it is small, local, reversible, and does not touch security, dependency, runtime, legal, YouTube policy, wallet/RPC, deployment, or evidence authority boundaries.

High-risk work must escalate to high-tier planning when it involves:

- Security-sensitive logic
- Dependency or package changes
- Runtime behavior changes
- Legal or YouTube policy claims
- Wallet, RPC, or deploy surfaces
- DB driver dependency or real DB behavior
- Stale evidence or missing same-head required checks
- Unsafe output or raw log exposure

High-tier planning is not owner approval. It does not create merge authority, release authority, deploy authority, or GitHub approval review.

