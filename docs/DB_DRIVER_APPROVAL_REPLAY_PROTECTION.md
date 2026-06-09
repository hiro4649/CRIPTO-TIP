# DB Driver Approval Replay Protection

Approval replay happens when an old approval record is copied into a different
branch, PR, commit, or scope. That is forbidden because DB driver introduction
is a controlled owner decision, not a reusable token.

## Rejected Replay Cases

- Branch replay: `target_branch` does not match the active PR branch.
- PR replay: `pr_number` does not match the active PR number.
- Commit replay: `target_commit_sha` does not match the active PR head.
- Base replay: `base_commit_sha` does not match the expected base commit when
  a base binding is supplied.
- Scope replay: `approval_scope` is outside the allowlist.
- Stale approval: `expires_at` is expired or beyond the strict approval window.
- Fingerprint replay: canonical record fields changed after the fingerprint was
  created.

## Owner Decision Separation

AI review recommendation is useful review input, but it is not owner approval.
The approval record must name a project-owner actor and must reject AI,
assistant, Codex, bot, GitHub Actions, and unknown actors.

## Safe Evidence

Replay protection evidence stores only safe fields. It does not store DB
connection strings, secret values, private URLs, wallet addresses, raw provider
responses, or raw GitHub logs.
