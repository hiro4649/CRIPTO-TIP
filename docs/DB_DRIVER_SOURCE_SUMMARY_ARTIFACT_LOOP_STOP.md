# DB Driver Source-Summary Artifact Loop Stop

PR body refresh can create new quality-gate runs. The canonical stop rule prevents endless evidence churn.

Required policy value:

- `artifactLoopStopPolicy`: `stop_after_same_head_pass`

Rule:

1. Refresh the PR body once with same-head evidence.
2. If the follow-up body check and required checks pass on the same head, treat that as final report evidence.
3. Do not edit the PR body again only to chase another quality-gate run created by the previous PR body edit.

The stop rule is valid only when the head SHA has not changed and required checks remain green.

The stop rule cannot rescue a fake artifact, an old artifact from another head, or placeholder evidence. Same-head body-check success may be used as final report evidence without another PR body edit only after the PR body has already recorded the active head and current run/artifact values.
