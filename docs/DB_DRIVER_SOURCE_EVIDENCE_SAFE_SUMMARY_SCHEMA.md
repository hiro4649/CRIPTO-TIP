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

