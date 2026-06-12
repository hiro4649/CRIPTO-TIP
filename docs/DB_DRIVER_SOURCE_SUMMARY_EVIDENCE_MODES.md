# DB Driver Source-Summary Evidence Modes

The canonical model separates committed evidence from merge evidence.

## Previous-Head Committed Plus Current-Head Artifact

This is the active product mode. It allows committed `.codex` evidence to represent a previous safe head while requiring merge evidence to be proven by:

- PR body with the active head SHA
- same-head required checks
- same-head quality-gate success
- same-head safe artifact

This mode prevents a self-referential SHA loop where a commit cannot contain its own final SHA before it exists.

This mode is valid only when `committedEvidenceHeadSha` is explicitly separated from `currentHeadEvidence.headSha`. Ambiguous `targetCommitSha` use is rejected when it equals the base commit or when it uses a synthetic fixture SHA.

## Current-Head Committed Required

This mode is fixture-only in this PR. It exists to prove the validator can reject old-style assumptions that all evidence must be committed at the exact current head.

Future work may use this mode only when the commit SHA can be injected by an automated evidence pipeline without manual placeholder text.

Fixture values are synthetic and must never appear in committed `.codex` evidence or final PR body evidence.
