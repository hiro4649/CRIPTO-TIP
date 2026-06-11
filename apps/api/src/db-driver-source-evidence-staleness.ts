import { allowedDbDriverCandidateDrivers, type DbDriverCandidateDriverName, type DbDriverChoiceStatus } from "./db-driver-candidate-review-pack.js";
import { allowedDbDriverAdvisorySourceCategories, type DbDriverAdvisorySourceCategory } from "./db-driver-advisory-source-policy.js";

export const dbDriverSourceEvidenceExpiryWindows = {
  github_advisory_summary: 7,
  osv_summary: 7,
  npm_audit_safe_summary: 7,
  npm_registry_metadata: 14,
  maintainer_release_notes_summary: 30
} as const satisfies Record<DbDriverAdvisorySourceCategory, number>;

export const dbDriverSourceEvidenceInvalidationTriggers = [
  "target_commit_changed",
  "base_commit_changed",
  "pr_number_changed",
  "target_branch_changed",
  "package_name_changed",
  "package_version_changed",
  "source_category_policy_changed",
  "source_timestamp_expired",
  "source_expires_at_missing",
  "source_checked_at_missing",
  "package_json_changed",
  "pnpm_lock_changed",
  "dependency_graph_changed",
  "new_advisory_detected",
  "raw_output_detected",
  "selected_driver_wording_detected",
  "runtime_readiness_claim_detected",
  "production_readiness_claim_detected",
  "legal_compliance_claim_detected",
  "youtube_policy_compliance_claim_detected"
] as const;

export const dbDriverSourceEvidenceStalenessBlockers = [
  "staleness_policy_ready_not_review_approval",
  "source_evidence_not_reviewed",
  "source_timestamp_missing",
  "source_expires_at_missing",
  "source_timestamp_expired",
  "source_timestamp_future",
  "source_expiry_before_checked",
  "package_name_not_bound",
  "package_version_not_bound",
  "target_commit_not_bound",
  "target_commit_mismatch",
  "base_commit_not_bound",
  "base_commit_mismatch",
  "pr_number_not_bound",
  "pr_number_mismatch",
  "branch_not_bound",
  "branch_mismatch",
  "source_category_not_bound",
  "source_category_forbidden",
  "source_category_policy_changed",
  "package_json_change_forbidden",
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
  "selected_driver_forbidden",
  "known_blockers_not_reviewed",
  "unsafe_evidence_rejected",
  "raw_log_reference_rejected",
  "raw_advisory_output_rejected",
  "raw_audit_output_rejected",
  "raw_osv_output_rejected",
  "raw_npm_registry_output_rejected",
  "raw_dependency_tree_rejected",
  "future_fixture_only"
] as const;

export type DbDriverSourceEvidenceStalenessStatus = "policy_ready" | "not_reviewed" | "invalid";
export type DbDriverSourceEvidenceStatus = "not_reviewed" | "reviewed" | "fresh" | "pass" | "stale" | "invalid";
export type DbDriverSourceEvidenceBindingStatus = "not_reviewed" | "reviewed" | "pass" | "invalid";
export type DbDriverKnownBlockersStatus = "not_reviewed" | "reviewed" | "pass";
export type DbDriverStalenessStatus = "not_reviewed" | "fresh" | "stale" | "expired" | "invalid";
export type DbDriverSourceEvidenceRevalidationReason = (typeof dbDriverSourceEvidenceStalenessBlockers)[number];

export type DbDriverSourceEvidenceCandidateStaleness = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  stalenessStatus: DbDriverStalenessStatus;
  sourceCheckedAt: string | null;
  sourceExpiresAt: string | null;
  sourceCategory: DbDriverAdvisorySourceCategory | null;
  packageVersion: string | null;
  targetCommitSha: string | null;
  baseCommitSha: string | null;
  prNumber: number | null;
  targetBranch: string | null;
  revalidationRequired: boolean;
  revalidationReasons: DbDriverSourceEvidenceRevalidationReason[];
  safeSummary: string;
};

export type DbDriverSourceEvidenceStalenessContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverSourceEvidenceFreshFixtureContext = {
  packageName: DbDriverCandidateDriverName;
  packageVersion: string;
  sourceCategory: DbDriverAdvisorySourceCategory;
  targetCommitSha: string;
  baseCommitSha: string;
  prNumber: number;
  targetBranch: string;
  now: string;
};

export type DbDriverSourceEvidenceStalenessRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  stalenessPolicyStatus: DbDriverSourceEvidenceStalenessStatus;
  bindingDryRunStatus: "not_reviewed" | "pass" | "invalid";
  sourcePolicyStatus: "not_reviewed" | "policy_ready" | "pass" | "invalid";
  advisoryEnvelopeStatus: "not_reviewed" | "reviewed" | "pass" | "invalid";
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  candidateStaleness: DbDriverSourceEvidenceCandidateStaleness[];
  sourceEvidenceStatus: DbDriverSourceEvidenceStatus;
  sourceBindingStatus: DbDriverSourceEvidenceBindingStatus;
  sourceTimestampStatus: DbDriverSourceEvidenceBindingStatus;
  sourceFreshnessStatus: DbDriverSourceEvidenceStatus;
  sourceExpiryStatus: DbDriverSourceEvidenceStatus;
  packageNameBindingStatus: DbDriverSourceEvidenceBindingStatus;
  packageVersionBindingStatus: DbDriverSourceEvidenceBindingStatus;
  targetCommitBindingStatus: DbDriverSourceEvidenceBindingStatus;
  baseCommitBindingStatus: DbDriverSourceEvidenceBindingStatus;
  prNumberBindingStatus: DbDriverSourceEvidenceBindingStatus;
  branchBindingStatus: DbDriverSourceEvidenceBindingStatus;
  sourceCategoryBindingStatus: DbDriverSourceEvidenceBindingStatus;
  safeSummaryBindingStatus: DbDriverSourceEvidenceBindingStatus;
  knownBlockersStatus: DbDriverKnownBlockersStatus;
  knownBlockers: string[] | null;
  revalidationRequired: boolean;
  revalidationReasons: DbDriverSourceEvidenceRevalidationReason[];
  expiryWindows: Record<DbDriverAdvisorySourceCategory, number>;
  invalidationTriggers: string[];
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
};

type ValidationOptions = {
  allowFutureFreshFixture?: boolean;
  context?: DbDriverSourceEvidenceFreshFixtureContext;
};

export function createDefaultDbDriverSourceEvidenceStalenessRecord(
  context: DbDriverSourceEvidenceStalenessContext
): DbDriverSourceEvidenceStalenessRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    stalenessPolicyStatus: "policy_ready",
    bindingDryRunStatus: "not_reviewed",
    sourcePolicyStatus: "not_reviewed",
    advisoryEnvelopeStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    candidateStaleness: allowedDbDriverCandidateDrivers.map((driverName) => createDefaultCandidateStaleness(driverName)),
    sourceEvidenceStatus: "not_reviewed",
    sourceBindingStatus: "not_reviewed",
    sourceTimestampStatus: "not_reviewed",
    sourceFreshnessStatus: "not_reviewed",
    sourceExpiryStatus: "not_reviewed",
    packageNameBindingStatus: "not_reviewed",
    packageVersionBindingStatus: "not_reviewed",
    targetCommitBindingStatus: "not_reviewed",
    baseCommitBindingStatus: "not_reviewed",
    prNumberBindingStatus: "not_reviewed",
    branchBindingStatus: "not_reviewed",
    sourceCategoryBindingStatus: "not_reviewed",
    safeSummaryBindingStatus: "not_reviewed",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
    revalidationRequired: true,
    revalidationReasons: ["source_evidence_not_reviewed", "source_timestamp_missing", "package_version_not_bound", "target_commit_not_bound"],
    expiryWindows: { ...dbDriverSourceEvidenceExpiryWindows },
    invalidationTriggers: [...dbDriverSourceEvidenceInvalidationTriggers],
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
      "DB driver source evidence staleness policy is ready, but source evidence is not reviewed. It requires revalidation before any driver, dependency, package, lockfile, real DB, runtime, production, legal, or YouTube policy action.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverSourceEvidenceStalenessRecord(record: DbDriverSourceEvidenceStalenessRecord) {
  validateDbDriverSourceEvidenceStalenessRecord(record);
  return record;
}

export function validateFutureFreshDbDriverSourceEvidenceFixture(
  record: DbDriverSourceEvidenceStalenessRecord,
  context: DbDriverSourceEvidenceFreshFixtureContext
) {
  validateDbDriverSourceEvidenceStalenessRecord(record, { allowFutureFreshFixture: true, context });
  return record;
}

export function assertNoUnsafeDbDriverSourceEvidenceStaleness(value: unknown) {
  scanUnsafeEvidence(value);
}

function createDefaultCandidateStaleness(driverName: DbDriverCandidateDriverName): DbDriverSourceEvidenceCandidateStaleness {
  return {
    driverName,
    packageName: driverName,
    stalenessStatus: "not_reviewed",
    sourceCheckedAt: null,
    sourceExpiresAt: null,
    sourceCategory: null,
    packageVersion: null,
    targetCommitSha: null,
    baseCommitSha: null,
    prNumber: null,
    targetBranch: null,
    revalidationRequired: true,
    revalidationReasons: ["source_evidence_not_reviewed"],
    safeSummary: `${driverName} source evidence is not reviewed. Future source evidence must be rebound to the target PR, commit, package version, source category, and expiry window.`
  };
}

function validateDbDriverSourceEvidenceStalenessRecord(record: DbDriverSourceEvidenceStalenessRecord, options: ValidationOptions = {}) {
  assertNoUnsafeDbDriverSourceEvidenceStaleness(record);
  assertBasicRecord(record);
  assertCandidateDrivers(record.candidateDrivers);
  assertExpiryWindows(record.expiryWindows);
  assertInvalidationTriggers(record.invalidationTriggers);
  assertCandidateStaleness(record.candidateStaleness, options);
  assertPermissionFlagsFalse(record);
  assertSafeSummaryDoesNotClaimReview(record.safeSummary);
  if (record.driverChoiceStatus !== "not_selected") throw new Error("DB driver source evidence staleness driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("DB driver source evidence staleness must not select a driver");
  if (record.forbiddenScopeStatus !== "pass") throw new Error("DB driver source evidence staleness forbiddenScopeStatus must pass");
  if (!options.allowFutureFreshFixture) assertCurrentStatuses(record);
  else assertFutureFreshRecord(record, options.context);
}

function assertBasicRecord(record: DbDriverSourceEvidenceStalenessRecord) {
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver source evidence staleness repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("DB driver source evidence staleness prNumber must be bound to the current PR");
  if (!record.targetBranch) throw new Error("DB driver source evidence staleness targetBranch is required");
  if (!isSha(record.targetCommitSha)) throw new Error("DB driver source evidence staleness targetCommitSha must be a 40-character SHA");
  if (!isSha(record.baseCommitSha)) throw new Error("DB driver source evidence staleness baseCommitSha must be a 40-character SHA");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("DB driver source evidence staleness targetCommitSha must not equal baseCommitSha");
  if (record.headSha !== undefined && record.headSha !== record.targetCommitSha) throw new Error("DB driver source evidence staleness headSha must match targetCommitSha");
  if (record.baseSha !== undefined && record.baseSha !== record.baseCommitSha) throw new Error("DB driver source evidence staleness baseSha must match baseCommitSha");
  if (!record.createdAt.endsWith("Z")) throw new Error("DB driver source evidence staleness createdAt must be UTC");
}

function assertCurrentStatuses(record: DbDriverSourceEvidenceStalenessRecord) {
  if (record.stalenessPolicyStatus !== "policy_ready") throw new Error("DB driver source evidence staleness policy must be policy_ready");
  const notReviewedFields: Array<[string, string]> = [
    ["bindingDryRunStatus", record.bindingDryRunStatus],
    ["sourcePolicyStatus", record.sourcePolicyStatus],
    ["advisoryEnvelopeStatus", record.advisoryEnvelopeStatus],
    ["sourceEvidenceStatus", record.sourceEvidenceStatus],
    ["sourceBindingStatus", record.sourceBindingStatus],
    ["sourceTimestampStatus", record.sourceTimestampStatus],
    ["sourceFreshnessStatus", record.sourceFreshnessStatus],
    ["sourceExpiryStatus", record.sourceExpiryStatus],
    ["packageNameBindingStatus", record.packageNameBindingStatus],
    ["packageVersionBindingStatus", record.packageVersionBindingStatus],
    ["targetCommitBindingStatus", record.targetCommitBindingStatus],
    ["baseCommitBindingStatus", record.baseCommitBindingStatus],
    ["prNumberBindingStatus", record.prNumberBindingStatus],
    ["branchBindingStatus", record.branchBindingStatus],
    ["sourceCategoryBindingStatus", record.sourceCategoryBindingStatus],
    ["safeSummaryBindingStatus", record.safeSummaryBindingStatus],
    ["knownBlockersStatus", record.knownBlockersStatus]
  ];
  for (const [field, status] of notReviewedFields) {
    if (status !== "not_reviewed") throw new Error(`DB driver source evidence staleness ${field} must remain not_reviewed`);
  }
  if (record.knownBlockers !== null) throw new Error("DB driver source evidence staleness knownBlockers must remain null");
  if (record.revalidationRequired !== true) throw new Error("DB driver source evidence staleness must require revalidation");
  for (const reason of ["source_evidence_not_reviewed", "source_timestamp_missing", "package_version_not_bound", "target_commit_not_bound"] as const) {
    if (!record.revalidationReasons.includes(reason)) throw new Error(`DB driver source evidence staleness missing revalidation reason ${reason}`);
  }
}

function assertFutureFreshRecord(record: DbDriverSourceEvidenceStalenessRecord, context: DbDriverSourceEvidenceFreshFixtureContext | undefined) {
  if (!context) throw new Error("future DB driver source evidence fixture requires validation context");
  if (record.stalenessPolicyStatus !== "policy_ready") throw new Error("future DB driver source evidence fixture must keep policy_ready");
  for (const [field, status] of [
    ["sourceEvidenceStatus", record.sourceEvidenceStatus],
    ["sourceBindingStatus", record.sourceBindingStatus],
    ["sourceTimestampStatus", record.sourceTimestampStatus],
    ["sourceFreshnessStatus", record.sourceFreshnessStatus],
    ["sourceExpiryStatus", record.sourceExpiryStatus],
    ["packageNameBindingStatus", record.packageNameBindingStatus],
    ["packageVersionBindingStatus", record.packageVersionBindingStatus],
    ["targetCommitBindingStatus", record.targetCommitBindingStatus],
    ["baseCommitBindingStatus", record.baseCommitBindingStatus],
    ["prNumberBindingStatus", record.prNumberBindingStatus],
    ["branchBindingStatus", record.branchBindingStatus],
    ["sourceCategoryBindingStatus", record.sourceCategoryBindingStatus],
    ["safeSummaryBindingStatus", record.safeSummaryBindingStatus]
  ] as const) {
    if (!(status === "reviewed" || status === "fresh" || status === "pass")) {
      throw new Error(`future DB driver source evidence fixture ${field} must be reviewed/fresh/pass`);
    }
  }
  if (record.knownBlockersStatus !== "reviewed") throw new Error("future DB driver source evidence fixture knownBlockersStatus must be reviewed");
  if (!Array.isArray(record.knownBlockers)) throw new Error("future DB driver source evidence fixture knownBlockers must be reviewed array");
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (!Array.isArray(candidateDrivers) || candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver source evidence staleness must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) throw new Error("DB driver source evidence staleness candidateDrivers must be exactly pg then postgres");
  }
}

function assertCandidateStaleness(candidates: DbDriverSourceEvidenceCandidateStaleness[], options: ValidationOptions) {
  if (!Array.isArray(candidates) || candidates.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver source evidence staleness must include pg and postgres candidate staleness");
  }
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!allowedDbDriverCandidateDrivers.includes(candidate.driverName)) throw new Error("DB driver source evidence staleness candidate driver is invalid");
    if (seen.has(candidate.driverName)) throw new Error("DB driver source evidence staleness candidates must not duplicate drivers");
    seen.add(candidate.driverName);
    if (candidate.packageName !== candidate.driverName) throw new Error("DB driver source evidence staleness packageName must match driverName");
    assertSafeSummaryDoesNotClaimReview(candidate.safeSummary);
    if (!options.allowFutureFreshFixture) assertCurrentCandidateStaleness(candidate);
    else assertFutureCandidateStaleness(candidate, options.context);
  }
  assertCandidateDrivers([...seen]);
}

function assertCurrentCandidateStaleness(candidate: DbDriverSourceEvidenceCandidateStaleness) {
  if (candidate.stalenessStatus !== "not_reviewed") throw new Error("candidate source evidence staleness must remain not_reviewed");
  if (candidate.sourceCheckedAt !== null) throw new Error("candidate sourceCheckedAt must remain null");
  if (candidate.sourceExpiresAt !== null) throw new Error("candidate sourceExpiresAt must remain null");
  if (candidate.sourceCategory !== null) throw new Error("candidate sourceCategory must remain null");
  if (candidate.packageVersion !== null) throw new Error("candidate packageVersion must remain null");
  if (candidate.targetCommitSha !== null) throw new Error("candidate targetCommitSha must remain null");
  if (candidate.baseCommitSha !== null) throw new Error("candidate baseCommitSha must remain null");
  if (candidate.prNumber !== null) throw new Error("candidate prNumber must remain null");
  if (candidate.targetBranch !== null) throw new Error("candidate targetBranch must remain null");
  if (candidate.revalidationRequired !== true) throw new Error("candidate source evidence staleness must require revalidation");
  if (!candidate.revalidationReasons.includes("source_evidence_not_reviewed")) {
    throw new Error("candidate source evidence staleness must include source_evidence_not_reviewed");
  }
}

function assertFutureCandidateStaleness(candidate: DbDriverSourceEvidenceCandidateStaleness, context: DbDriverSourceEvidenceFreshFixtureContext | undefined) {
  if (!context) throw new Error("future DB driver source evidence fixture requires context");
  if (candidate.driverName !== context.packageName) {
    assertCurrentCandidateStaleness(candidate);
    return;
  }
  if (candidate.stalenessStatus !== "fresh") throw new Error("future source evidence fixture candidate stalenessStatus must be fresh");
  if (candidate.packageName !== context.packageName) throw new Error("future source evidence fixture package name mismatch");
  if (candidate.packageVersion !== context.packageVersion || !isExactSemver(candidate.packageVersion)) {
    throw new Error("future source evidence fixture package version must be exact semver");
  }
  if (candidate.targetCommitSha !== context.targetCommitSha) throw new Error("future source evidence fixture target commit mismatch");
  if (candidate.baseCommitSha !== context.baseCommitSha) throw new Error("future source evidence fixture base commit mismatch");
  if (candidate.prNumber !== context.prNumber) throw new Error("future source evidence fixture PR number mismatch");
  if (candidate.targetBranch !== context.targetBranch) throw new Error("future source evidence fixture target branch mismatch");
  if (candidate.sourceCategory !== context.sourceCategory || !allowedDbDriverAdvisorySourceCategories.includes(candidate.sourceCategory)) {
    throw new Error("future source evidence fixture source category mismatch");
  }
  assertTimestampPair(candidate.sourceCheckedAt, candidate.sourceExpiresAt, context);
  if (candidate.revalidationRequired !== false) throw new Error("future source evidence fixture revalidationRequired must be false");
  if (candidate.revalidationReasons.length !== 0) throw new Error("future source evidence fixture revalidationReasons must be empty");
}

function assertTimestampPair(checkedAt: string | null, expiresAt: string | null, context: DbDriverSourceEvidenceFreshFixtureContext) {
  if (!checkedAt) throw new Error("future source evidence fixture source_checked_at missing");
  if (!expiresAt) throw new Error("future source evidence fixture source_expires_at missing");
  const checked = parseIsoUtc(checkedAt, "source_checked_at");
  const expires = parseIsoUtc(expiresAt, "source_expires_at");
  const now = parseIsoUtc(context.now, "now");
  if (checked > now) throw new Error("future source evidence fixture source_timestamp_future");
  if (expires <= checked) throw new Error("future source evidence fixture source_expiry_before_checked");
  if (expires < now) throw new Error("future source evidence fixture source_timestamp_expired");
  const maxMs = dbDriverSourceEvidenceExpiryWindows[context.sourceCategory] * 24 * 60 * 60 * 1000;
  if (now - checked > maxMs) throw new Error("future source evidence fixture source_timestamp_expired");
  if (expires - checked > maxMs) throw new Error("future source evidence fixture source_category_policy_changed");
}

function assertExpiryWindows(windows: Record<DbDriverAdvisorySourceCategory, number>) {
  for (const category of allowedDbDriverAdvisorySourceCategories) {
    if (windows[category] !== dbDriverSourceEvidenceExpiryWindows[category]) {
      throw new Error(`DB driver source evidence staleness expiry window mismatch for ${category}`);
    }
  }
}

function assertInvalidationTriggers(triggers: string[]) {
  for (const trigger of dbDriverSourceEvidenceInvalidationTriggers) {
    if (!triggers.includes(trigger)) throw new Error(`DB driver source evidence staleness missing trigger ${trigger}`);
  }
}

function assertPermissionFlagsFalse(record: DbDriverSourceEvidenceStalenessRecord) {
  const falseKeys: Array<keyof DbDriverSourceEvidenceStalenessRecord> = [
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
    if (record[key] !== false) throw new Error(`DB driver source evidence staleness ${String(key)} must remain false`);
  }
}

function assertSafeSummaryDoesNotClaimReview(value: string) {
  const forbiddenSummaryPatterns = [
    /\bclean\b/i,
    /\bno\s+vulnerabilities\b/i,
    /\bready\s+for\s+dependency\b/i,
    /\bdependency\s+ready\b/i,
    /\bfresh\s+enough\b/i,
    /\bfresh\s+enough\s+to\s+select\b/i,
    /\bvalid\s+for\s+selection\b/i,
    /\bselection\s+ready\b/i,
    /\breview\s+complete\b/i,
    /\bapproved\b/i,
    /\bapproved\s+source\b/i,
    /\bsource\s+approved\b/i,
    /\badvisory\s+clean\b/i,
    /\bno\s+advisory\b/i,
    /\bpass\b/i,
    /\bfresh\s+source\b/i,
    /\breviewed\s+source\b/i,
    /\bsafe\s+dependency\b/i,
    /\bselected\b/i,
    /\bdriver\s+ready\b/i,
    /\binstall\s+ready\b/i,
    /\bproduction\s+ready\b/i,
    /\bproduction\s+safe\b/i,
    /\bpolicy\s+safe\b/i,
    /\blegally\s+safe\b/i,
    /\bpolicy\s+compliant\b/i,
    /\bno\s+known\s+blockers\b/i,
    /\bno\s+blockers\b/i
  ];
  for (const pattern of forbiddenSummaryPatterns) {
    if (pattern.test(value)) throw new Error("DB driver source evidence staleness safeSummary must not claim review pass, selection, approval, freshness, readiness, or compliance");
  }
}

function scanUnsafeEvidence(value: unknown, path = "sourceStaleness") {
  if (value === null || value === undefined) return;
  if (path.includes("invalidationTriggers") || path.includes("revalidationReasons")) return;
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
    /api[_-]?key\s*[:=]/i,
    /not_applicable_before_pr_creation/i,
    /HEAD_SHA_PLACEHOLDER|BASE_SHA_PLACEHOLDER/i,
    /current_pr_head|current_pr_base/i,
    /recorded in GitHub PR body after push/i,
    /local evidence collected before push/i
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
    /^jobsUrl$/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver source evidence staleness rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver source evidence staleness rejected at ${path}`);
  }
}

function parseIsoUtc(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw new Error(`future DB driver source evidence fixture ${label} must use ISO UTC seconds`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`future DB driver source evidence fixture ${label} must be valid`);
  return parsed;
}

function isSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function isExactSemver(value: string | null) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}
