import { allowedDbDriverCandidateDrivers, type DbDriverCandidateDriverName, type DbDriverChoiceStatus } from "./db-driver-candidate-review-pack.js";
import {
  allowedDbDriverAdvisorySourceCategories,
  forbiddenDbDriverAdvisorySourceCategories,
  type DbDriverAdvisorySourceCategory,
  type DbDriverForbiddenAdvisorySourceCategory,
  type DbDriverSourceFreshnessStatus,
  type DbDriverSourceRawOutputPolicyStatus,
  type DbDriverSourceTimestampStatus
} from "./db-driver-advisory-source-policy.js";

export const dbDriverAdvisoryBindingDryRunBlockers = [
  "binding_not_reviewed",
  "source_policy_not_reviewed",
  "advisory_envelope_not_reviewed",
  "driver_not_selected",
  "source_category_not_reviewed",
  "source_binding_not_reviewed",
  "source_timestamp_not_reviewed",
  "source_freshness_not_reviewed",
  "package_name_not_bound",
  "package_version_not_bound",
  "target_commit_not_bound",
  "pr_number_not_bound",
  "branch_not_bound",
  "safe_summary_not_bound",
  "known_blockers_not_reviewed",
  "owner_approval_not_approved",
  "final_approval_gate_blocked",
  "dependency_template_only",
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
  "source_category_forbidden",
  "source_timestamp_invalid",
  "source_binding_mismatch",
  "package_version_invalid",
  "future_fixture_only"
] as const;

export type DbDriverAdvisoryBindingDryRunStatus = "not_reviewed" | "not_ready" | "pass" | "invalid";
export type DbDriverAdvisoryBindingStatus = "not_reviewed" | "reviewed" | "pass" | "invalid";
export type DbDriverPackageBindingStatus = "not_reviewed" | "reviewed" | "pass" | "invalid";
export type DbDriverKnownBlockersStatus = "not_reviewed" | "reviewed" | "pass";

export type DbDriverAdvisoryCandidateBinding = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  bindingStatus: DbDriverAdvisoryBindingStatus;
  sourceCategory: DbDriverAdvisorySourceCategory | DbDriverForbiddenAdvisorySourceCategory | null;
  sourceName: string | null;
  sourceCheckedAt: string | null;
  sourceExpiresAt: string | null;
  targetCommitSha: string | null;
  prNumber: number | null;
  targetBranch: string | null;
  packageVersion: string | null;
  safeSummary: string;
  rawOutputPolicyStatus: DbDriverSourceRawOutputPolicyStatus;
  knownBlockersStatus: DbDriverKnownBlockersStatus;
  knownBlockers: string[] | null;
  refreshRequired: boolean;
};

export type DbDriverAdvisoryBindingDryRunContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverAdvisoryBindingDryRunValidationContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  packageName: DbDriverCandidateDriverName;
  packageVersion: string;
  sourceCategory: DbDriverAdvisorySourceCategory;
  freshnessWindowDays: number;
  now: string;
};

export type DbDriverAdvisoryBindingDryRunRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  bindingDryRunStatus: DbDriverAdvisoryBindingDryRunStatus;
  sourcePolicyStatus: "not_reviewed" | "reviewed" | "pass" | "invalid";
  advisoryEnvelopeStatus: "not_reviewed" | "reviewed" | "pass" | "invalid";
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  candidateBindings: DbDriverAdvisoryCandidateBinding[];
  sourceCategoryStatus: DbDriverAdvisoryBindingStatus;
  sourceBindingStatus: DbDriverAdvisoryBindingStatus;
  sourceTimestampStatus: DbDriverSourceTimestampStatus;
  sourceFreshnessStatus: DbDriverSourceFreshnessStatus;
  packageNameBindingStatus: DbDriverPackageBindingStatus;
  packageVersionBindingStatus: DbDriverPackageBindingStatus;
  targetCommitBindingStatus: DbDriverPackageBindingStatus;
  prNumberBindingStatus: DbDriverPackageBindingStatus;
  branchBindingStatus: DbDriverPackageBindingStatus;
  safeSummaryBindingStatus: DbDriverPackageBindingStatus;
  rawOutputPolicyStatus: DbDriverSourceRawOutputPolicyStatus;
  knownBlockersStatus: DbDriverKnownBlockersStatus;
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
  headSha?: string;
  baseSha?: string;
  ciRunId?: string;
  qualityGateRunId?: string;
  qualityGateArtifactId?: string;
  productCiStatus?: string;
  qualityGateStatus?: string;
};

type ValidationOptions = {
  allowFutureReviewedFixture?: boolean;
  context?: DbDriverAdvisoryBindingDryRunValidationContext;
};

export function createDefaultDbDriverAdvisoryBindingDryRunRecord(
  context: DbDriverAdvisoryBindingDryRunContext
): DbDriverAdvisoryBindingDryRunRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    bindingDryRunStatus: "not_reviewed",
    sourcePolicyStatus: "not_reviewed",
    advisoryEnvelopeStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    candidateBindings: allowedDbDriverCandidateDrivers.map((driverName) => createDefaultCandidateBinding(driverName)),
    sourceCategoryStatus: "not_reviewed",
    sourceBindingStatus: "not_reviewed",
    sourceTimestampStatus: "not_reviewed",
    sourceFreshnessStatus: "not_reviewed",
    packageNameBindingStatus: "not_reviewed",
    packageVersionBindingStatus: "not_reviewed",
    targetCommitBindingStatus: "not_reviewed",
    prNumberBindingStatus: "not_reviewed",
    branchBindingStatus: "not_reviewed",
    safeSummaryBindingStatus: "not_reviewed",
    rawOutputPolicyStatus: "raw_output_forbidden",
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
      "DB driver advisory binding dry run is not reviewed. It defines future binding validation only; no driver, dependency, package, lockfile, real DB, runtime, production, legal, or YouTube policy action is authorized.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverAdvisoryBindingDryRunRecord(record: DbDriverAdvisoryBindingDryRunRecord) {
  validateDbDriverAdvisoryBindingDryRunRecord(record);
  return record;
}

export function validateFutureReviewedDbDriverAdvisoryBindingFixture(
  record: DbDriverAdvisoryBindingDryRunRecord,
  context: DbDriverAdvisoryBindingDryRunValidationContext
) {
  validateDbDriverAdvisoryBindingDryRunRecord(record, { allowFutureReviewedFixture: true, context });
  return record;
}

export function assertNoUnsafeDbDriverAdvisoryBindingDryRunEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function createDefaultCandidateBinding(driverName: DbDriverCandidateDriverName): DbDriverAdvisoryCandidateBinding {
  return {
    driverName,
    packageName: driverName,
    bindingStatus: "not_reviewed",
    sourceCategory: null,
    sourceName: null,
    sourceCheckedAt: null,
    sourceExpiresAt: null,
    targetCommitSha: null,
    prNumber: null,
    targetBranch: null,
    packageVersion: null,
    safeSummary: `${driverName} advisory source binding is not reviewed. Future binding must use safe summaries only.`,
    rawOutputPolicyStatus: "raw_output_forbidden",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
    refreshRequired: true
  };
}

function validateDbDriverAdvisoryBindingDryRunRecord(
  record: DbDriverAdvisoryBindingDryRunRecord,
  options: ValidationOptions = {}
) {
  assertNoUnsafeDbDriverAdvisoryBindingDryRunEvidence(record);
  assertBasicRecord(record);
  assertCandidateDrivers(record.candidateDrivers);
  assertCandidateBindings(record.candidateBindings, options);
  assertPermissionFlagsFalse(record);
  assertSafeSummaryDoesNotClaimReview(record.safeSummary);
  if (record.driverChoiceStatus !== "not_selected") throw new Error("DB driver advisory binding dry-run driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("DB driver advisory binding dry-run must not select a driver");
  if (record.rawOutputPolicyStatus !== "raw_output_forbidden") throw new Error("DB driver advisory binding dry-run must forbid raw output");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("DB driver advisory binding dry-run ownerApprovalStatus must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("DB driver advisory binding dry-run finalApprovalGateStatus must remain blocked");
  if (record.dependencyPrTemplateStatus !== "template_ready") throw new Error("DB driver advisory binding dry-run dependencyPrTemplateStatus must remain template_ready");
  if (record.forbiddenScopeStatus !== "pass") throw new Error("DB driver advisory binding dry-run forbiddenScopeStatus must pass");
  if (!options.allowFutureReviewedFixture) assertCurrentStatuses(record);
  else assertFutureReviewedRecord(record, options.context);
}

function assertBasicRecord(record: DbDriverAdvisoryBindingDryRunRecord) {
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver advisory binding dry-run repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.prNumber) || record.prNumber < 0) throw new Error("DB driver advisory binding dry-run prNumber must be non-negative");
  if (!record.targetBranch) throw new Error("DB driver advisory binding dry-run targetBranch is required");
  if (!isSha(record.targetCommitSha)) throw new Error("DB driver advisory binding dry-run targetCommitSha must be a 40-character SHA");
  if (!isSha(record.baseCommitSha)) throw new Error("DB driver advisory binding dry-run baseCommitSha must be a 40-character SHA");
  if (!record.createdAt.endsWith("Z")) throw new Error("DB driver advisory binding dry-run createdAt must be UTC");
}

function assertCurrentStatuses(record: DbDriverAdvisoryBindingDryRunRecord) {
  const notReviewedFields: Array<[string, string]> = [
    ["bindingDryRunStatus", record.bindingDryRunStatus],
    ["sourcePolicyStatus", record.sourcePolicyStatus],
    ["advisoryEnvelopeStatus", record.advisoryEnvelopeStatus],
    ["sourceCategoryStatus", record.sourceCategoryStatus],
    ["sourceBindingStatus", record.sourceBindingStatus],
    ["sourceTimestampStatus", record.sourceTimestampStatus],
    ["sourceFreshnessStatus", record.sourceFreshnessStatus],
    ["packageNameBindingStatus", record.packageNameBindingStatus],
    ["packageVersionBindingStatus", record.packageVersionBindingStatus],
    ["targetCommitBindingStatus", record.targetCommitBindingStatus],
    ["prNumberBindingStatus", record.prNumberBindingStatus],
    ["branchBindingStatus", record.branchBindingStatus],
    ["safeSummaryBindingStatus", record.safeSummaryBindingStatus],
    ["knownBlockersStatus", record.knownBlockersStatus]
  ];
  for (const [field, status] of notReviewedFields) {
    if (status !== "not_reviewed") throw new Error(`DB driver advisory binding dry-run ${field} must remain not_reviewed`);
  }
  if (record.knownBlockers !== null) throw new Error("DB driver advisory binding dry-run knownBlockers must remain null");
}

function assertFutureReviewedRecord(
  record: DbDriverAdvisoryBindingDryRunRecord,
  context: DbDriverAdvisoryBindingDryRunValidationContext | undefined
) {
  if (!context) throw new Error("future DB driver advisory binding fixture requires validation context");
  if (record.bindingDryRunStatus !== "pass") throw new Error("future DB driver advisory binding fixture must use pass status");
  for (const [field, status] of [
    ["sourcePolicyStatus", record.sourcePolicyStatus],
    ["advisoryEnvelopeStatus", record.advisoryEnvelopeStatus],
    ["sourceCategoryStatus", record.sourceCategoryStatus],
    ["sourceBindingStatus", record.sourceBindingStatus],
    ["sourceTimestampStatus", record.sourceTimestampStatus],
    ["sourceFreshnessStatus", record.sourceFreshnessStatus],
    ["packageNameBindingStatus", record.packageNameBindingStatus],
    ["packageVersionBindingStatus", record.packageVersionBindingStatus],
    ["targetCommitBindingStatus", record.targetCommitBindingStatus],
    ["prNumberBindingStatus", record.prNumberBindingStatus],
    ["branchBindingStatus", record.branchBindingStatus],
    ["safeSummaryBindingStatus", record.safeSummaryBindingStatus]
  ] as const) {
    if (!(status === "reviewed" || status === "pass" || status === "fresh")) {
      throw new Error(`future DB driver advisory binding fixture ${field} must be reviewed/pass/fresh`);
    }
  }
  if (record.knownBlockersStatus !== "reviewed") throw new Error("future DB driver advisory binding fixture knownBlockersStatus must be reviewed");
  if (!Array.isArray(record.knownBlockers)) throw new Error("future DB driver advisory binding fixture knownBlockers must be reviewed array");
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (!Array.isArray(candidateDrivers) || candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory binding dry-run must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) throw new Error("DB driver advisory binding dry-run candidateDrivers must be exactly pg then postgres");
  }
}

function assertCandidateBindings(bindings: DbDriverAdvisoryCandidateBinding[], options: ValidationOptions) {
  if (!Array.isArray(bindings) || bindings.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory binding dry-run must include pg and postgres candidate bindings");
  }
  const seen = new Set<string>();
  for (const binding of bindings) {
    if (!allowedDbDriverCandidateDrivers.includes(binding.driverName)) throw new Error("DB driver advisory binding dry-run candidate driver is invalid");
    if (seen.has(binding.driverName)) throw new Error("DB driver advisory binding dry-run candidate bindings must not duplicate drivers");
    seen.add(binding.driverName);
    if (binding.packageName !== binding.driverName) throw new Error("DB driver advisory binding dry-run packageName must match driverName");
    if (binding.rawOutputPolicyStatus !== "raw_output_forbidden") throw new Error("candidate DB driver advisory binding must forbid raw output");
    assertSafeSummaryDoesNotClaimReview(binding.safeSummary);
    if (!options.allowFutureReviewedFixture) assertCurrentCandidateBinding(binding);
    else assertFutureCandidateBinding(binding, options.context);
  }
  assertCandidateDrivers([...seen]);
}

function assertCurrentCandidateBinding(binding: DbDriverAdvisoryCandidateBinding) {
  if (binding.bindingStatus !== "not_reviewed") throw new Error("candidate DB driver advisory binding status must remain not_reviewed");
  if (binding.sourceCategory !== null) throw new Error("candidate DB driver advisory sourceCategory must remain null");
  if (binding.sourceName !== null) throw new Error("candidate DB driver advisory sourceName must remain null");
  if (binding.sourceCheckedAt !== null) throw new Error("candidate DB driver advisory sourceCheckedAt must remain null");
  if (binding.sourceExpiresAt !== null) throw new Error("candidate DB driver advisory sourceExpiresAt must remain null");
  if (binding.targetCommitSha !== null) throw new Error("candidate DB driver advisory targetCommitSha must remain null");
  if (binding.prNumber !== null) throw new Error("candidate DB driver advisory prNumber must remain null");
  if (binding.targetBranch !== null) throw new Error("candidate DB driver advisory targetBranch must remain null");
  if (binding.packageVersion !== null) throw new Error("candidate DB driver advisory packageVersion must remain null");
  if (binding.knownBlockersStatus !== "not_reviewed") throw new Error("candidate DB driver advisory knownBlockersStatus must remain not_reviewed");
  if (binding.knownBlockers !== null) throw new Error("candidate DB driver advisory knownBlockers must remain null");
  if (binding.refreshRequired !== true) throw new Error("candidate DB driver advisory binding must require refresh");
}

function assertFutureCandidateBinding(
  binding: DbDriverAdvisoryCandidateBinding,
  context: DbDriverAdvisoryBindingDryRunValidationContext | undefined
) {
  if (!context) throw new Error("future DB driver advisory binding fixture requires context");
  if (binding.driverName !== context.packageName) {
    assertCurrentCandidateBinding(binding);
    return;
  }
  if (binding.bindingStatus !== "pass") throw new Error("future DB driver advisory binding fixture candidate bindingStatus must be pass");
  if (binding.packageName !== context.packageName || binding.driverName !== context.packageName) {
    throw new Error("future DB driver advisory binding fixture package name must match context and candidate driver");
  }
  if (binding.sourceCategory !== context.sourceCategory) throw new Error("future DB driver advisory binding fixture source category mismatch");
  if (!allowedDbDriverAdvisorySourceCategories.includes(binding.sourceCategory)) {
    throw new Error("future DB driver advisory binding fixture source category must be allowed");
  }
  if ((forbiddenDbDriverAdvisorySourceCategories as readonly string[]).includes(binding.sourceCategory)) {
    throw new Error("future DB driver advisory binding fixture source category is forbidden");
  }
  if (binding.targetCommitSha !== context.targetCommitSha) throw new Error("future DB driver advisory binding fixture target commit mismatch");
  if (binding.prNumber !== context.prNumber) throw new Error("future DB driver advisory binding fixture PR number mismatch");
  if (binding.targetBranch !== context.targetBranch) throw new Error("future DB driver advisory binding fixture target branch mismatch");
  if (binding.packageVersion !== context.packageVersion || !isExactSemver(binding.packageVersion)) {
    throw new Error("future DB driver advisory binding fixture package version must be exact semver");
  }
  assertTimestampPair(binding.sourceCheckedAt, binding.sourceExpiresAt, context);
  if (binding.knownBlockersStatus !== "reviewed") throw new Error("future DB driver advisory binding fixture knownBlockersStatus must be reviewed");
  if (!Array.isArray(binding.knownBlockers)) throw new Error("future DB driver advisory binding fixture knownBlockers must be reviewed array");
  if (binding.refreshRequired !== false) throw new Error("future DB driver advisory binding fixture refreshRequired must be false");
}

function assertTimestampPair(
  checkedAt: string | null,
  expiresAt: string | null,
  context: DbDriverAdvisoryBindingDryRunValidationContext
) {
  if (!checkedAt || !expiresAt) throw new Error("future DB driver advisory binding fixture timestamps are required");
  const checked = parseIsoUtc(checkedAt, "source_checked_at");
  const expires = parseIsoUtc(expiresAt, "source_expires_at");
  const now = parseIsoUtc(context.now, "now");
  if (checked > now) throw new Error("future DB driver advisory binding fixture source_checked_at must not be in the future");
  if (expires <= checked) throw new Error("future DB driver advisory binding fixture source_expires_at must be after source_checked_at");
  const maxMs = context.freshnessWindowDays * 24 * 60 * 60 * 1000;
  if (expires - checked > maxMs) throw new Error("future DB driver advisory binding fixture source_expires_at exceeds freshness window");
  if (expires <= now) throw new Error("future DB driver advisory binding fixture source_expires_at is expired");
}

function assertPermissionFlagsFalse(record: DbDriverAdvisoryBindingDryRunRecord) {
  const falseKeys: Array<keyof DbDriverAdvisoryBindingDryRunRecord> = [
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
    if (record[key] !== false) throw new Error(`DB driver advisory binding dry-run ${String(key)} must remain false`);
  }
}

function scanUnsafeEvidence(value: unknown, path = "advisoryBinding") {
  if (value === null || value === undefined) return;
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
    /\bpass\b/i,
    /\brecommended\b/i,
    /\bwinner\b/i,
    /\bbest\s+choice\b/i,
    /\bpreferred\b/i,
    /\bselected\b/i,
    /\bproduction\s+ready\b/i,
    /\blegally\s+safe\b/i,
    /\bpolicy\s+compliant\b/i,
    /\bapproved\s+binding\b/i,
    /\bbinding\s+approved\b/i,
    /\bsource\s+approved\b/i,
    /\badvisory\s+approved\b/i,
    /\bdependency\s+ready\b/i,
    /\bdriver\s+ready\b/i,
    /\bsafe\s+driver\b/i,
    /\binstall\s+approved\b/i,
    /\bclean\s+source\b/i,
    /\bclean\s+advisory\b/i,
    /\bno\s+advisory\b/i,
    /\bno\s+blockers\b/i,
    /\bno\s+known\s+blockers\b/i,
    /\bproduction\s+safe\b/i,
    /\bpolicy\s+safe\b/i
  ];
  for (const pattern of forbiddenSummaryPatterns) {
    if (pattern.test(value)) throw new Error("DB driver advisory binding dry-run safeSummary must not claim review pass, selection, approval, readiness, or compliance");
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
    /refreshToken|accessToken/i,
    /apiKey|api_key|api-key/i,
    /database[_-]?url/i,
    /postgres[_-]?url/i,
    /^rawAuditJson$/i,
    /^rawAuditOutput$/i,
    /^rawAdvisoryJson$/i,
    /^rawAdvisoryResponse$/i,
    /^rawOsvResponse$/i,
    /^rawNpmRegistryMetadata$/i,
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
      if (pattern.test(value)) throw new Error(`unsafe DB driver advisory binding evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver advisory binding evidence rejected at ${path}`);
  }
}

function parseIsoUtc(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw new Error(`future DB driver advisory binding fixture ${label} must use ISO UTC seconds`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`future DB driver advisory binding fixture ${label} must be valid`);
  return parsed;
}

function isSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function isExactSemver(value: string | null) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}
