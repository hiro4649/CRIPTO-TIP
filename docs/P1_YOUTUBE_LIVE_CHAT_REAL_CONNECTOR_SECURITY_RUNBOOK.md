# P1 YouTube Live Chat Real Connector Security Runbook

## OAuth

Use web-server authorization flow with unpredictable, session-bound, expiring, single-use CSRF state. Offline access is allowed only if owner scope approves refresh-token storage.

Tokens, authorization codes, client secrets, client IDs when sensitive by deployment policy, and raw callback queries must never be logged, committed, returned by admin APIs, or stored in `.codex` evidence.

## Secret References

Configuration may use opaque secret references only. Secret values must stay outside the repository, PR body, logs, admin responses, tests, and machine evidence.

## Revocation

The owner must approve a token revocation runbook before real connector execution. Revocation metadata may be recorded, but revocation requests are not performed in this gate.

## Incident Response

If token leakage, scope mismatch, quota storm, repeated connector failure, or unsafe output is suspected, disable the operator kill switch and stop connector execution.
