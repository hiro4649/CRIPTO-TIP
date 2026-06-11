import {
  allowedDbDriverCandidateDrivers,
  validateCurrentDbDriverCandidateReviewPackRecord,
  type DbDriverCandidateDriverName,
  type DbDriverCandidateReviewPackRecord,
  type DbDriverCandidateStatus,
  type DbDriverChoiceStatus,
  type DbDriverFinalApprovalGateStatus
} from "./db-driver-candidate-review-pack.js";

export const dbDriverCandidateReviewFreshnessRefreshReasons = [
  "license_review_missing",
  "supply_chain_review_missing",
  "security_advisory_review_missing",
  "package_metadata_not_reviewed",
  "version_policy_not_selected",
  "package_diff_missing",
  "lockfile_review_missing",
  "secret_boundary_not_reviewed"
] as const;

export const dbDriverCandidateReviewFreshnessBlockers = [
  "candidate_review_not_ready",
  ...dbDriverCandidateReviewFreshnessRefreshReasons,
  "owner_approval_not_approved",
  "final_approval_gate_blocked",
  "dependency_template_only",
  "candidate_evidence_stale",
  "candidate_review_expired",
  "selected_driver_forbidden",
  "candidate_selection_wording_forbidden",
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
  "raw_log_reference_rejected"
] as const;

export type DbDriverCandidateReviewFreshnessStatus = "not_ready" | "fresh" | "stale" | "invalid";
export type DbDriverReviewFreshnessStatus = "not_reviewed" | "fresh" | "stale" | "invalid";
export type DbDriverMissingEvidenceFreshnessStatus = "missing" | "fresh" | "stale" | "invalid";
export type DbDriverVersionPolicyFreshnessStatus = "not_selected" | "fresh" | "stale" | "invalid";
export type DbDriverCandidateReviewFreshnessRefreshReason =
  (typeof dbDriverCandidateReviewFreshnessRefreshReasons)[number];

export type DbDriverCandidateFreshness = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  candidateStatus: DbDriverCandidateStatus;
  lastReviewedAt: string | null;
  expiresAt: string | null;
  freshnessStatus: DbDriverCandidateReviewFreshnessStatus;
  refreshRequired: boolean;
  refreshReasons: DbDriverCandidateReviewFreshnessRefreshReason[];
  safeSummary: string;
};

export type DbDriverCandidateReviewExpiryPolicy = {
  licenseReviewExpiresAfterDays: 30;
  supplyChainReviewExpiresAfterDays: 30;
  securityAdvisoryReviewExpiresAfterDays: 7;
  packageMetadataReviewExpiresAfterDays: 14;
  versionPolicyReviewExpiresAfterDays: 30;
  packageAndLockfileEvidenceInvalidatesOnPackageFileChange: true;
  ownerApprovalNeverInferred: true;
};

export type DbDriverCandidateReviewStaleEvidencePolicy = {
  staleEvidenceCannotSelectDriver: true;
  staleEvidenceCannotApproveOwnerReview: true;
  staleEvidenceCannotAuthorizeDependency: true;
  rawLogsRemainForbidden: true;
  safeArtifactsAndMachineEvidenceOnly: true;
};

export type DbDriverCandidateReviewFreshnessContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverCandidateReviewFreshnessValidationContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
};

export type DbDriverCandidateReviewFreshnessRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  freshnessStatus: DbDriverCandidateReviewFreshnessStatus;
  reviewPackStatus: "not_ready" | "ready_for_owner_review" | "invalid";
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  candidateFreshness: DbDriverCandidateFreshness[];
  licenseReviewFreshnessStatus: DbDriverReviewFreshnessStatus;
  supplyChainReviewFreshnessStatus: DbDriverReviewFreshnessStatus;
  securityAdvisoryFreshnessStatus: DbDriverReviewFreshnessStatus;
  packageMetadataFreshnessStatus: DbDriverReviewFreshnessStatus;
  versionPolicyFreshnessStatus: DbDriverVersionPolicyFreshnessStatus;
  packageDiffFreshnessStatus: DbDriverMissingEvidenceFreshnessStatus;
  lockfileFreshnessStatus: DbDriverMissingEvidenceFreshnessStatus;
  secretBoundaryFreshnessStatus: DbDriverReviewFreshnessStatus;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: DbDriverFinalApprovalGateStatus;
  dependencyPrTemplateStatus: "template_ready" | "blocked" | "invalid";
  refreshRequired: boolean;
  refreshReasons: DbDriverCandidateReviewFreshnessRefreshReason[];
  expiryPolicy: DbDriverCandidateReviewExpiryPolicy;
  staleEvidencePolicy: DbDriverCandidateReviewStaleEvidencePolicy;
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
  allowFutureFreshFixture?: boolean;
};

export function createDefaultDbDriverCandidateReviewFreshnessRecord(
  context: DbDriverCandidateReviewFreshnessContext
): DbDriverCandidateReviewFreshnessRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    freshnessStatus: "not_ready",
    reviewPackStatus: "not_ready",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    candidateFreshness: allowedDbDriverCandidateDrivers.map((driverName) =>
      createDefaultCandidateFreshness(driverName)
    ),
    licenseReviewFreshnessStatus: "not_reviewed",
    supplyChainReviewFreshnessStatus: "not_reviewed",
    securityAdvisoryFreshnessStatus: "not_reviewed",
    packageMetadataFreshnessStatus: "not_reviewed",
    versionPolicyFreshnessStatus: "not_selected",
    packageDiffFreshnessStatus: "missing",
    lockfileFreshnessStatus: "missing",
    secretBoundaryFreshnessStatus: "not_reviewed",
    ownerApprovalStatus: "not_approved",
    finalApprovalGateStatus: "blocked",
    dependencyPrTemplateStatus: "template_ready",
    refreshRequired: true,
    refreshReasons: [...dbDriverCandidateReviewFreshnessRefreshReasons],
    expiryPolicy: createDefaultExpiryPolicy(),
    staleEvidencePolicy: createDefaultStaleEvidencePolicy(),
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
      "DB driver candidate freshness evidence is not ready. Candidate package reviews must be refreshed before any future dependency review; no package, lockfile, runtime, production, legal, or YouTube policy action is authorized.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverCandidateReviewFreshnessRecord(
  record: DbDriverCandidateReviewFreshnessRecord
) {
  validateDbDriverCandidateReviewFreshnessRecord(record);
  return record;
}

export function validateFutureFreshDbDriverCandidateReviewFreshnessFixture(
  record: DbDriverCandidateReviewFreshnessRecord
) {
  validateDbDriverCandidateReviewFreshnessRecord(record, { allowFutureFreshFixture: true });
  return record;
}

export function validateCommittedDbDriverCandidateReviewFreshnessEvidence(
  record: DbDriverCandidateReviewFreshnessRecord,
  context: DbDriverCandidateReviewFreshnessValidationContext
) {
  validateCurrentDbDriverCandidateReviewFreshnessRecord(record);
  if (record.repository !== context.repository) {
    throw new Error("committed DB driver candidate review freshness repository must match context");
  }
  if (record.prNumber !== context.prNumber) {
    throw new Error("committed DB driver candidate review freshness prNumber must match context");
  }
  if (record.targetBranch !== context.targetBranch) {
    throw new Error("committed DB driver candidate review freshness targetBranch must match context");
  }
  if (record.targetCommitSha !== context.targetCommitSha) {
    throw new Error("committed DB driver candidate review freshness targetCommitSha must match context");
  }
  if (record.baseCommitSha !== context.baseCommitSha) {
    throw new Error("committed DB driver candidate review freshness baseCommitSha must match context");
  }
  if (record.targetCommitSha === record.baseCommitSha) {
    throw new Error("committed DB driver candidate review freshness targetCommitSha must differ from baseCommitSha");
  }
  return record;
}

export function validateDbDriverCandidateReviewFreshnessAgainstPack(
  freshnessRecord: DbDriverCandidateReviewFreshnessRecord,
  reviewPackRecord: DbDriverCandidateReviewPackRecord
) {
  validateCurrentDbDriverCandidateReviewFreshnessRecord(freshnessRecord);
  validateCurrentDbDriverCandidateReviewPackRecord(reviewPackRecord);
  if (freshnessRecord.repository !== reviewPackRecord.repository) {
    throw new Error("DB driver candidate freshness repository must match review pack");
  }
  if (freshnessRecord.targetBranch !== reviewPackRecord.targetBranch) {
    throw new Error("DB driver candidate freshness targetBranch must match review pack");
  }
  if (freshnessRecord.baseCommitSha !== reviewPackRecord.baseCommitSha) {
    throw new Error("DB driver candidate freshness baseCommitSha must match review pack");
  }
  if (freshnessRecord.driverChoiceStatus !== reviewPackRecord.driverChoiceStatus) {
    throw new Error("DB driver candidate freshness driverChoiceStatus must match review pack");
  }
  if (freshnessRecord.selectedDriver !== reviewPackRecord.selectedDriver) {
    throw new Error("DB driver candidate freshness selectedDriver must match review pack");
  }
  assertCandidateDrivers(freshnessRecord.candidateDrivers);
  assertCandidateDrivers(reviewPackRecord.candidateDrivers);
  return freshnessRecord;
}

export function assertNoUnsafeDbDriverCandidateReviewFreshnessEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function validateDbDriverCandidateReviewFreshnessRecord(
  record: DbDriverCandidateReviewFreshnessRecord,
  options: ValidationOptions = {}
) {
  assertNoUnsafeDbDriverCandidateReviewFreshnessEvidence(record);
  assertBasicFreshnessRecord(record);
  assertCandidateDrivers(record.candidateDrivers);
  assertCandidateFreshness(record.candidateFreshness, options);
  assertExpiryPolicy(record.expiryPolicy);
  assertStaleEvidencePolicy(record.staleEvidencePolicy);
  assertPermissionFlagsFalse(record);
  if (record.driverChoiceStatus !== "not_selected") {
    throw new Error("DB driver candidate freshness driverChoiceStatus must remain not_selected");
  }
  if (record.selectedDriver !== null) {
    throw new Error("DB driver candidate freshness must not select a driver");
  }
  if (record.reviewPackStatus !== "not_ready") {
    throw new Error("DB driver candidate freshness reviewPackStatus must remain not_ready");
  }
  if (record.ownerApprovalStatus !== "not_approved") {
    throw new Error("DB driver candidate freshness ownerApprovalStatus must remain not_approved");
  }
  if (record.finalApprovalGateStatus !== "blocked") {
    throw new Error("DB driver candidate freshness finalApprovalGateStatus must remain blocked");
  }
  if (record.dependencyPrTemplateStatus !== "template_ready") {
    throw new Error("DB driver candidate freshness dependencyPrTemplateStatus must remain template_ready");
  }
  if (record.forbiddenScopeStatus !== "pass") {
    throw new Error("DB driver candidate freshness forbiddenScopeStatus must pass");
  }
  assertFreshnessStatuses(record, options);
  if (!options.allowFutureFreshFixture) {
    assertRefreshReasons(record.refreshReasons);
  }
  assertCandidateSummaryDoesNotClaimSelection(record.safeSummary);
}

function createDefaultCandidateFreshness(driverName: DbDriverCandidateDriverName): DbDriverCandidateFreshness {
  return {
    driverName,
    packageName: driverName,
    candidateStatus: "candidate",
    lastReviewedAt: null,
    expiresAt: null,
    freshnessStatus: "not_ready",
    refreshRequired: true,
    refreshReasons: [...dbDriverCandidateReviewFreshnessRefreshReasons],
    safeSummary: `${driverName} freshness evidence is not ready. Review evidence must be refreshed before any future dependency review.`
  };
}

function createDefaultExpiryPolicy(): DbDriverCandidateReviewExpiryPolicy {
  return {
    licenseReviewExpiresAfterDays: 30,
    supplyChainReviewExpiresAfterDays: 30,
    securityAdvisoryReviewExpiresAfterDays: 7,
    packageMetadataReviewExpiresAfterDays: 14,
    versionPolicyReviewExpiresAfterDays: 30,
    packageAndLockfileEvidenceInvalidatesOnPackageFileChange: true,
    ownerApprovalNeverInferred: true
  };
}

function createDefaultStaleEvidencePolicy(): DbDriverCandidateReviewStaleEvidencePolicy {
  return {
    staleEvidenceCannotSelectDriver: true,
    staleEvidenceCannotApproveOwnerReview: true,
    staleEvidenceCannotAuthorizeDependency: true,
    rawLogsRemainForbidden: true,
    safeArtifactsAndMachineEvidenceOnly: true
  };
}

function assertBasicFreshnessRecord(record: DbDriverCandidateReviewFreshnessRecord) {
  if (record.schemaVersion !== "1.0.0") throw new Error("DB driver candidate freshness schemaVersion must be 1.0.0");
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver candidate freshness repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("DB driver candidate freshness prNumber is required");
  if (!record.targetBranch) throw new Error("DB driver candidate freshness targetBranch is required");
  if (!isSha(record.targetCommitSha)) throw new Error("DB driver candidate freshness targetCommitSha must be a 40-character SHA");
  if (!isSha(record.baseCommitSha)) throw new Error("DB driver candidate freshness baseCommitSha must be a 40-character SHA");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("DB driver candidate freshness targetCommitSha must differ from baseCommitSha");
  if (!record.createdAt.endsWith("Z")) throw new Error("DB driver candidate freshness createdAt must be UTC");
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver candidate freshness must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) {
      throw new Error("DB driver candidate freshness candidateDrivers must be exactly pg then postgres");
    }
  }
}

function assertCandidateFreshness(candidateFreshness: DbDriverCandidateFreshness[], options: ValidationOptions) {
  if (candidateFreshness.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver candidate freshness must include pg and postgres freshness");
  }
  const seen = new Set<string>();
  for (const candidate of candidateFreshness) {
    if (seen.has(candidate.driverName)) {
      throw new Error(`duplicate DB driver candidate freshness rejected for ${candidate.driverName}`);
    }
    seen.add(candidate.driverName);
    if (!(allowedDbDriverCandidateDrivers as readonly string[]).includes(candidate.driverName)) {
      throw new Error("DB driver candidate freshness rejects extra candidate driver");
    }
    if (candidate.packageName !== candidate.driverName) {
      throw new Error("DB driver candidate freshness packageName must match driverName");
    }
    if (candidate.candidateStatus !== "candidate") {
      throw new Error("DB driver candidate freshness candidateStatus must remain candidate");
    }
    if (options.allowFutureFreshFixture) {
      if (candidate.freshnessStatus !== "fresh") {
        throw new Error("future DB driver candidate freshness fixture must mark candidate freshness fresh");
      }
      if (!candidate.lastReviewedAt || !candidate.expiresAt) {
        throw new Error("future DB driver candidate freshness fixture must include review and expiry timestamps");
      }
      if (candidate.refreshRequired !== false) {
        throw new Error("future DB driver candidate freshness fixture must not require refresh");
      }
    } else {
      if (candidate.lastReviewedAt !== null) {
        throw new Error("current DB driver candidate freshness must not commit candidate lastReviewedAt");
      }
      if (candidate.expiresAt !== null) {
        throw new Error("current DB driver candidate freshness must not commit candidate expiresAt");
      }
      if (candidate.freshnessStatus !== "not_ready") {
        throw new Error("current DB driver candidate freshness candidate status must remain not_ready");
      }
      if (candidate.refreshRequired !== true) {
        throw new Error("current DB driver candidate freshness candidate refreshRequired must remain true");
      }
      assertRefreshReasons(candidate.refreshReasons);
    }
    assertCandidateSummaryDoesNotClaimSelection(candidate.safeSummary);
  }
  for (const driverName of allowedDbDriverCandidateDrivers) {
    if (!seen.has(driverName)) throw new Error(`DB driver candidate freshness missing ${driverName}`);
  }
}

function assertFreshnessStatuses(record: DbDriverCandidateReviewFreshnessRecord, options: ValidationOptions) {
  if (options.allowFutureFreshFixture) {
    if (record.freshnessStatus !== "fresh") throw new Error("future DB driver candidate freshness fixture must be fresh");
    if (record.licenseReviewFreshnessStatus !== "fresh") throw new Error("future license freshness fixture must be fresh");
    if (record.supplyChainReviewFreshnessStatus !== "fresh") throw new Error("future supply-chain freshness fixture must be fresh");
    if (record.securityAdvisoryFreshnessStatus !== "fresh") throw new Error("future advisory freshness fixture must be fresh");
    if (record.packageMetadataFreshnessStatus !== "fresh") throw new Error("future package metadata freshness fixture must be fresh");
    if (record.versionPolicyFreshnessStatus !== "fresh") throw new Error("future version policy freshness fixture must be fresh");
    if (record.packageDiffFreshnessStatus !== "fresh") throw new Error("future package diff freshness fixture must be fresh");
    if (record.lockfileFreshnessStatus !== "fresh") throw new Error("future lockfile freshness fixture must be fresh");
    if (record.secretBoundaryFreshnessStatus !== "fresh") throw new Error("future secret boundary freshness fixture must be fresh");
    if (record.refreshRequired !== false) throw new Error("future DB driver candidate freshness fixture must not require refresh");
    return;
  }
  if (record.freshnessStatus !== "not_ready") throw new Error("current DB driver candidate freshness status must remain not_ready");
  if (record.licenseReviewFreshnessStatus !== "not_reviewed") throw new Error("license freshness must remain not_reviewed");
  if (record.supplyChainReviewFreshnessStatus !== "not_reviewed") throw new Error("supply-chain freshness must remain not_reviewed");
  if (record.securityAdvisoryFreshnessStatus !== "not_reviewed") throw new Error("security advisory freshness must remain not_reviewed");
  if (record.packageMetadataFreshnessStatus !== "not_reviewed") throw new Error("package metadata freshness must remain not_reviewed");
  if (record.versionPolicyFreshnessStatus !== "not_selected") throw new Error("version policy freshness must remain not_selected");
  if (record.packageDiffFreshnessStatus !== "missing") throw new Error("package diff freshness must remain missing");
  if (record.lockfileFreshnessStatus !== "missing") throw new Error("lockfile freshness must remain missing");
  if (record.secretBoundaryFreshnessStatus !== "not_reviewed") throw new Error("secret boundary freshness must remain not_reviewed");
  if (record.refreshRequired !== true) throw new Error("current DB driver candidate freshness refreshRequired must remain true");
}

function assertExpiryPolicy(policy: DbDriverCandidateReviewExpiryPolicy) {
  if (policy.licenseReviewExpiresAfterDays !== 30) throw new Error("license review freshness expiry must be 30 days");
  if (policy.supplyChainReviewExpiresAfterDays !== 30) throw new Error("supply-chain review freshness expiry must be 30 days");
  if (policy.securityAdvisoryReviewExpiresAfterDays !== 7) throw new Error("security advisory freshness expiry must be 7 days");
  if (policy.packageMetadataReviewExpiresAfterDays !== 14) throw new Error("package metadata freshness expiry must be 14 days");
  if (policy.versionPolicyReviewExpiresAfterDays !== 30) throw new Error("version policy freshness expiry must be 30 days");
  if (policy.packageAndLockfileEvidenceInvalidatesOnPackageFileChange !== true) {
    throw new Error("package and lockfile freshness evidence must invalidate on package file change");
  }
  if (policy.ownerApprovalNeverInferred !== true) throw new Error("owner approval freshness must never be inferred");
}

function assertStaleEvidencePolicy(policy: DbDriverCandidateReviewStaleEvidencePolicy) {
  if (policy.staleEvidenceCannotSelectDriver !== true) throw new Error("stale evidence must not select driver");
  if (policy.staleEvidenceCannotApproveOwnerReview !== true) throw new Error("stale evidence must not approve owner review");
  if (policy.staleEvidenceCannotAuthorizeDependency !== true) throw new Error("stale evidence must not authorize dependency");
  if (policy.rawLogsRemainForbidden !== true) throw new Error("raw logs must remain forbidden");
  if (policy.safeArtifactsAndMachineEvidenceOnly !== true) {
    throw new Error("freshness policy must require safe artifacts and machine evidence only");
  }
}

function assertRefreshReasons(refreshReasons: string[]) {
  const allowed = new Set(dbDriverCandidateReviewFreshnessRefreshReasons);
  for (const reason of refreshReasons) {
    if (!allowed.has(reason as DbDriverCandidateReviewFreshnessRefreshReason)) {
      throw new Error(`DB driver candidate freshness rejects unknown refresh reason ${reason}`);
    }
  }
  for (const reason of dbDriverCandidateReviewFreshnessRefreshReasons) {
    if (!refreshReasons.includes(reason)) {
      throw new Error(`DB driver candidate freshness requires refresh reason ${reason}`);
    }
  }
}

function assertPermissionFlagsFalse(record: DbDriverCandidateReviewFreshnessRecord) {
  const falseKeys: Array<keyof DbDriverCandidateReviewFreshnessRecord> = [
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
    if (record[key] !== false) throw new Error(`DB driver candidate freshness ${String(key)} must remain false`);
  }
}

function scanUnsafeEvidence(value: unknown, path = "freshness") {
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

function assertCandidateSummaryDoesNotClaimSelection(value: string) {
  const forbiddenSummaryPatterns = [
    /\bapproved\b/i,
    /\bselec[t]ed\b/i,
    /\brecommended\b/i,
    /\bwinner\b/i,
    /\bbest\s+choice\b/i,
    /\bpreferred\b/i,
    /\bapproved\s+choice\b/i,
    /\bsafe\s+for\s+dependency\b/i,
    /\bready\s+for\s+dependency\b/i,
    /\binstall\s+now\b/i,
    /\bproduction\s+candidate\b/i,
    /\bproduction\s+ready\b/i,
    /\blegally\s+safe\b/i,
    /\bpolicy\s+compliant\b/i,
    /\bfresh\s+enough\s+to\s+selec[t]\b/i,
    /\bselec[t]ion\s+ready\b/i,
    /\bowner\s+approved\b/i,
    /\bdependency\s+approved\b/i,
    /runtime[_ -]?ready/i,
    /legal[_ -]?compliant/i,
    /youtube[_ -]?policy[_ -]?compliant/i
  ];
  for (const pattern of forbiddenSummaryPatterns) {
    if (pattern.test(value)) {
      throw new Error("DB driver candidate freshness safeSummary must not claim selection, approval, readiness, or compliance");
    }
  }
}

function assertSafeString(value: string, path: string) {
  const unsafePatterns = [
    /postgres(?:ql)?:\/\//i,
    /(?:^|[^a-z])0x[0-9a-f]{40}(?:$|[^a-z])/i,
    /ghp_[a-z0-9_]+/i,
    /sk-[a-z0-9_-]+/i,
    /xoxb-[a-z0-9_-]+/i,
    /AKIA[0-9A-Z]{16}/,
    /Bearer\s+[a-z0-9._-]+/i,
    /https?:\/\//i,
    /private[_ -]?url/i,
    /raw\s+github\s+logs?/i,
    /gh\s+run\s+view\s+--log/i,
    /raw\s+provider\s+response/i,
    /stdout|stderr|stack_trace/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i,
    /oauth\s*token/i,
    /legal\s+compliance\s+claim/i,
    /youtube\s+policy\s+compliance\s+claim/i
  ];
  const unsafeKeyPatterns = [
    /private[_-]?key/i,
    /api[_-]?key/i,
    /secret[_-]?(value|token|key)/i,
    /secret(value|token|key)/i,
    /mnemonic/i,
    /connection[_-]?string/i,
    /database[_-]?url/i,
    /postgres[_-]?url/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver candidate freshness evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver candidate freshness evidence rejected at ${path}`);
  }
}

function isSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}
