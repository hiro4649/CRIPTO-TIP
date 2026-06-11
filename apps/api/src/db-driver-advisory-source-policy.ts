import { allowedDbDriverCandidateDrivers, type DbDriverCandidateDriverName, type DbDriverChoiceStatus } from "./db-driver-candidate-review-pack.js";

export const allowedDbDriverAdvisorySourceCategories = [
  "npm_registry_metadata",
  "github_advisory_summary",
  "osv_summary",
  "npm_audit_safe_summary",
  "maintainer_release_notes_summary"
] as const;

export const forbiddenDbDriverAdvisorySourceCategories = [
  "github_raw_logs",
  "npm_audit_raw_json",
  "github_advisory_raw_response",
  "osv_raw_response",
  "snyk_raw_response",
  "terminal_stdout",
  "terminal_stderr",
  "dependency_tree_raw",
  "private_url",
  "db_connection_string",
  "provider_raw_response"
] as const;

export const dbDriverAdvisorySourcePolicyBlockers = [
  "source_policy_not_reviewed",
  "source_binding_not_reviewed",
  "source_timestamp_not_reviewed",
  "source_freshness_not_reviewed",
  "safe_summary_policy_required",
  "raw_output_forbidden",
  "advisory_envelope_not_reviewed",
  "known_blockers_not_reviewed",
  "owner_approval_not_approved",
  "final_approval_gate_blocked",
  "driver_not_selected",
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
  "raw_dependency_tree_rejected",
  "source_category_forbidden",
  "source_timestamp_invalid",
  "source_binding_mismatch"
] as const;

export type DbDriverAdvisorySourceCategory = (typeof allowedDbDriverAdvisorySourceCategories)[number];
export type DbDriverForbiddenAdvisorySourceCategory = (typeof forbiddenDbDriverAdvisorySourceCategories)[number];
export type DbDriverAdvisorySourcePolicyStatus = "not_reviewed" | "policy_ready" | "invalid";
export type DbDriverSourceBindingStatus = "not_reviewed" | "reviewed" | "pass" | "invalid";
export type DbDriverSourceTimestampStatus = "not_reviewed" | "reviewed" | "pass" | "invalid";
export type DbDriverSourceFreshnessStatus = "not_reviewed" | "fresh" | "pass" | "stale" | "invalid";
export type DbDriverSourceSafeSummaryPolicyStatus = "safe_summary_only" | "invalid";
export type DbDriverSourceRawOutputPolicyStatus = "raw_output_forbidden" | "raw_allowed" | "invalid";

export type DbDriverCandidateSourcePolicy = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  sourcePolicyStatus: DbDriverAdvisorySourcePolicyStatus;
  allowedSourceCategories: DbDriverAdvisorySourceCategory[];
  forbiddenSourceCategories: DbDriverForbiddenAdvisorySourceCategory[];
  sourceBindingStatus: DbDriverSourceBindingStatus;
  sourceTimestampStatus: DbDriverSourceTimestampStatus;
  sourceFreshnessStatus: DbDriverSourceFreshnessStatus;
  safeSummaryPolicyStatus: DbDriverSourceSafeSummaryPolicyStatus;
  rawOutputPolicyStatus: DbDriverSourceRawOutputPolicyStatus;
  lastReviewedAt: string | null;
  expiresAt: string | null;
  refreshRequired: boolean;
  safeSummary: string;
};

export type DbDriverAdvisorySourcePolicyContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverAdvisorySourcePolicyRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  sourcePolicyStatus: DbDriverAdvisorySourcePolicyStatus;
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  allowedSourceCategories: DbDriverAdvisorySourceCategory[];
  candidateSourcePolicies: DbDriverCandidateSourcePolicy[];
  sourceBindingStatus: DbDriverSourceBindingStatus;
  sourceTimestampStatus: DbDriverSourceTimestampStatus;
  sourceFreshnessStatus: DbDriverSourceFreshnessStatus;
  safeSummaryPolicyStatus: DbDriverSourceSafeSummaryPolicyStatus;
  rawOutputPolicyStatus: DbDriverSourceRawOutputPolicyStatus;
  advisoryEnvelopeStatus: "not_reviewed" | "reviewed" | "pass" | "invalid";
  knownBlockersStatus: "not_reviewed" | "reviewed" | "pass";
  knownBlockers: string[] | null;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: "blocked" | "approved_for_dependency_pr";
  dependencyPrTemplateStatus: "template_ready" | "blocked" | "invalid";
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
};

type ValidationOptions = {
  allowFutureReviewedFixture?: boolean;
};

export function createDefaultDbDriverAdvisorySourcePolicyRecord(
  context: DbDriverAdvisorySourcePolicyContext
): DbDriverAdvisorySourcePolicyRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    sourcePolicyStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    allowedSourceCategories: [...allowedDbDriverAdvisorySourceCategories],
    candidateSourcePolicies: allowedDbDriverCandidateDrivers.map((driverName) => createDefaultCandidateSourcePolicy(driverName)),
    sourceBindingStatus: "not_reviewed",
    sourceTimestampStatus: "not_reviewed",
    sourceFreshnessStatus: "not_reviewed",
    safeSummaryPolicyStatus: "safe_summary_only",
    rawOutputPolicyStatus: "raw_output_forbidden",
    advisoryEnvelopeStatus: "not_reviewed",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
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
    safeSummary:
      "DB driver advisory source policy is not reviewed. It defines future safe source categories and binding rules only; no driver, package, source review, runtime, production, legal, or YouTube policy action is authorized.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverAdvisorySourcePolicyRecord(record: DbDriverAdvisorySourcePolicyRecord) {
  validateDbDriverAdvisorySourcePolicyRecord(record);
  return record;
}

export function validateFutureReviewedDbDriverAdvisorySourcePolicyFixture(record: DbDriverAdvisorySourcePolicyRecord) {
  validateDbDriverAdvisorySourcePolicyRecord(record, { allowFutureReviewedFixture: true });
  return record;
}

export function assertNoUnsafeDbDriverAdvisorySourcePolicyEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function createDefaultCandidateSourcePolicy(driverName: DbDriverCandidateDriverName): DbDriverCandidateSourcePolicy {
  return {
    driverName,
    packageName: driverName,
    sourcePolicyStatus: "not_reviewed",
    allowedSourceCategories: [...allowedDbDriverAdvisorySourceCategories],
    forbiddenSourceCategories: [...forbiddenDbDriverAdvisorySourceCategories],
    sourceBindingStatus: "not_reviewed",
    sourceTimestampStatus: "not_reviewed",
    sourceFreshnessStatus: "not_reviewed",
    safeSummaryPolicyStatus: "safe_summary_only",
    rawOutputPolicyStatus: "raw_output_forbidden",
    lastReviewedAt: null,
    expiresAt: null,
    refreshRequired: true,
    safeSummary: `${driverName} advisory source policy is not reviewed. Future source review must use bound safe summaries only.`
  };
}

function validateDbDriverAdvisorySourcePolicyRecord(
  record: DbDriverAdvisorySourcePolicyRecord,
  options: ValidationOptions = {}
) {
  assertNoUnsafeDbDriverAdvisorySourcePolicyEvidence(record);
  assertCandidateDrivers(record.candidateDrivers);
  assertAllowedSourceCategories(record.allowedSourceCategories);
  assertCandidateSourcePolicies(record.candidateSourcePolicies, options);
  assertPermissionFlagsFalse(record);
  assertSafeSummaryDoesNotClaimReview(record.safeSummary);
  if (record.driverChoiceStatus !== "not_selected") throw new Error("DB driver advisory source policy driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("DB driver advisory source policy must not select a driver");
  if (record.safeSummaryPolicyStatus !== "safe_summary_only") throw new Error("DB driver advisory source policy must use safe_summary_only");
  if (record.rawOutputPolicyStatus !== "raw_output_forbidden") throw new Error("DB driver advisory source policy must forbid raw output");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("DB driver advisory source policy ownerApprovalStatus must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("DB driver advisory source policy finalApprovalGateStatus must remain blocked");
  if (record.dependencyPrTemplateStatus !== "template_ready") throw new Error("DB driver advisory source policy dependencyPrTemplateStatus must remain template_ready");
  if (record.forbiddenScopeStatus !== "pass") throw new Error("DB driver advisory source policy forbiddenScopeStatus must pass");
  assertCurrentStatuses(record, options);
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (!Array.isArray(candidateDrivers) || candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory source policy must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) throw new Error("DB driver advisory source policy candidateDrivers must be exactly pg then postgres");
  }
}

function assertAllowedSourceCategories(categories: string[]) {
  if (!Array.isArray(categories) || categories.length !== allowedDbDriverAdvisorySourceCategories.length) {
    throw new Error("DB driver advisory source policy must list the exact allowed source categories");
  }
  for (const [index, category] of allowedDbDriverAdvisorySourceCategories.entries()) {
    if (categories[index] !== category) throw new Error("DB driver advisory source policy allowed source categories must match expected order");
  }
  for (const category of categories) {
    if ((forbiddenDbDriverAdvisorySourceCategories as readonly string[]).includes(category)) {
      throw new Error("DB driver advisory source policy must not allow forbidden source categories");
    }
  }
}

function assertForbiddenSourceCategories(categories: string[]) {
  if (!Array.isArray(categories) || categories.length !== forbiddenDbDriverAdvisorySourceCategories.length) {
    throw new Error("DB driver advisory source policy must list the exact forbidden source categories");
  }
  for (const [index, category] of forbiddenDbDriverAdvisorySourceCategories.entries()) {
    if (categories[index] !== category) throw new Error("DB driver advisory source policy forbidden source categories must match expected order");
  }
}

function assertCandidateSourcePolicies(policies: DbDriverCandidateSourcePolicy[], options: ValidationOptions) {
  if (!Array.isArray(policies) || policies.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory source policy must include pg and postgres source policies");
  }
  const seen = new Set<string>();
  for (const policy of policies) {
    if (!allowedDbDriverCandidateDrivers.includes(policy.driverName)) throw new Error("DB driver advisory source policy candidate driver is invalid");
    if (seen.has(policy.driverName)) throw new Error("DB driver advisory source policy candidate policies must not duplicate drivers");
    seen.add(policy.driverName);
    if (policy.packageName !== policy.driverName) throw new Error("DB driver advisory source policy packageName must match driverName");
    assertAllowedSourceCategories(policy.allowedSourceCategories);
    assertForbiddenSourceCategories(policy.forbiddenSourceCategories);
    assertSafeSummaryDoesNotClaimReview(policy.safeSummary);
    if (policy.safeSummaryPolicyStatus !== "safe_summary_only") throw new Error("candidate advisory source safe summary policy must remain safe_summary_only");
    if (policy.rawOutputPolicyStatus !== "raw_output_forbidden") throw new Error("candidate advisory source raw output policy must remain raw_output_forbidden");
    if (!options.allowFutureReviewedFixture) {
      if (policy.sourcePolicyStatus !== "not_reviewed") throw new Error("candidate advisory source policy must remain not_reviewed");
      if (policy.sourceBindingStatus !== "not_reviewed") throw new Error("candidate advisory source binding must remain not_reviewed");
      if (policy.sourceTimestampStatus !== "not_reviewed") throw new Error("candidate advisory source timestamp must remain not_reviewed");
      if (policy.sourceFreshnessStatus !== "not_reviewed") throw new Error("candidate advisory source freshness must remain not_reviewed");
      if (policy.lastReviewedAt !== null) throw new Error("candidate advisory source lastReviewedAt must remain null");
      if (policy.expiresAt !== null) throw new Error("candidate advisory source expiresAt must remain null");
      if (policy.refreshRequired !== true) throw new Error("candidate advisory source refreshRequired must remain true");
    } else {
      assertReviewedTimestampIfPresent(policy.lastReviewedAt, { allowFuture: false });
      assertReviewedTimestampIfPresent(policy.expiresAt, { allowFuture: true });
    }
  }
  assertCandidateDrivers([...seen]);
}

function assertCurrentStatuses(record: DbDriverAdvisorySourcePolicyRecord, options: ValidationOptions) {
  if (!options.allowFutureReviewedFixture) {
    if (record.sourcePolicyStatus !== "not_reviewed") throw new Error("DB driver advisory source policy status must remain not_reviewed");
    if (record.sourceBindingStatus !== "not_reviewed") throw new Error("DB driver advisory source binding must remain not_reviewed");
    if (record.sourceTimestampStatus !== "not_reviewed") throw new Error("DB driver advisory source timestamp must remain not_reviewed");
    if (record.sourceFreshnessStatus !== "not_reviewed") throw new Error("DB driver advisory source freshness must remain not_reviewed");
    if (record.advisoryEnvelopeStatus !== "not_reviewed") throw new Error("DB driver advisory envelope status must remain not_reviewed");
    if (record.knownBlockersStatus !== "not_reviewed") throw new Error("DB driver advisory known blockers status must remain not_reviewed");
    if (record.knownBlockers !== null) throw new Error("DB driver advisory known blockers must remain null until reviewed");
  }
}

function assertPermissionFlagsFalse(record: DbDriverAdvisorySourcePolicyRecord) {
  const falseKeys: Array<keyof DbDriverAdvisorySourcePolicyRecord> = [
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
  ];
  for (const key of falseKeys) {
    if (record[key] !== false) throw new Error(`DB driver advisory source policy ${String(key)} must remain false`);
  }
}

function assertReviewedTimestampIfPresent(value: string | null, options: { allowFuture: boolean }) {
  if (value === null) return;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("future reviewed advisory source timestamp must be ISO UTC");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw new Error("future reviewed advisory source timestamp must use ISO UTC seconds");
  }
  if (!options.allowFuture && timestamp > Date.now()) throw new Error("future reviewed advisory source timestamp must not be in the future");
}

function scanUnsafeEvidence(value: unknown, path = "advisorySource") {
  if (value === null || value === undefined) return;
  if (path.includes("forbiddenSourceCategories")) return;
  if (typeof value === "string") {
    assertSafeString(value, path);
    return;
  }
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeEvidence(item, `${path}[${index}]`));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    assertSafeString(key, `${path}.key`);
    scanUnsafeEvidence(item, `${path}.${key}`);
  }
}

function assertSafeSummaryDoesNotClaimReview(value: string) {
  const forbiddenSummaryPatterns = [
    /\bclean\b/i,
    /\bno\s+vulnerabilities\b/i,
    /\bsecure\b/i,
    /\bapproved\b/i,
    /\bsafe\s+to\s+install\b/i,
    /\bsafe\s+dependency\b/i,
    /\bdependency\s+approved\b/i,
    /\bproduction\s+ready\b/i,
    /\blegal(?:ly)?\s+compliant\b/i,
    /\bpolicy\s+compliant\b/i,
    /\bpass\b/i,
    /\brecommended\b/i,
    /\bwinner\b/i,
    /\bpreferred\b/i,
    /\bselected\b/i
  ];
  for (const pattern of forbiddenSummaryPatterns) {
    if (pattern.test(value)) throw new Error("DB driver advisory source policy safeSummary must not claim review pass, selection, approval, readiness, or compliance");
  }
}

function assertSafeString(value: string, path: string) {
  const unsafePatterns = [
    /Bearer\s+/i,
    /https?:\/\//i,
    /postgres(?:ql)?:\/\//i,
    /DATABASE_URL|POSTGRES_URL/i,
    /connection[_ -]?string/i,
    /databaseUrl|postgresUrl/i,
    /ghp_[a-z0-9_]+/i,
    /sk-[a-z0-9_-]+/i,
    /xoxb-[a-z0-9-]+/i,
    /AKIA[0-9A-Z]+/i,
    /0x[0-9a-fA-F]{40}/,
    /BEGIN .*PRIVATE/i,
    /\bstdout\b|\bstderr\b|stack[_ -]?trace/i,
    /\bstack\s+trace\b/i,
    /raw[_ -]?logs?/i,
    /gh run view --log/i,
    /logs_url|jobs_url|file_contents/i,
    /dependency[_ -]?tree|raw dependency tree/i,
    /npm audit --json/i,
    /auditReportVersion/i,
    /\bvulnerabilities\b/i,
    /raw[_ -]?audit/i,
    /raw[_ -]?advisory/i,
    /raw[_ -]?terminal/i,
    /GitHub Advisory Database raw/i,
    /github advisory (api|raw) response/i,
    /OSV raw/i,
    /Snyk raw/i,
    /npm registry raw/i,
    /GHSA-/i,
    /CVE-20\d{2}-/i,
    /provider[_ -]?response/i,
    /secret\s*[:=]/i,
    /token\s*[:=]/i,
    /api[_-]?key\s*[:=]/i
  ];
  const unsafeKeyPatterns = [
    /password/i,
    /clientSecret/i,
    /client_secret/i,
    /secret[_-]?(value|token|key)/i,
    /secret(value|token|key)/i,
    /refreshToken|accessToken/i,
    /apiKey|api_key|api-key/i,
    /database[_-]?url/i,
    /postgres[_-]?url/i,
    /^rawAuditJson$/i,
    /^rawAuditOutput$/i,
    /^rawAdvisoryJson$/i,
    /^rawAdvisoryResponse$/i,
    /^rawDependencyTree$/i,
    /^rawTerminalOutput$/i,
    /^stdout$/i,
    /^stderr$/i,
    /^stackTrace$/i,
    /^logsUrl$/i,
    /^jobsUrl$/i,
    /^advisoryApiResponse$/i,
    /^npmAuditJson$/i,
    /^githubAdvisoryResponse$/i,
    /^osvRawResponse$/i,
    /^snykRawResponse$/i,
    /^npmRegistryRawMetadata$/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver advisory source evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver advisory source evidence rejected at ${path}`);
  }
}
