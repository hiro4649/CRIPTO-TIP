# DB Driver Candidate Review Evidence

The candidate review evidence is intentionally incomplete and blocked. It is
safe to commit because it contains no dependency decision and no package or
lockfile authorization.

## Machine Evidence

Source: `.codex/db-driver-candidate-review-pack.json`

Required current values:

- `prNumber`: `53`
- `targetCommitSha`: `cbde064f86d4906e206ba679dffa306b090fd0c8`
- `baseCommitSha`: `62bbe12522e51b82b422a364271f8553ad2eed49`
- `reviewPackStatus`: `not_ready`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `candidateDrivers`: exactly `["pg", "postgres"]`
- candidate `candidateStatus`: `candidate`
- `licenseReviewStatus`: `not_reviewed`
- `supplyChainReviewStatus`: `not_reviewed`
- `securityAdvisoryReviewStatus`: `not_reviewed`
- `versionPolicyStatus`: `not_selected`
- `packageDiffStatus`: `missing`
- `lockfileReviewStatus`: `missing`
- `secretBoundaryStatus`: `not_reviewed`
- `ownerApprovalStatus`: `not_approved`
- `finalApprovalGateStatus`: `blocked`

`candidateStatus: candidate` is a review-queue marker only. It does not select a
driver, allow dependency work, allow package installation, record owner
approval, or unblock the final gate.

## Safety Boundary

The evidence validator rejects raw GitHub logs, raw provider responses, DB
connection strings, token-like values, wallet addresses, private URLs, and unsafe
secret-looking keys.

## Review Independence

AI review can recommend follow-up work, but AI output is not human approval.
Future driver selection requires a project-owner approval record and a separate
final approval gate record.
