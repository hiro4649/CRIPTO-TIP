# Harness v1.2.0 Escalation Hysteresis

`V120_ESCALATION_HYSTERESIS` prevents noisy escalation from a single ambiguous signal.

Ambiguous or incomplete signals should first be classified with:

- Reproduction status
- Safe artifact availability
- Scope classification
- Current-head evidence state
- Required check state

Do not jump to high-tier repair planning for one weak signal when a small bounded check can clarify the state.

Immediate blockers still apply. Secrets, unsafe output, forbidden scope, raw logs, package/lockfile changes in a prohibited PR, readiness claims, and missing required same-head checks must stop the merge-readiness path.

