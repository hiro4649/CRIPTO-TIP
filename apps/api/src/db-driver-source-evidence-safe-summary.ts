export const dbDriverSourceEvidenceSafeSummaryCandidateDrivers = ["pg", "postgres"] as const;
export type DbDriverSourceEvidenceSafeSummaryCandidateDriver =
  (typeof dbDriverSourceEvidenceSafeSummaryCandidateDrivers)[number];

export const dbDriverSourceEvidenceAllowedSummaryFields = [
  "sourceCategory",
  "sourceName",
  "sourceCheckedAt",
  "sourceExpiresAt",
  "packageName",
  "packageVersion",
  "candidateDriver",
  "targetCommitSha",
  "prNumber",
  "targetBranch",
  "reviewStatus",
  "summaryStatus",
  "counts",
  "statuses",
  "safeSummary",
  "knownBlockersStatus",
  "knownBlockers"
] as const;

export const dbDriverSourceEvidenceAllowedCountFields = [
  "advisoryCount",
  "criticalCount",
  "highCount",
  "moderateCount",
  "lowCount",
  "unknownSeverityCount",
  "transitiveDependencyCount",
  "sourceCount"
] as const;

export const dbDriverSourceEvidenceAllowedStatusFields = [
  "reviewStatus",
  "summaryStatus",
  "freshnessStatus",
  "rawPayloadStatus",
  "knownBlockersStatus",
  "sourceBindingStatus",
  "packageVersionBindingStatus"
] as const;

export const dbDriverSourceEvidenceForbiddenRawFields = [
  "rawAuditJson",
  "rawAuditOutput",
  "rawAdvisoryJson",
  "rawAdvisoryResponse",
  "rawOsvResponse",
  "rawNpmRegistryMetadata",
  "rawDependencyTree",
  "rawTerminalOutput",
  "stdout",
  "stderr",
  "stackTrace",
  "logsUrl",
  "jobsUrl",
  "advisoryApiResponse",
  "npmAuditJson",
  "githubAdvisoryResponse",
  "osvRawResponse",
  "snykRawResponse",
  "npmRegistryRawMetadata",
  "dependencyTree",
  "fullDependencyTree",
  "rawPackageMetadata",
  "rawProviderResponse",
  "fileContents",
  "databaseUrl",
  "connectionString",
  "privateKey",
  "clientSecret",
  "apiKey",
  "accessToken",
  "refreshToken"
] as const;

export const dbDriverSourceEvidenceForbiddenWording = [
  "clean",
  "no vulnerabilities",
  "no advisory",
  "no advisories",
  "no known blockers",
  "safe to install",
  "safe dependency",
  "approved",
  "approved source",
  "review complete",
  "legally safe",
  "legal compliant",
  "policy compliant",
  "production ready",
  "runtime ready",
  "secure",
  "security clean",
  "audit clean",
  "CVE clean",
  "GHSA clean",
  "OSV clean",
  "dependency approved",
  "driver ready",
  "selection ready",
  "fresh enough to select",
  "no issues",
  "no risk",
  "risk free",
  "safe for production",
  "approved for production",
  "ready to install",
  "installation approved",
  "dependency allowed",
  "package allowed",
  "source approved",
  "summary approved",
  "reviewed and safe",
  "security passed",
  "audit passed",
  "advisory passed",
  "all clear",
  "green light"
] as const;

const currentPrNumber = 60;
const stalePrNumbers = [59] as const;
const staleEvidenceValues = [
  "c9e19b852640ae28b3aa77190c1368873b1fb2d2",
  "27379749965",
  "7577783685"
] as const;

export const dbDriverSourceEvidenceSafeSummaryBlockers = [
  "safe_summary_contract_ready_not_review_approval",
  "source_evidence_not_reviewed",
  "safe_summary_not_reviewed",
  "safe_summary_binding_not_reviewed",
  "raw_payload_forbidden",
  "raw_payload_detected",
  "forbidden_raw_field_detected",
  "forbidden_wording_detected",
  "known_blockers_not_reviewed",
  "known_blockers_empty_array_forbidden",
  "selected_driver_forbidden",
  "package_change_forbidden",
  "pnpm_lock_change_forbidden",
  "db_driver_dependency_forbidden",
  "real_db_connection_forbidden",
  "migration_execution_forbidden",
  "live_db_integration_forbidden",
  "provider_sdk_apply_forbidden",
  "production_deployment_forbidden",
  "runtime_readiness_claim_forbidden",
  "production_readiness_claim_forbidden",
  "legal_compliance_claim_forbidden",
  "youtube_policy_compliance_claim_forbidden",
  "unsafe_evidence_rejected",
  "raw_log_reference_rejected",
  "raw_advisory_output_rejected",
  "raw_audit_output_rejected",
  "raw_osv_output_rejected",
  "raw_npm_registry_output_rejected",
  "raw_dependency_tree_rejected",
  "future_fixture_only"
] as const;

type SafeSummaryStatus = "contract_ready" | "not_reviewed" | "invalid";
type ReviewStatus = "not_reviewed" | "reviewed" | "pass" | "failed";
type DriverChoiceStatus = "not_selected" | "selected";
type RawPayloadStatus = "raw_payload_absent" | "raw_present" | "present";
type KnownBlockersStatus = "not_reviewed" | "reviewed";

export interface DbDriverSourceEvidenceCounts {
  advisoryCount: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  unknownSeverityCount: number;
  transitiveDependencyCount: number;
  sourceCount: number;
}

export interface DbDriverSourceEvidenceStatuses {
  reviewStatus: ReviewStatus;
  summaryStatus: "not_reviewed" | "reviewed" | "pass" | "failed";
  freshnessStatus: "not_reviewed" | "fresh" | "stale";
  rawPayloadStatus: RawPayloadStatus;
  knownBlockersStatus: KnownBlockersStatus;
  sourceBindingStatus: "not_reviewed" | "reviewed";
  packageVersionBindingStatus: "not_reviewed" | "reviewed";
}

export interface DbDriverSourceEvidenceCandidateSafeSummary {
  driverName: DbDriverSourceEvidenceSafeSummaryCandidateDriver;
  packageName: DbDriverSourceEvidenceSafeSummaryCandidateDriver;
  summaryStatus: "not_reviewed" | "reviewed" | "pass" | "failed";
  allowedSummary: Record<string, unknown> | null;
  reviewStatus: ReviewStatus;
  sourceCategory: string | null;
  packageVersion: string | null;
  targetCommitSha: string | null;
  prNumber: number | null;
  targetBranch: string | null;
  counts: DbDriverSourceEvidenceCounts | null;
  statuses: DbDriverSourceEvidenceStatuses | null;
  knownBlockersStatus: KnownBlockersStatus;
  knownBlockers: string[] | null;
  rawPayloadStatus: RawPayloadStatus;
  safeSummary: string;
  refreshRequired: boolean;
}

export interface DbDriverSourceEvidenceSafeSummaryRecord {
  schemaVersion: "1.0.0";
  harnessVersion: string;
  repository: "hiro4649/CRIPTO-TIP";
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  safeSummaryContractStatus: SafeSummaryStatus;
  stalenessPolicyStatus: "policy_ready" | "not_reviewed" | "invalid";
  sourceEvidenceStatus: "not_reviewed" | "reviewed" | "pass" | "fresh";
  driverChoiceStatus: DriverChoiceStatus;
  selectedDriver: DbDriverSourceEvidenceSafeSummaryCandidateDriver | null;
  candidateDrivers: DbDriverSourceEvidenceSafeSummaryCandidateDriver[];
  candidateSafeSummaries: DbDriverSourceEvidenceCandidateSafeSummary[];
  allowedSummaryFields: string[];
  allowedCountFields: string[];
  allowedStatusFields: string[];
  forbiddenRawFields: string[];
  forbiddenWording: string[];
  safeSummaryBindingStatus: "not_reviewed" | "reviewed" | "pass";
  rawPayloadStatus: RawPayloadStatus;
  knownBlockersStatus: KnownBlockersStatus;
  knownBlockers: string[] | null;
  reviewStatus: ReviewStatus;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: "blocked" | "approved";
  dependencyPrTemplateStatus: "template_ready" | "not_ready";
  packageJsonChangeAllowed: boolean;
  pnpmLockChangeAllowed: boolean;
  dbDriverDependencyAllowed: boolean;
  realDbConnectionAllowed: boolean;
  migrationExecutionAllowed: boolean;
  liveDbIntegrationTestAllowed: boolean;
  providerSdkApplyAllowed: boolean;
  actualProductionDeploymentAllowed: boolean;
  runtimeReadinessClaimAllowed: boolean;
  productionReadinessClaimAllowed: boolean;
  legalComplianceClaimAllowed: boolean;
  youtubePolicyComplianceClaimAllowed: boolean;
  forbiddenScopeStatus: "pass" | "fail";
  safeSummary: string;
  createdAt: string;
}

export interface DbDriverSourceEvidenceSafeSummaryContext {
  harnessVersion: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
}

export function createDefaultDbDriverSourceEvidenceSafeSummaryRecord(
  context: DbDriverSourceEvidenceSafeSummaryContext
): DbDriverSourceEvidenceSafeSummaryRecord {
  const candidates = dbDriverSourceEvidenceSafeSummaryCandidateDrivers.map((driverName) => ({
    driverName,
    packageName: driverName,
    summaryStatus: "not_reviewed" as const,
    allowedSummary: null,
    reviewStatus: "not_reviewed" as const,
    sourceCategory: null,
    packageVersion: null,
    targetCommitSha: null,
    prNumber: null,
    targetBranch: null,
    counts: null,
    statuses: null,
    knownBlockersStatus: "not_reviewed" as const,
    knownBlockers: null,
    rawPayloadStatus: "raw_payload_absent" as const,
    safeSummary: `${driverName} source evidence safe summary is not reviewed. Future reviewed summary must be source-bound and raw-payload-free.`,
    refreshRequired: true
  }));

  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion,
    repository: "hiro4649/CRIPTO-TIP",
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    safeSummaryContractStatus: "contract_ready",
    stalenessPolicyStatus: "policy_ready",
    sourceEvidenceStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...dbDriverSourceEvidenceSafeSummaryCandidateDrivers],
    candidateSafeSummaries: candidates,
    allowedSummaryFields: [...dbDriverSourceEvidenceAllowedSummaryFields],
    allowedCountFields: [...dbDriverSourceEvidenceAllowedCountFields],
    allowedStatusFields: [...dbDriverSourceEvidenceAllowedStatusFields],
    forbiddenRawFields: [...dbDriverSourceEvidenceForbiddenRawFields],
    forbiddenWording: [...dbDriverSourceEvidenceForbiddenWording],
    safeSummaryBindingStatus: "not_reviewed",
    rawPayloadStatus: "raw_payload_absent",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
    reviewStatus: "not_reviewed",
    ownerApprovalStatus: "not_approved",
    finalApprovalGateStatus: "blocked",
    dependencyPrTemplateStatus: "template_ready",
    packageJsonChangeAllowed: false,
    pnpmLockChangeAllowed: false,
    dbDriverDependencyAllowed: false,
    realDbConnectionAllowed: false,
    migrationExecutionAllowed: false,
    liveDbIntegrationTestAllowed: false,
    providerSdkApplyAllowed: false,
    actualProductionDeploymentAllowed: false,
    runtimeReadinessClaimAllowed: false,
    productionReadinessClaimAllowed: false,
    legalComplianceClaimAllowed: false,
    youtubePolicyComplianceClaimAllowed: false,
    forbiddenScopeStatus: "pass",
    safeSummary: "DB driver source evidence safe-summary contract is ready, but current source evidence is not reviewed and no driver is selected.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(
  record: DbDriverSourceEvidenceSafeSummaryRecord
): DbDriverSourceEvidenceSafeSummaryRecord {
  assertBasicRecord(record);
  assertExactSet(record.candidateDrivers, dbDriverSourceEvidenceSafeSummaryCandidateDrivers, "candidateDrivers");
  assertExactSet(record.allowedSummaryFields, dbDriverSourceEvidenceAllowedSummaryFields, "allowedSummaryFields");
  assertExactSet(record.allowedCountFields, dbDriverSourceEvidenceAllowedCountFields, "allowedCountFields");
  assertExactSet(record.allowedStatusFields, dbDriverSourceEvidenceAllowedStatusFields, "allowedStatusFields");
  assertExactSet(record.forbiddenRawFields, dbDriverSourceEvidenceForbiddenRawFields, "forbiddenRawFields");
  assertExactSet(record.forbiddenWording, dbDriverSourceEvidenceForbiddenWording, "forbiddenWording");
  assertCurrentNotReviewed(record);
  assertNoForbiddenRawPayload(record);
  assertNoUnsafeValues(record);
  for (const candidate of record.candidateSafeSummaries) assertCurrentCandidate(candidate);
  return record;
}

export function validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(
  record: DbDriverSourceEvidenceSafeSummaryRecord,
  driverName: DbDriverSourceEvidenceSafeSummaryCandidateDriver
): DbDriverSourceEvidenceSafeSummaryRecord {
  assertBasicRecord(record);
  assertNoForbiddenRawPayload(record);
  assertNoUnsafeValues(record);
  const candidate = record.candidateSafeSummaries.find((item) => item.driverName === driverName);
  if (!candidate) throw new Error(`missing candidate ${driverName}`);
  if (candidate.reviewStatus !== "pass" || candidate.summaryStatus !== "pass") {
    throw new Error("future fixture must have reviewed safe-summary status");
  }
  if (!candidate.allowedSummary || !candidate.counts || !candidate.statuses) {
    throw new Error("future fixture requires allowed summary, counts, and statuses");
  }
  if (!candidate.packageVersion || !candidate.targetCommitSha || !candidate.prNumber || !candidate.targetBranch || !candidate.sourceCategory) {
    throw new Error("future fixture must bind package version, commit, PR, branch, and source category");
  }
  if (candidate.packageName !== driverName) throw new Error("future fixture package version mismatch");
  assertAllowedObjectKeys(candidate.allowedSummary, dbDriverSourceEvidenceAllowedSummaryFields, "allowedSummary");
  assertFutureCounts(candidate.counts);
  assertFutureStatuses(candidate.statuses);
  return record;
}

function assertBasicRecord(record: DbDriverSourceEvidenceSafeSummaryRecord) {
  if (record.schemaVersion !== "1.0.0") throw new Error("schemaVersion must be 1.0.0");
  if (record.harnessVersion !== "1.1.8") throw new Error("harnessVersion must be 1.1.8");
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("repository mismatch");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("prNumber must be current PR number");
  if (stalePrNumbers.includes(record.prNumber as (typeof stalePrNumbers)[number])) throw new Error("stale prNumber rejected");
  if (!/^[0-9a-f]{40}$/i.test(record.targetCommitSha)) throw new Error("targetCommitSha must be 40-char SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.baseCommitSha)) throw new Error("baseCommitSha must be 40-char SHA");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("targetCommitSha must differ from baseCommitSha");
  if (!record.targetBranch) throw new Error("targetBranch is required");
}

function assertCurrentNotReviewed(record: DbDriverSourceEvidenceSafeSummaryRecord) {
  if (record.safeSummaryContractStatus !== "contract_ready") throw new Error("safeSummaryContractStatus must be contract_ready");
  if (record.prNumber !== currentPrNumber) throw new Error("current safe-summary evidence must bind PR #60");
  if (record.stalenessPolicyStatus !== "policy_ready") throw new Error("stalenessPolicyStatus must be policy_ready");
  if (record.sourceEvidenceStatus !== "not_reviewed") throw new Error("sourceEvidenceStatus must remain not_reviewed");
  if (record.driverChoiceStatus !== "not_selected") throw new Error("driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("selectedDriver is forbidden");
  if (record.safeSummaryBindingStatus !== "not_reviewed") throw new Error("safeSummaryBindingStatus must remain not_reviewed");
  if (record.rawPayloadStatus !== "raw_payload_absent") throw new Error("rawPayloadStatus must remain raw_payload_absent");
  if (record.knownBlockersStatus !== "not_reviewed") throw new Error("knownBlockersStatus must remain not_reviewed");
  if (Array.isArray(record.knownBlockers)) throw new Error("knownBlockers array is forbidden in committed evidence");
  if (record.reviewStatus !== "not_reviewed") throw new Error("reviewStatus must remain not_reviewed");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("ownerApprovalStatus must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("finalApprovalGateStatus must remain blocked");
  const flags = [
    "packageJsonChangeAllowed",
    "pnpmLockChangeAllowed",
    "dbDriverDependencyAllowed",
    "realDbConnectionAllowed",
    "migrationExecutionAllowed",
    "liveDbIntegrationTestAllowed",
    "providerSdkApplyAllowed",
    "actualProductionDeploymentAllowed",
    "runtimeReadinessClaimAllowed",
    "productionReadinessClaimAllowed",
    "legalComplianceClaimAllowed",
    "youtubePolicyComplianceClaimAllowed"
  ] as const;
  for (const flag of flags) {
    if (record[flag]) throw new Error(`${flag} true is forbidden`);
  }
  if (record.forbiddenScopeStatus !== "pass") throw new Error("forbiddenScopeStatus must be pass");
}

function assertCurrentCandidate(candidate: DbDriverSourceEvidenceCandidateSafeSummary) {
  if (!dbDriverSourceEvidenceSafeSummaryCandidateDrivers.includes(candidate.driverName)) throw new Error("unknown candidate driver");
  if (candidate.packageName !== candidate.driverName) throw new Error("candidate package must match driver");
  if (candidate.summaryStatus !== "not_reviewed") throw new Error("candidate summaryStatus must be not_reviewed");
  if (candidate.allowedSummary !== null) throw new Error("candidate allowedSummary must be null in committed evidence");
  if (candidate.reviewStatus !== "not_reviewed") throw new Error("candidate reviewStatus must be not_reviewed");
  if (candidate.sourceCategory !== null || candidate.packageVersion !== null || candidate.targetCommitSha !== null || candidate.prNumber !== null || candidate.targetBranch !== null) {
    throw new Error("candidate source binding fields must be null in committed evidence");
  }
  if (candidate.counts !== null || candidate.statuses !== null) throw new Error("candidate counts/statuses must be null in committed evidence");
  if (candidate.knownBlockersStatus !== "not_reviewed") throw new Error("candidate knownBlockersStatus must be not_reviewed");
  if (Array.isArray(candidate.knownBlockers)) throw new Error("candidate knownBlockers array is forbidden in committed evidence");
  if (candidate.rawPayloadStatus !== "raw_payload_absent") throw new Error("candidate rawPayloadStatus must be raw_payload_absent");
  if (!candidate.refreshRequired) throw new Error("candidate refreshRequired must be true");
}

function assertNoForbiddenRawPayload(value: unknown, path = "record") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenRawPayload(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (dbDriverSourceEvidenceForbiddenRawFields.includes(key as (typeof dbDriverSourceEvidenceForbiddenRawFields)[number])) {
      throw new Error(`forbidden raw field detected: ${path}.${key}`);
    }
    assertNoForbiddenRawPayload(child, `${path}.${key}`);
  }
}

function assertNoUnsafeValues(value: unknown, path = "record") {
  if (typeof value === "string") {
    assertSafeText(value, path, /safeSummary$/i.test(path));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeValues(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["allowedSummaryFields", "allowedCountFields", "allowedStatusFields", "forbiddenRawFields", "forbiddenWording"].includes(key)) {
      continue;
    }
    assertSafeKey(key, `${path}.${key}`);
    assertNoUnsafeValues(child, `${path}.${key}`);
  }
}

function assertSafeKey(key: string, path: string) {
  if (dbDriverSourceEvidenceForbiddenRawFields.includes(key as (typeof dbDriverSourceEvidenceForbiddenRawFields)[number])) {
    throw new Error(`unsafe key detected at ${path}`);
  }
}

function assertSafeText(text: string, path: string, checkForbiddenWording: boolean) {
  const unsafePatterns = [
    /npm audit\s*\{/i,
    /npm audit --json/i,
    /auditReportVersion/i,
    /"vulnerabilities"\s*:/i,
    /\bvulnerabilities\b/i,
    /\bGHSA-[a-z0-9-]+/i,
    /\bCVE-20\d{2}-\d{4,}\b/i,
    /OSV raw/i,
    /npm registry raw/i,
    /dependency tree/i,
    /\bstdout\b/i,
    /\bstderr\b/i,
    /stack trace/i,
    /logs_url/i,
    /jobs_url/i,
    /https?:\/\/\S+/i,
    /postgres(?:ql)?:\/\/\S+/i,
    /DATABASE_URL|POSTGRES_URL|connectionString|databaseUrl|postgresUrl/i,
    /0x[0-9a-fA-F]{40}/,
    /ghp_[a-z0-9_]+/i,
    /sk-[a-z0-9_-]+/i,
    /xoxb-[a-z0-9-]+/i,
    /AKIA[0-9A-Z]+/i,
    /PRIVATE KEY/i,
    /BEGIN .*PRIVATE/i,
    /not_applicable_before_pr_creation|HEAD_SHA_PLACEHOLDER|BASE_SHA_PLACEHOLDER|current_pr_head|current_pr_base/i
  ];
  for (const staleValue of staleEvidenceValues) {
    if (text.includes(staleValue)) throw new Error(`stale evidence value rejected at ${path}`);
  }
  if (unsafePatterns.some((pattern) => pattern.test(text))) throw new Error(`unsafe evidence rejected at ${path}`);
  if (checkForbiddenWording) {
    const lower = text.toLowerCase();
    for (const word of dbDriverSourceEvidenceForbiddenWording) {
      if (lower.includes(word.toLowerCase())) throw new Error(`forbidden wording detected at ${path}: ${word}`);
    }
  }
}

function assertExactSet(actual: readonly string[], expected: readonly string[], name: string) {
  if (actual.length !== expected.length) throw new Error(`${name} size mismatch`);
  for (const item of expected) {
    if (!actual.includes(item)) throw new Error(`${name} missing ${item}`);
  }
}

function assertAllowedObjectKeys(value: Record<string, unknown>, allowed: readonly string[], name: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${name} contains forbidden key ${key}`);
  }
}

function assertFutureCounts(counts: DbDriverSourceEvidenceCounts) {
  assertAllowedObjectKeys(counts as unknown as Record<string, unknown>, dbDriverSourceEvidenceAllowedCountFields, "counts");
  for (const [key, value] of Object.entries(counts)) {
    if (!Number.isInteger(value)) throw new Error(`count ${key} must be integer`);
    if (value < 0) throw new Error(`count ${key} must be non-negative`);
  }
  if (counts.transitiveDependencyCount > 1000) throw new Error("transitiveDependencyCount over cap");
  if (counts.sourceCount < 1) throw new Error("sourceCount must be at least 1");
  const severityTotal =
    counts.criticalCount + counts.highCount + counts.moderateCount + counts.lowCount + counts.unknownSeverityCount;
  if (counts.advisoryCount !== severityTotal) throw new Error("advisoryCount mismatch");
}

function assertFutureStatuses(statuses: DbDriverSourceEvidenceStatuses) {
  assertAllowedObjectKeys(statuses as unknown as Record<string, unknown>, dbDriverSourceEvidenceAllowedStatusFields, "statuses");
  if (statuses.reviewStatus !== "pass") throw new Error("future reviewStatus must be pass");
  if (statuses.summaryStatus !== "pass") throw new Error("future summaryStatus must be pass");
  if (statuses.rawPayloadStatus !== "raw_payload_absent") throw new Error("future rawPayloadStatus must be raw_payload_absent");
  if (statuses.knownBlockersStatus !== "reviewed") throw new Error("future knownBlockersStatus must be reviewed");
  if (statuses.freshnessStatus !== "fresh") throw new Error("future freshnessStatus must be fresh");
}
