# P1 YouTube Credential Provider And Kill Switch

## Current Scope

Adds a no-secret credential provider interface, fake opaque credential provider, and kill-switch contract for fake transport only.

This PR does not enable a real YouTube connector.

## Current-Head Evidence

Head SHA: current_pr_head

Base SHA: pre_pr

CI: pre_pr

Quality-gate: pre_pr

Quality-gate artifact: pre_pr

Tests: local_pre_pr

## Safety

No package.json change.
No pnpm-lock change.
No real YouTube API.
No real OAuth.
No network call.
No token exchange.
No token refresh.
No token revocation request.
No raw token returned.
No Authorization header returned.
No secret value read.
No environment secret read.
No filesystem secret read.
No Google SDK.
No runtime readiness claim.
No production readiness claim.
No legal compliance claim.
No YouTube policy compliance claim.
No owner approval created.
No GitHub approval review created.
No merge authority created.

## Human Confirmation

This is not human/project-owner approval.
This is not GitHub approval review.
This does not create owner approval record.
This does not create release, deploy, network, OAuth, or secret-access authority.
