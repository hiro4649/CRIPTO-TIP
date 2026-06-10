import type { DbDriverApprovalDryRunRecord, DbDriverReviewStatus } from "./db-driver-approval-dry-run.js";
import type { DbDriverOwnerApprovalRecord } from "./db-driver-owner-approval-record.js";
import type { DbDriverPreflightPolicyRecord } from "./db-driver-preflight-policy.js";
import type { DbDriverReadinessReport } from "./db-driver-readiness-report.js";

export const dbDriverFinalApprovalGateStatuses = [
  "blocked",
  "ready_for_owner_review",
  "approved_for_dependency_pr"
] as const;

export type DbDriverFinalApprovalGateStatus = typeof dbDriverFinalApprovalGateStatuses[number];

export const dbDriverFinalApprovalGateBlockers = [
  "owner_approval_not_approved",
  "owner_approval_fingerprint_not_valid",
  "readiness_report_not_ready",
  "preflight_policy_not_pass",
  "approval_dry_run_not_pass",
  "driver_not_selected",
  "selected_driver_source_mismatch",
  "license_review_missing",
  "supply_chain_review_missing",
  "security_advisory_review_missing",
  "version_pinning_review_missing",
  "lockfile_review_missing",
  "package_diff_review_missing",
  "secret_boundary_review_missing",
  "package_change_not_approved",
  "pnpm_lock_change_not_approved",
  "real_db_connection_not_approved",
  "live_db_integration_not_approved",
  "migration_apply_not_approved",
  "provider_sdk_apply_forbidden",
  "production_deployment_forbidden",
  "runtime_readiness_claim_forbidden",
  "production_readiness_claim_forbidden",
  "legal_compliance_claim_forbidden",
  "youtube_policy_compliance_claim_forbidden",
  "unsafe_evidence_rejected",
  "raw_log_reference_rejected",
  "selected_driver_forbidden_in_committed_evidence",
  "approved_gate_forbidden_in_committed_evidence"
] as const;

export type DbDriverFinalApprovalGateBlocker = typeof dbDriverFinalApprovalGateBlockers[number];

export type DbDriverFinalApprovalGateContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverFinalApprovalGateInput = {
  ownerApprovalRecord: DbDriverOwnerApprovalRecord;
  readinessReport: DbDriverReadinessReport;
  preflightPolicyRecord: DbDriverPreflightPolicyRecord;
  approvalDryRunRecord: DbDriverApprovalDryRunRecord;
};

export type DbDriverFinalApprovalGateRecord = {
  schema_version: string;
  harness_version: string;
  repository: string;
  pr_number: number;
  target_branch: string;
  target_commit_sha: string;
  base_commit_sha: string;
  gate_id: string;
  gate_status: DbDriverFinalApprovalGateStatus;
  selected_driver: string | null;
  owner_approval_status: string;
  owner_approval_fingerprint_status: "not_applicable" | "pass" | "fail";
  readiness_report_status: string;
  preflight_policy_status: "pass" | "fail";
  approval_dry_run_status: string;
  license_review_status: DbDriverReviewStatus;
  supply_chain_review_status: DbDriverReviewStatus;
  security_advisory_review_status: DbDriverReviewStatus;
  version_pinning_review_status: DbDriverReviewStatus;
  lockfile_review_status: DbDriverReviewStatus;
  package_diff_review_status: DbDriverReviewStatus;
  secret_boundary_review_status: DbDriverReviewStatus;
  package_change_allowed: boolean;
  pnpm_lock_change_allowed: boolean;
  real_db_connection_allowed: boolean;
  live_db_integration_tests_allowed: boolean;
  migration_apply_allowed: boolean;
  provider_sdk_apply_allowed: boolean;
  actual_production_deployment_allowed: boolean;
  runtime_readiness_claim_allowed: boolean;
  production_readiness_claim_allowed: boolean;
  legal_compliance_claim_allowed: boolean;
  youtube_policy_compliance_claim_allowed: boolean;
  blockers: DbDriverFinalApprovalGateBlocker[];
  forbidden_scope_status: "pass" | "fail";
  safe_summary: string;
  created_at: string;
};

export function buildDbDriverFinalApprovalGate(
  input: DbDriverFinalApprovalGateInput,
  context: DbDriverFinalApprovalGateContext
): DbDriverFinalApprovalGateRecord {
  assertContextBinding(input, context);
  assertNoUnsafeDbDriverFinalApprovalGateEvidence(input);

  const blockers = new Set<DbDriverFinalApprovalGateBlocker>();
  const selectedDriver = resolveSelectedDriver(input);
  if (!allSelectedDriverSourcesAgree(input)) blockers.add("selected_driver_source_mismatch");
  if (selectedDriver === null) blockers.add("driver_not_selected");
  if (input.ownerApprovalRecord.approval_status !== "approved") blockers.add("owner_approval_not_approved");
  if (!isOwnerFingerprintValid(input.ownerApprovalRecord)) blockers.add("owner_approval_fingerprint_not_valid");
  if (input.readinessReport.readiness_status !== "ready") blockers.add("readiness_report_not_ready");
  if (input.approvalDryRunRecord.dry_run_status !== "pass") blockers.add("approval_dry_run_not_pass");
  if (!isPreflightPass(input.preflightPolicyRecord, selectedDriver)) blockers.add("preflight_policy_not_pass");

  addReviewBlockers(input.approvalDryRunRecord, blockers);
  addApprovalBlockers(input, blockers);

  const blockerList = [...blockers];
  return {
    schema_version: "1.0.0",
    harness_version: context.harnessVersion ?? "1.1.6",
    repository: context.repository,
    pr_number: context.prNumber,
    target_branch: context.targetBranch,
    target_commit_sha: context.targetCommitSha,
    base_commit_sha: context.baseCommitSha,
    gate_id: `db-driver-final-approval-${context.prNumber}`,
    gate_status: getGateStatus(blockerList),
    selected_driver: selectedDriver,
    owner_approval_status: input.ownerApprovalRecord.approval_status,
    owner_approval_fingerprint_status: getOwnerFingerprintStatus(input.ownerApprovalRecord),
    readiness_report_status: input.readinessReport.readiness_status,
    preflight_policy_status: isPreflightPass(input.preflightPolicyRecord, selectedDriver) ? "pass" : "fail",
    approval_dry_run_status: input.approvalDryRunRecord.dry_run_status,
    license_review_status: input.approvalDryRunRecord.license_review_status,
    supply_chain_review_status: input.approvalDryRunRecord.supply_chain_review_status,
    security_advisory_review_status: input.approvalDryRunRecord.security_advisory_review_status,
    version_pinning_review_status: input.approvalDryRunRecord.version_pinning_review_status,
    lockfile_review_status: input.approvalDryRunRecord.lockfile_review_status,
    package_diff_review_status: input.approvalDryRunRecord.package_diff_review_status,
    secret_boundary_review_status: input.approvalDryRunRecord.secret_boundary_review_status,
    package_change_allowed: input.ownerApprovalRecord.package_change_allowed,
    pnpm_lock_change_allowed: input.ownerApprovalRecord.pnpm_lock_change_allowed,
    real_db_connection_allowed: input.ownerApprovalRecord.real_db_connection_allowed,
    live_db_integration_tests_allowed: input.ownerApprovalRecord.live_db_integration_tests_allowed,
    migration_apply_allowed: input.ownerApprovalRecord.migration_apply_allowed,
    provider_sdk_apply_allowed: hasProviderSdkApply(input),
    actual_production_deployment_allowed: hasProductionDeployment(input),
    runtime_readiness_claim_allowed: hasRuntimeReadinessClaim(input),
    production_readiness_claim_allowed: hasProductionReadinessClaim(input),
    legal_compliance_claim_allowed: hasLegalComplianceClaim(input),
    youtube_policy_compliance_claim_allowed: hasYouTubePolicyClaim(input),
    blockers: blockerList,
    forbidden_scope_status: hasForbiddenScope(blockerList) ? "fail" : "pass",
    safe_summary: summarizeGate(blockerList),
    created_at: context.createdAt
  };
}

export function validateCommittedDbDriverFinalApprovalGateRecord(record: DbDriverFinalApprovalGateRecord) {
  assertNoUnsafeDbDriverFinalApprovalGateEvidence(record);
  assertBasicRecordShape(record);
  if (record.gate_status !== "blocked") throw new Error("committed DB driver final approval gate must remain blocked");
  if (record.selected_driver !== null) throw new Error("committed DB driver final approval gate must not select a driver");
  if (record.owner_approval_status !== "not_approved") throw new Error("committed owner approval status must remain not_approved");
  if (record.owner_approval_fingerprint_status !== "not_applicable") throw new Error("committed owner approval fingerprint must remain not_applicable");
  if (record.readiness_report_status !== "not_ready") throw new Error("committed readiness report status must remain not_ready");
  if (record.preflight_policy_status !== "pass") throw new Error("committed preflight policy status must remain pass");
  if (record.approval_dry_run_status !== "not_ready") throw new Error("committed approval dry-run status must remain not_ready");
  assertReviewStatus(record, "license_review_status");
  assertReviewStatus(record, "supply_chain_review_status");
  assertReviewStatus(record, "security_advisory_review_status");
  assertReviewStatus(record, "version_pinning_review_status");
  assertReviewStatus(record, "lockfile_review_status");
  assertReviewStatus(record, "package_diff_review_status");
  assertReviewStatus(record, "secret_boundary_review_status");
  assertCommittedFlagsFalse(record);
  if (record.forbidden_scope_status !== "pass") throw new Error("committed final approval forbidden_scope_status must remain pass");
  if (record.blockers.length === 0) throw new Error("committed DB driver final approval gate must keep blockers");
  const ownerOnly = record.blockers.every((blocker) => blocker === "owner_approval_not_approved" || blocker === "owner_approval_fingerprint_not_valid");
  if (ownerOnly) throw new Error("committed DB driver final approval gate must not be ready_for_owner_review");
  assertRequiredCommittedBlockers(record);
  return record;
}

export function assertNoUnsafeDbDriverFinalApprovalGateEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function selectedDriverSources(input: DbDriverFinalApprovalGateInput) {
  return [
    input.ownerApprovalRecord.driver_package ?? null,
    input.preflightPolicyRecord.selected_driver,
    input.approvalDryRunRecord.selected_driver,
    input.readinessReport.selected_driver
  ];
}

function allSelectedDriverSourcesAgree(input: DbDriverFinalApprovalGateInput) {
  const sources = selectedDriverSources(input);
  if (sources.every((candidate) => candidate === null || candidate === undefined)) return true;
  if (sources.some((candidate) => candidate === null || candidate === undefined)) return false;
  return new Set(sources).size === 1;
}

function resolveSelectedDriver(input: DbDriverFinalApprovalGateInput) {
  if (!allSelectedDriverSourcesAgree(input)) return null;
  const candidates = selectedDriverSources(input).filter((candidate): candidate is string => candidate !== null && candidate !== undefined);
  const unique = new Set(candidates);
  if (unique.size > 1) throw new Error("DB driver final approval selected driver inputs disagree");
  return candidates[0] ?? null;
}

function getOwnerFingerprintStatus(record: DbDriverOwnerApprovalRecord): "not_applicable" | "pass" | "fail" {
  if (record.approval_status !== "approved") return "not_applicable";
  return record.approval_fingerprint ? "pass" : "fail";
}

function isOwnerFingerprintValid(record: DbDriverOwnerApprovalRecord) {
  return record.approval_status !== "approved" || Boolean(record.approval_fingerprint);
}

function isPreflightPass(record: DbDriverPreflightPolicyRecord, selectedDriver: string | null) {
  if (hasPreflightForbiddenCapability(record)) return false;
  if (record.driver_choice_status === "not_selected") return selectedDriver === null;
  return selectedDriver !== null && record.selected_driver === selectedDriver;
}

function addReviewBlockers(record: DbDriverApprovalDryRunRecord, blockers: Set<DbDriverFinalApprovalGateBlocker>) {
  if (record.license_review_status !== "pass") blockers.add("license_review_missing");
  if (record.supply_chain_review_status !== "pass") blockers.add("supply_chain_review_missing");
  if (record.security_advisory_review_status !== "pass") blockers.add("security_advisory_review_missing");
  if (record.version_pinning_review_status !== "pass") blockers.add("version_pinning_review_missing");
  if (record.lockfile_review_status !== "pass") blockers.add("lockfile_review_missing");
  if (record.package_diff_review_status !== "pass") blockers.add("package_diff_review_missing");
  if (record.secret_boundary_review_status !== "pass") blockers.add("secret_boundary_review_missing");
}

function addApprovalBlockers(input: DbDriverFinalApprovalGateInput, blockers: Set<DbDriverFinalApprovalGateBlocker>) {
  if (!input.ownerApprovalRecord.package_change_allowed) blockers.add("package_change_not_approved");
  if (!input.ownerApprovalRecord.pnpm_lock_change_allowed) blockers.add("pnpm_lock_change_not_approved");
  if (input.ownerApprovalRecord.real_db_connection_allowed || input.preflightPolicyRecord.real_db_connection_allowed || input.approvalDryRunRecord.real_db_connection_detected) blockers.add("real_db_connection_not_approved");
  if (input.ownerApprovalRecord.live_db_integration_tests_allowed || input.preflightPolicyRecord.live_db_integration_tests_allowed) blockers.add("live_db_integration_not_approved");
  if (input.ownerApprovalRecord.migration_apply_allowed || input.preflightPolicyRecord.migration_apply_allowed || input.approvalDryRunRecord.migration_change_detected) blockers.add("migration_apply_not_approved");
  if (hasProviderSdkApply(input)) blockers.add("provider_sdk_apply_forbidden");
  if (hasProductionDeployment(input)) blockers.add("production_deployment_forbidden");
  if (hasRuntimeReadinessClaim(input)) blockers.add("runtime_readiness_claim_forbidden");
  if (hasProductionReadinessClaim(input)) blockers.add("production_readiness_claim_forbidden");
  if (hasLegalComplianceClaim(input)) blockers.add("legal_compliance_claim_forbidden");
  if (hasYouTubePolicyClaim(input)) blockers.add("youtube_policy_compliance_claim_forbidden");
}

function hasPreflightForbiddenCapability(record: DbDriverPreflightPolicyRecord) {
  return record.provider_sdk_apply_allowed ||
    record.actual_production_deployment_allowed ||
    record.runtime_readiness_claim_allowed ||
    record.production_readiness_claim_allowed ||
    record.legal_compliance_claim_allowed ||
    record.youtube_policy_compliance_claim_allowed ||
    record.real_db_connection_allowed ||
    record.live_db_integration_tests_allowed ||
    record.migration_apply_allowed;
}

function hasProviderSdkApply(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.provider_sdk_apply_allowed || input.preflightPolicyRecord.provider_sdk_apply_allowed || input.approvalDryRunRecord.provider_sdk_apply_detected;
}

function hasProductionDeployment(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.actual_production_deployment_allowed || input.preflightPolicyRecord.actual_production_deployment_allowed || input.approvalDryRunRecord.production_deployment_detected;
}

function hasRuntimeReadinessClaim(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.runtime_readiness_claim_allowed || input.preflightPolicyRecord.runtime_readiness_claim_allowed || input.approvalDryRunRecord.runtime_readiness_claim_detected;
}

function hasProductionReadinessClaim(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.production_readiness_claim_allowed || input.preflightPolicyRecord.production_readiness_claim_allowed || input.approvalDryRunRecord.production_readiness_claim_detected;
}

function hasLegalComplianceClaim(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.legal_compliance_claim_allowed || input.preflightPolicyRecord.legal_compliance_claim_allowed || input.approvalDryRunRecord.legal_compliance_claim_detected;
}

function hasYouTubePolicyClaim(input: DbDriverFinalApprovalGateInput) {
  return input.ownerApprovalRecord.youtube_policy_compliance_claim_allowed || input.preflightPolicyRecord.youtube_policy_compliance_claim_allowed || input.approvalDryRunRecord.youtube_policy_compliance_claim_detected;
}

function getGateStatus(blockers: DbDriverFinalApprovalGateBlocker[]): DbDriverFinalApprovalGateStatus {
  if (blockers.length === 0) return "approved_for_dependency_pr";
  const ownerOnly = blockers.every((blocker) => blocker === "owner_approval_not_approved" || blocker === "owner_approval_fingerprint_not_valid");
  return ownerOnly ? "ready_for_owner_review" : "blocked";
}

function hasForbiddenScope(blockers: DbDriverFinalApprovalGateBlocker[]) {
  return blockers.some((blocker) => blocker.endsWith("_forbidden") || blocker === "unsafe_evidence_rejected" || blocker === "raw_log_reference_rejected");
}

function summarizeGate(blockers: DbDriverFinalApprovalGateBlocker[]) {
  if (blockers.length === 0) return "DB driver final approval gate is approved for a future dependency PR only. It does not approve runtime, production, legal, YouTube policy, provider SDK, or real database execution scope.";
  return "DB driver final approval gate remains blocked. No DB driver dependency, package change, lockfile change, real database connection, migration apply, provider SDK apply, production deployment, or readiness claim is authorized.";
}

function assertContextBinding(input: DbDriverFinalApprovalGateInput, context: DbDriverFinalApprovalGateContext) {
  for (const [name, record] of Object.entries(input)) {
    assertRecordContext(name, record as Record<string, unknown>, context);
  }
}

function assertRecordContext(name: string, record: Record<string, unknown>, context: DbDriverFinalApprovalGateContext) {
  if (record.repository !== context.repository) throw new Error(`${name} repository does not match final approval context`);
  if (record.pr_number !== context.prNumber) throw new Error(`${name} pr_number does not match final approval context`);
  if (record.target_branch !== context.targetBranch) throw new Error(`${name} target_branch does not match final approval context`);
  if (record.target_commit_sha !== context.targetCommitSha) throw new Error(`${name} target_commit_sha does not match final approval context`);
  if (record.base_commit_sha !== context.baseCommitSha) throw new Error(`${name} base_commit_sha does not match final approval context`);
}

function assertBasicRecordShape(record: DbDriverFinalApprovalGateRecord) {
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver final approval repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.pr_number) || record.pr_number <= 0) throw new Error("DB driver final approval pr_number is required");
  if (!record.target_branch) throw new Error("DB driver final approval target_branch is required");
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("DB driver final approval target_commit_sha must be a 40-character SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.base_commit_sha)) throw new Error("DB driver final approval base_commit_sha must be a 40-character SHA");
  if (record.target_commit_sha === record.base_commit_sha) throw new Error("DB driver final approval target_commit_sha must differ from base_commit_sha");
  if (!record.created_at.endsWith("Z")) throw new Error("DB driver final approval created_at must be UTC");
}

function assertReviewStatus(record: DbDriverFinalApprovalGateRecord, key: keyof DbDriverFinalApprovalGateRecord) {
  if (record[key] !== "missing") throw new Error(`committed ${String(key)} must remain missing`);
}

function assertCommittedFlagsFalse(record: DbDriverFinalApprovalGateRecord) {
  const falseKeys: Array<keyof DbDriverFinalApprovalGateRecord> = [
    "package_change_allowed",
    "pnpm_lock_change_allowed",
    "real_db_connection_allowed",
    "live_db_integration_tests_allowed",
    "migration_apply_allowed",
    "provider_sdk_apply_allowed",
    "actual_production_deployment_allowed",
    "runtime_readiness_claim_allowed",
    "production_readiness_claim_allowed",
    "legal_compliance_claim_allowed",
    "youtube_policy_compliance_claim_allowed"
  ];
  for (const key of falseKeys) {
    if (record[key] !== false) throw new Error(`committed ${String(key)} must remain false`);
  }
}

function assertRequiredCommittedBlockers(record: DbDriverFinalApprovalGateRecord) {
  const required: DbDriverFinalApprovalGateBlocker[] = [
    "owner_approval_not_approved",
    "readiness_report_not_ready",
    "approval_dry_run_not_pass",
    "driver_not_selected",
    "license_review_missing",
    "supply_chain_review_missing",
    "security_advisory_review_missing",
    "version_pinning_review_missing",
    "lockfile_review_missing",
    "package_diff_review_missing",
    "secret_boundary_review_missing",
    "package_change_not_approved",
    "pnpm_lock_change_not_approved"
  ];
  for (const blocker of required) {
    if (!record.blockers.includes(blocker)) throw new Error(`committed DB driver final approval gate must include ${blocker}`);
  }
}

function scanUnsafeEvidence(value: unknown, path = "evidence") {
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
    /raw\s+provider\s+response/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i,
    /oauth\s*token/i
  ];
  const unsafeKeyPatterns = [
    /password/i,
    /clientSecret/i,
    /client_secret/i,
    /apiKey/i,
    /api_key/i,
    /refreshToken/i,
    /refresh_token/i,
    /connectionString/i,
    /connection_string/i,
    /rawProviderResponse/i,
    /raw_provider_response/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver final approval evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver final approval evidence rejected at ${path}`);
  }
}
