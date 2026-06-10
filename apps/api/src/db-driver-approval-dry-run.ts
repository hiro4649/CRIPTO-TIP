import {
  allowedDbDriverCandidates,
  validateDbDriverPreflightPolicyRecord,
  type DbDriverCandidate,
  type DbDriverPreflightPolicyContext,
  type DbDriverPreflightPolicyRecord
} from "./db-driver-preflight-policy.js";
import {
  validateDbDriverOwnerApprovalRecord,
  type DbDriverOwnerApprovalContext,
  type DbDriverOwnerApprovalRecord
} from "./db-driver-owner-approval-record.js";

export const dbDriverApprovalDryRunStatuses = ["not_ready", "pass", "failed"] as const;
export type DbDriverApprovalDryRunStatus = typeof dbDriverApprovalDryRunStatuses[number];

export const dbDriverApprovalDryRunFailureReasons = [
  "owner_approval_missing",
  "owner_approval_expired",
  "owner_approval_target_mismatch",
  "owner_approval_fingerprint_mismatch",
  "owner_approval_scope_missing",
  "driver_not_selected",
  "driver_not_allowed",
  "preflight_policy_missing",
  "license_review_missing",
  "supply_chain_review_missing",
  "security_advisory_review_missing",
  "version_pinning_review_missing",
  "lockfile_review_missing",
  "package_diff_review_missing",
  "secret_boundary_review_missing",
  "package_change_without_approval",
  "pnpm_lock_change_without_approval",
  "real_db_connection_without_approval",
  "migration_change_without_approval",
  "provider_sdk_apply_forbidden",
  "production_deployment_forbidden",
  "runtime_readiness_claim_forbidden",
  "production_readiness_claim_forbidden",
  "legal_compliance_claim_forbidden",
  "youtube_policy_compliance_claim_forbidden",
  "unsafe_evidence_rejected",
  "raw_log_reference_rejected"
] as const;

export type DbDriverApprovalDryRunFailureReason = typeof dbDriverApprovalDryRunFailureReasons[number];

export type DbDriverReviewStatus = "missing" | "pass";

export type DbDriverPackageDiffEvidence = {
  package_json_changed: boolean;
  pnpm_lock_changed: boolean;
  added_dependencies: string[];
  removed_dependencies: string[];
  changed_scripts: string[];
  selected_driver: DbDriverCandidate | null;
  safe_summary: string;
};

export type DbDriverLicenseReviewEvidence = {
  status: DbDriverReviewStatus;
  driver: DbDriverCandidate | null;
  license_name: string | null;
  source_checked: boolean;
  legal_compliance_claim: false;
};

export type DbDriverSupplyChainReviewEvidence = {
  status: DbDriverReviewStatus;
  driver: DbDriverCandidate | null;
  maintainer_reviewed: boolean;
  release_cadence_reviewed: boolean;
  transitive_dependencies_reviewed: boolean;
  install_scripts_reviewed: boolean;
  provenance_reviewed: boolean;
};

export type DbDriverSecurityAdvisoryReviewEvidence = {
  status: DbDriverReviewStatus;
  driver: DbDriverCandidate | null;
  advisory_checked: boolean;
  cve_checked: boolean;
  audit_checked: boolean;
  known_blockers: string[];
};

export type DbDriverVersionPinningEvidence = {
  status: DbDriverReviewStatus;
  driver: DbDriverCandidate | null;
  version_policy: "exact" | "approved_range" | "not_selected";
  approved_version: string | null;
};

export type DbDriverLockfileReviewEvidence = {
  status: DbDriverReviewStatus;
  pnpm_lock_changed: boolean;
  unrelated_dependency_changes: boolean;
  transitive_dependency_count: number | null;
};

export type DbDriverSecretBoundaryEvidence = {
  status: DbDriverReviewStatus;
  secret_manager_scope_defined: boolean;
  raw_connection_string_present: false;
  env_file_changed: false;
  credential_storage: "secret_manager" | "not_selected";
};

export type DbDriverApprovalDryRunContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  now?: string | Date | undefined;
};

export type DbDriverApprovalDryRunInputs = {
  ownerApprovalRecord?: DbDriverOwnerApprovalRecord | null | undefined;
  preflightPolicyRecord?: DbDriverPreflightPolicyRecord | null | undefined;
  packageDiffEvidence?: DbDriverPackageDiffEvidence | null | undefined;
  lockfileReviewEvidence?: DbDriverLockfileReviewEvidence | null | undefined;
  licenseReviewEvidence?: DbDriverLicenseReviewEvidence | null | undefined;
  supplyChainReviewEvidence?: DbDriverSupplyChainReviewEvidence | null | undefined;
  securityAdvisoryReviewEvidence?: DbDriverSecurityAdvisoryReviewEvidence | null | undefined;
  versionPinningEvidence?: DbDriverVersionPinningEvidence | null | undefined;
  secretBoundaryEvidence?: DbDriverSecretBoundaryEvidence | null | undefined;
  packageChangeDetected?: boolean | undefined;
  pnpmLockChangeDetected?: boolean | undefined;
  realDbConnectionDetected?: boolean | undefined;
  migrationChangeDetected?: boolean | undefined;
  providerSdkApplyDetected?: boolean | undefined;
  productionDeploymentDetected?: boolean | undefined;
  runtimeReadinessClaimDetected?: boolean | undefined;
  productionReadinessClaimDetected?: boolean | undefined;
  legalComplianceClaimDetected?: boolean | undefined;
  youtubePolicyComplianceClaimDetected?: boolean | undefined;
};

export type DbDriverApprovalDryRunRecord = {
  schema_version: string;
  harness_version: string;
  repository: string;
  pr_number: number;
  target_branch: string;
  target_commit_sha: string;
  base_commit_sha: string;
  dry_run_id: string;
  dry_run_status: DbDriverApprovalDryRunStatus;
  selected_driver: DbDriverCandidate | null;
  owner_approval_record_status: "not_approved" | "approved" | "missing" | "expired" | "invalid";
  owner_approval_record_fingerprint_status: "not_applicable" | "pass" | "failed";
  preflight_policy_status: DbDriverReviewStatus;
  license_review_status: DbDriverReviewStatus;
  supply_chain_review_status: DbDriverReviewStatus;
  security_advisory_review_status: DbDriverReviewStatus;
  version_pinning_review_status: DbDriverReviewStatus;
  lockfile_review_status: DbDriverReviewStatus;
  package_diff_review_status: DbDriverReviewStatus;
  secret_boundary_review_status: DbDriverReviewStatus;
  package_change_detected: boolean;
  pnpm_lock_change_detected: boolean;
  real_db_connection_detected: boolean;
  migration_change_detected: boolean;
  provider_sdk_apply_detected: boolean;
  production_deployment_detected: boolean;
  runtime_readiness_claim_detected: boolean;
  production_readiness_claim_detected: boolean;
  legal_compliance_claim_detected: boolean;
  youtube_policy_compliance_claim_detected: boolean;
  failure_reasons: DbDriverApprovalDryRunFailureReason[];
  safe_summary: string;
  created_at: string;
};

export type CommittedDbDriverApprovalDryRunEvidence = {
  prNumber: number;
  headSha: string;
  baseSha: string;
  dryRunStatus: DbDriverApprovalDryRunStatus;
  selectedDriver: DbDriverCandidate | null;
  ownerApprovalRecordStatus: "not_approved" | "approved" | "missing" | "expired" | "invalid";
  ownerApprovalRecordFingerprintStatus: "not_applicable" | "pass" | "failed";
  preflightPolicyStatus: DbDriverReviewStatus;
  licenseReviewStatus: DbDriverReviewStatus;
  supplyChainReviewStatus: DbDriverReviewStatus;
  securityAdvisoryReviewStatus: DbDriverReviewStatus;
  versionPinningReviewStatus: DbDriverReviewStatus;
  lockfileReviewStatus: DbDriverReviewStatus;
  packageDiffReviewStatus: DbDriverReviewStatus;
  secretBoundaryReviewStatus: DbDriverReviewStatus;
  packageChangeDetected: boolean;
  pnpmLockChangeDetected: boolean;
  realDbConnectionDetected: boolean;
  migrationChangeDetected: boolean;
  providerSdkApplyDetected: boolean;
  productionDeploymentDetected: boolean;
  runtimeReadinessClaimDetected: boolean;
  productionReadinessClaimDetected: boolean;
  legalComplianceClaimDetected: boolean;
  youtubePolicyComplianceClaimDetected: boolean;
  failureReasons: DbDriverApprovalDryRunFailureReason[];
  forbiddenScopeStatus: "pass" | "fail";
};

export function createDefaultDbDriverApprovalDryRunRecord(input: {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  dryRunId: string;
  createdAt: string;
  harnessVersion?: string | undefined;
}): DbDriverApprovalDryRunRecord {
  return {
    schema_version: "1.0.0",
    harness_version: input.harnessVersion ?? "1.1.6",
    repository: input.repository,
    pr_number: input.prNumber,
    target_branch: input.targetBranch,
    target_commit_sha: input.targetCommitSha,
    base_commit_sha: input.baseCommitSha,
    dry_run_id: input.dryRunId,
    dry_run_status: "not_ready",
    selected_driver: null,
    owner_approval_record_status: "not_approved",
    owner_approval_record_fingerprint_status: "not_applicable",
    preflight_policy_status: "pass",
    license_review_status: "missing",
    supply_chain_review_status: "missing",
    security_advisory_review_status: "missing",
    version_pinning_review_status: "missing",
    lockfile_review_status: "missing",
    package_diff_review_status: "missing",
    secret_boundary_review_status: "missing",
    package_change_detected: false,
    pnpm_lock_change_detected: false,
    real_db_connection_detected: false,
    migration_change_detected: false,
    provider_sdk_apply_detected: false,
    production_deployment_detected: false,
    runtime_readiness_claim_detected: false,
    production_readiness_claim_detected: false,
    legal_compliance_claim_detected: false,
    youtube_policy_compliance_claim_detected: false,
    failure_reasons: [
      "owner_approval_missing",
      "driver_not_selected",
      "license_review_missing",
      "supply_chain_review_missing",
      "security_advisory_review_missing",
      "version_pinning_review_missing",
      "lockfile_review_missing",
      "package_diff_review_missing",
      "secret_boundary_review_missing"
    ],
    safe_summary: "DB driver approval dry-run is not ready; no driver is selected and no owner approval is recorded.",
    created_at: input.createdAt
  };
}

export function evaluateDbDriverApprovalDryRun(inputs: DbDriverApprovalDryRunInputs, context: DbDriverApprovalDryRunContext): DbDriverApprovalDryRunRecord {
  const reasons = new Set<DbDriverApprovalDryRunFailureReason>();
  const selectedDriver = inputs.packageDiffEvidence?.selected_driver ?? null;
  const record = createDefaultDbDriverApprovalDryRunRecord({
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    dryRunId: `db-driver-dry-run-${context.prNumber}`,
    createdAt: new Date(context.now ?? "2026-06-10T00:00:00Z").toISOString()
  });

  record.selected_driver = selectedDriver;
  record.package_change_detected = Boolean(inputs.packageChangeDetected ?? inputs.packageDiffEvidence?.package_json_changed);
  record.pnpm_lock_change_detected = Boolean(inputs.pnpmLockChangeDetected ?? inputs.packageDiffEvidence?.pnpm_lock_changed);
  record.real_db_connection_detected = Boolean(inputs.realDbConnectionDetected);
  record.migration_change_detected = Boolean(inputs.migrationChangeDetected);
  record.provider_sdk_apply_detected = Boolean(inputs.providerSdkApplyDetected);
  record.production_deployment_detected = Boolean(inputs.productionDeploymentDetected);
  record.runtime_readiness_claim_detected = Boolean(inputs.runtimeReadinessClaimDetected);
  record.production_readiness_claim_detected = Boolean(inputs.productionReadinessClaimDetected);
  record.legal_compliance_claim_detected = Boolean(inputs.legalComplianceClaimDetected);
  record.youtube_policy_compliance_claim_detected = Boolean(inputs.youtubePolicyComplianceClaimDetected);

  assertNoUnsafeDbDriverApprovalDryRunEvidence(inputs);
  collectForbiddenChangeReasons(record, reasons);
  collectPackageDiffReasons(inputs.packageDiffEvidence, reasons);

  const ownerApprovalStatus = collectOwnerApprovalReasons(inputs.ownerApprovalRecord, selectedDriver, context, reasons);
  record.owner_approval_record_status = ownerApprovalStatus.status;
  record.owner_approval_record_fingerprint_status = ownerApprovalStatus.fingerprintStatus;
  record.preflight_policy_status = collectPreflightReasons(inputs.preflightPolicyRecord, selectedDriver, context, reasons);
  if (Boolean(inputs.licenseReviewEvidence?.legal_compliance_claim)) reasons.add("legal_compliance_claim_forbidden");
  record.license_review_status = collectReviewStatus(inputs.licenseReviewEvidence, selectedDriver, "license_review_missing", reasons, isPassingLicenseReview);
  record.supply_chain_review_status = collectReviewStatus(inputs.supplyChainReviewEvidence, selectedDriver, "supply_chain_review_missing", reasons, isPassingSupplyChainReview);
  record.security_advisory_review_status = collectReviewStatus(inputs.securityAdvisoryReviewEvidence, selectedDriver, "security_advisory_review_missing", reasons, isPassingSecurityAdvisoryReview);
  record.version_pinning_review_status = collectReviewStatus(inputs.versionPinningEvidence, selectedDriver, "version_pinning_review_missing", reasons, isPassingVersionPinningReview);
  record.lockfile_review_status = collectReviewStatus(inputs.lockfileReviewEvidence, selectedDriver, "lockfile_review_missing", reasons, isPassingLockfileReview);
  record.package_diff_review_status = collectPackageDiffReviewStatus(inputs.packageDiffEvidence, selectedDriver, reasons);
  record.secret_boundary_review_status = collectReviewStatus(inputs.secretBoundaryEvidence, selectedDriver, "secret_boundary_review_missing", reasons, isPassingSecretBoundaryReview);

  if (!selectedDriver) reasons.add("driver_not_selected");
  else if (!isAllowedDriver(selectedDriver)) reasons.add("driver_not_allowed");

  record.failure_reasons = [...reasons];
  record.dry_run_status = record.failure_reasons.length === 0 ? "pass" : "failed";
  if (record.failure_reasons.includes("owner_approval_missing") && record.failure_reasons.includes("driver_not_selected")) {
    record.dry_run_status = "not_ready";
  }
  record.safe_summary = record.dry_run_status === "pass"
    ? "Test-only DB driver approval dry-run fixture is complete; this does not authorize current driver selection."
    : "DB driver approval dry-run is not ready; required owner approval and review evidence are incomplete.";
  return record;
}

export function validateCommittedDbDriverApprovalDryRunEvidence(
  evidence: CommittedDbDriverApprovalDryRunEvidence,
  context: { prNumber: number; baseSha: string; staleHeadSha?: string | undefined }
) {
  const failures: string[] = [];
  if (evidence.prNumber !== context.prNumber) failures.push("pr_number_mismatch");
  if (!/^[0-9a-f]{40}$/i.test(evidence.headSha)) failures.push("head_sha_invalid");
  if (evidence.headSha === context.baseSha || evidence.headSha === context.staleHeadSha) failures.push("head_sha_stale");
  if (evidence.baseSha !== context.baseSha) failures.push("base_sha_mismatch");
  if (evidence.dryRunStatus !== "not_ready") failures.push("dry_run_status_not_not_ready");
  if (evidence.selectedDriver !== null) failures.push("selected_driver_present");
  if (evidence.ownerApprovalRecordStatus !== "not_approved") failures.push("owner_approval_not_not_approved");
  if (evidence.ownerApprovalRecordFingerprintStatus !== "not_applicable") failures.push("owner_approval_fingerprint_not_not_applicable");
  if (evidence.preflightPolicyStatus !== "pass") failures.push("preflight_policy_not_pass");
  for (const [key, value] of Object.entries({
    licenseReviewStatus: evidence.licenseReviewStatus,
    supplyChainReviewStatus: evidence.supplyChainReviewStatus,
    securityAdvisoryReviewStatus: evidence.securityAdvisoryReviewStatus,
    versionPinningReviewStatus: evidence.versionPinningReviewStatus,
    lockfileReviewStatus: evidence.lockfileReviewStatus,
    packageDiffReviewStatus: evidence.packageDiffReviewStatus,
    secretBoundaryReviewStatus: evidence.secretBoundaryReviewStatus
  })) {
    if (value !== "missing") failures.push(`${key}_not_missing`);
  }
  for (const [key, value] of Object.entries({
    packageChangeDetected: evidence.packageChangeDetected,
    pnpmLockChangeDetected: evidence.pnpmLockChangeDetected,
    realDbConnectionDetected: evidence.realDbConnectionDetected,
    migrationChangeDetected: evidence.migrationChangeDetected,
    providerSdkApplyDetected: evidence.providerSdkApplyDetected,
    productionDeploymentDetected: evidence.productionDeploymentDetected,
    runtimeReadinessClaimDetected: evidence.runtimeReadinessClaimDetected,
    productionReadinessClaimDetected: evidence.productionReadinessClaimDetected,
    legalComplianceClaimDetected: evidence.legalComplianceClaimDetected,
    youtubePolicyComplianceClaimDetected: evidence.youtubePolicyComplianceClaimDetected
  })) {
    if (value !== false) failures.push(`${key}_not_false`);
  }
  for (const requiredReason of [
    "owner_approval_missing",
    "driver_not_selected",
    "license_review_missing",
    "supply_chain_review_missing",
    "security_advisory_review_missing",
    "version_pinning_review_missing",
    "lockfile_review_missing",
    "package_diff_review_missing",
    "secret_boundary_review_missing"
  ] satisfies DbDriverApprovalDryRunFailureReason[]) {
    if (!evidence.failureReasons.includes(requiredReason)) failures.push(`missing_${requiredReason}`);
  }
  if (evidence.forbiddenScopeStatus !== "pass") failures.push("forbidden_scope_not_pass");
  if (failures.length > 0) throw new Error(`Committed DB driver approval dry-run evidence is unsafe: ${failures.join(", ")}`);
  return evidence;
}

export function assertNoUnsafeDbDriverApprovalDryRunEvidence(value: unknown, path: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUnsafeDbDriverApprovalDryRunEvidence(entry, path.concat(String(index))));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (unsafeEvidenceKeyPattern().test(key)) throw new Error(`DB driver approval dry-run evidence contains unsafe key: ${path.concat(key).join(".")}`);
      assertNoUnsafeDbDriverApprovalDryRunEvidence(nested, path.concat(key));
    }
    return;
  }
  if (typeof value === "string" && unsafeEvidenceValuePattern().test(value)) {
    if (/gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree/i.test(value)) {
      throw new Error(`DB driver approval dry-run evidence contains raw log reference: ${path.join(".") || "value"}`);
    }
    throw new Error(`DB driver approval dry-run evidence contains unsafe value: ${path.join(".") || "value"}`);
  }
}

function collectForbiddenChangeReasons(record: DbDriverApprovalDryRunRecord, reasons: Set<DbDriverApprovalDryRunFailureReason>) {
  if (record.package_change_detected) reasons.add("package_change_without_approval");
  if (record.pnpm_lock_change_detected) reasons.add("pnpm_lock_change_without_approval");
  if (record.real_db_connection_detected) reasons.add("real_db_connection_without_approval");
  if (record.migration_change_detected) reasons.add("migration_change_without_approval");
  if (record.provider_sdk_apply_detected) reasons.add("provider_sdk_apply_forbidden");
  if (record.production_deployment_detected) reasons.add("production_deployment_forbidden");
  if (record.runtime_readiness_claim_detected) reasons.add("runtime_readiness_claim_forbidden");
  if (record.production_readiness_claim_detected) reasons.add("production_readiness_claim_forbidden");
  if (record.legal_compliance_claim_detected) reasons.add("legal_compliance_claim_forbidden");
  if (record.youtube_policy_compliance_claim_detected) reasons.add("youtube_policy_compliance_claim_forbidden");
}

function collectPackageDiffReasons(evidence: DbDriverPackageDiffEvidence | null | undefined, reasons: Set<DbDriverApprovalDryRunFailureReason>) {
  if (!evidence) return;
  if (evidence.package_json_changed) reasons.add("package_change_without_approval");
  if (evidence.pnpm_lock_changed) reasons.add("pnpm_lock_change_without_approval");
  if (evidence.added_dependencies.some((dependency) => dependency === "pg" || dependency === "postgres")) reasons.add("package_change_without_approval");
  if (evidence.changed_scripts.length > 0) reasons.add("package_change_without_approval");
}

function collectOwnerApprovalReasons(
  record: DbDriverOwnerApprovalRecord | null | undefined,
  selectedDriver: DbDriverCandidate | null,
  context: DbDriverApprovalDryRunContext,
  reasons: Set<DbDriverApprovalDryRunFailureReason>
) {
  if (!record) {
    reasons.add("owner_approval_missing");
    return { status: "missing" as const, fingerprintStatus: "not_applicable" as const };
  }
  try {
    const validated = validateDbDriverOwnerApprovalRecord(record, ownerContext(context));
    if (validated.approval_status !== "approved") {
      reasons.add(validated.approval_status === "expired" ? "owner_approval_expired" : "owner_approval_missing");
      return { status: validated.approval_status === "expired" ? "expired" as const : "not_approved" as const, fingerprintStatus: "not_applicable" as const };
    }
    if (!selectedDriver || validated.driver_package !== selectedDriver) reasons.add("owner_approval_target_mismatch");
    return { status: "approved" as const, fingerprintStatus: "pass" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/expired/i.test(message)) reasons.add("owner_approval_expired");
    else if (/fingerprint/i.test(message)) reasons.add("owner_approval_fingerprint_mismatch");
    else if (/scope/i.test(message)) reasons.add("owner_approval_scope_missing");
    else if (/target|branch|pr[_ ]number|repository|base[_ ]commit/i.test(message)) reasons.add("owner_approval_target_mismatch");
    else reasons.add("owner_approval_missing");
    return { status: "invalid" as const, fingerprintStatus: /fingerprint/i.test(message) ? "failed" as const : "not_applicable" as const };
  }
}

function collectPreflightReasons(
  record: DbDriverPreflightPolicyRecord | null | undefined,
  selectedDriver: DbDriverCandidate | null,
  context: DbDriverApprovalDryRunContext,
  reasons: Set<DbDriverApprovalDryRunFailureReason>
): DbDriverReviewStatus {
  if (!record) {
    reasons.add("preflight_policy_missing");
    return "missing";
  }
  try {
    const validated = validateDbDriverPreflightPolicyRecord(record, preflightContext(context));
    if (selectedDriver && !validated.candidate_drivers.includes(selectedDriver)) reasons.add("driver_not_allowed");
    return "pass";
  } catch {
    reasons.add("preflight_policy_missing");
    return "missing";
  }
}

function collectReviewStatus<T>(
  evidence: T | null | undefined,
  selectedDriver: DbDriverCandidate | null,
  missingReason: DbDriverApprovalDryRunFailureReason,
  reasons: Set<DbDriverApprovalDryRunFailureReason>,
  predicate: (evidence: T, selectedDriver: DbDriverCandidate | null) => boolean
): DbDriverReviewStatus {
  if (!evidence || !predicate(evidence, selectedDriver)) {
    reasons.add(missingReason);
    return "missing";
  }
  return "pass";
}

function collectPackageDiffReviewStatus(evidence: DbDriverPackageDiffEvidence | null | undefined, selectedDriver: DbDriverCandidate | null, reasons: Set<DbDriverApprovalDryRunFailureReason>): DbDriverReviewStatus {
  if (!evidence || evidence.package_json_changed || evidence.pnpm_lock_changed || evidence.added_dependencies.length > 0 || evidence.changed_scripts.length > 0 || evidence.selected_driver !== selectedDriver) {
    reasons.add("package_diff_review_missing");
    return "missing";
  }
  return "pass";
}

function isPassingLicenseReview(evidence: DbDriverLicenseReviewEvidence, selectedDriver: DbDriverCandidate | null) {
  return evidence.status === "pass" && evidence.driver === selectedDriver && evidence.source_checked && evidence.legal_compliance_claim === false;
}

function isPassingSupplyChainReview(evidence: DbDriverSupplyChainReviewEvidence, selectedDriver: DbDriverCandidate | null) {
  return evidence.status === "pass" && evidence.driver === selectedDriver && evidence.maintainer_reviewed && evidence.release_cadence_reviewed && evidence.transitive_dependencies_reviewed && evidence.install_scripts_reviewed && evidence.provenance_reviewed;
}

function isPassingSecurityAdvisoryReview(evidence: DbDriverSecurityAdvisoryReviewEvidence, selectedDriver: DbDriverCandidate | null) {
  return evidence.status === "pass" && evidence.driver === selectedDriver && evidence.advisory_checked && evidence.cve_checked && evidence.audit_checked && evidence.known_blockers.length === 0;
}

function isPassingVersionPinningReview(evidence: DbDriverVersionPinningEvidence, selectedDriver: DbDriverCandidate | null) {
  return evidence.status === "pass" && evidence.driver === selectedDriver && evidence.version_policy !== "not_selected" && Boolean(evidence.approved_version);
}

function isPassingLockfileReview(evidence: DbDriverLockfileReviewEvidence) {
  return evidence.status === "pass" && evidence.pnpm_lock_changed === false && evidence.unrelated_dependency_changes === false && typeof evidence.transitive_dependency_count === "number";
}

function isPassingSecretBoundaryReview(evidence: DbDriverSecretBoundaryEvidence) {
  return evidence.status === "pass" && evidence.secret_manager_scope_defined && evidence.raw_connection_string_present === false && evidence.env_file_changed === false && evidence.credential_storage === "secret_manager";
}

function isAllowedDriver(driver: string): driver is DbDriverCandidate {
  return (allowedDbDriverCandidates as readonly string[]).includes(driver);
}

function ownerContext(context: DbDriverApprovalDryRunContext): DbDriverOwnerApprovalContext {
  return {
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    now: context.now
  };
}

function preflightContext(context: DbDriverApprovalDryRunContext): DbDriverPreflightPolicyContext {
  return {
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha
  };
}

function unsafeEvidenceKeyPattern() {
  return /^(password|dbPassword|clientSecret|client_secret|apiKey|api_key|api-key|refreshToken|refresh_token|accessToken|access_token|secretValue|secret_value|connectionString|connection_string|databaseUrl|database_url|postgresUrl|postgres_url|rawProviderResponse|githubRawLogs)$/i;
}

function unsafeEvidenceValuePattern() {
  return /Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|password|dbPassword|clientSecret|client_secret|client_secret=|apiKey|api_key|api-key|refreshToken|refresh_token|accessToken|access_token|secretValue|secret_value|connectionString|connection_string|databaseUrl|database_url|postgresUrl|postgres_url|PRIVATE KEY|BEGIN PRIVATE KEY|password=|token=|secret=|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree|raw[_ -]?provider[_ -]?response/i;
}
