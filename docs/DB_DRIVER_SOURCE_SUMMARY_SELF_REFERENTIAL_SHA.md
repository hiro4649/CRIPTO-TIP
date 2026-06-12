# DB Driver Source-Summary Self-Referential SHA Policy

Committed evidence cannot reliably contain the final commit SHA of the commit that contains that evidence. The canonical policy therefore allows previous-head committed evidence when the PR body, GitHub required checks, and safe artifact provide current-head proof.

Required policy value:

- `selfReferentialShaPolicy`: `exception_allowed_with_current_head_artifact`

Rejected states:

- missing current-head PR body evidence
- missing same-head required checks
- missing same-head quality-gate artifact
- stale or fake artifact IDs
- placeholder SHA values

This exception is limited to evidence freshness. It does not approve source evidence, select a DB driver, add a dependency, or claim runtime readiness.

The exception is not a bypass. It requires a concrete PR number, active base SHA, active head SHA, same-head required checks, same-head quality-gate safe artifact, and placeholder rejection. If those current-head proofs are absent, previous-head committed evidence cannot be treated as merge-ready.
