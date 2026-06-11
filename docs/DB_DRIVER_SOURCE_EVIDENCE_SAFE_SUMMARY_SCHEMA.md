# DB Driver Source Evidence Safe Summary Schema

Allowed summary fields:

- `sourceCategory`
- `sourceName`
- `sourceCheckedAt`
- `sourceExpiresAt`
- `packageName`
- `packageVersion`
- `candidateDriver`
- `targetCommitSha`
- `prNumber`
- `targetBranch`
- `reviewStatus`
- `summaryStatus`
- `counts`
- `statuses`
- `safeSummary`
- `knownBlockersStatus`
- `knownBlockers`

Allowed count fields:

- `advisoryCount`
- `criticalCount`
- `highCount`
- `moderateCount`
- `lowCount`
- `unknownSeverityCount`
- `transitiveDependencyCount`
- `sourceCount`

Allowed status fields:

- `reviewStatus`
- `summaryStatus`
- `freshnessStatus`
- `rawPayloadStatus`
- `knownBlockersStatus`
- `sourceBindingStatus`
- `packageVersionBindingStatus`

Future reviewed summaries must bind the target commit, PR number, branch,
package name, package version, source category, checked timestamp, and expiry
timestamp. Raw output is outside the schema.

Future reviewed summaries must be regenerated for the exact dependency PR. They
require exact target commit, branch, PR number, package name, package version,
source category, source timestamp, and expiry binding. A reviewed summary is not
owner approval by itself and does not authorize package, lockfile, migration, or
runtime DB changes.

Future `counts` are allowed only in test fixtures or a future dependency PR
summary. Every count must be a non-negative integer, `sourceCount` must be at
least 1, `transitiveDependencyCount` must be 1000 or lower, and
`advisoryCount` must equal the sum of severity counts.

Future `statuses` may contain only the allowed status fields. Legal compliance
and YouTube policy compliance fields are intentionally excluded because this
safe-summary contract does not make those claims.
