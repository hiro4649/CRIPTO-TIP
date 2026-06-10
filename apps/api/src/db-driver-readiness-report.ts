import type { DbDriverApprovalDryRunRecord } from "./db-driver-approval-dry-run.js";
import type { DbDriverOwnerApprovalRecord } from "./db-driver-owner-approval-record.js";
import type { DbDriverPreflightPolicyRecord } from "./db-driver-preflight-policy.js";

export const dbDriverReadinessStatuses = ["not_ready", "ready"] as const;
export type DbDriverReadinessStatus = typeof dbDriverReadinessStatuses[number];

export const dbDriverReadinessBlockers = [
  "owner_approval_not_approved",
  "driver_not_selected",
  "approval_dry_run_not_pass",
  "license_review_missing",
  "supply_chain_review_missing",
  "security_advisory_review_missing",
  "version_pinning_review_missing",
  "lockfile_review_missing",
  "package_diff_review_missing",
  "secret_boundary_review_missing",
  "package_or_lockfile_change_forbidden",
  "real_db_connection_forbidden",
  "migration_apply_forbidden",
  "provider_sdk_apply_forbidden",
  "production_deployment_forbidden",
  "readiness_claim_forbidden",
  "selected_driver_forbidden_in_committed_report"
] as const;

export type DbDriverReadinessBlocker = typeof dbDriverReadinessBlockers[number];

export type DbDriverReadinessReportContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverReadinessReportInput = {
  ownerApprovalRecord: DbDriverOwnerApprovalRecord;
  preflightPolicyRecord: DbDriverPreflightPolicyRecord;
  approvalDryRunRecord: DbDriverApprovalDryRunRecord;
};

export type DbDriverReadinessReport = {
  schema_version: string;
  harness_version: string;
  repository: string;
  pr_number: number;
  target_branch: string;
  target_commit_sha: string;
  base_commit_sha: string;
  readiness_status: DbDriverReadinessStatus;
  selected_driver: string | null;
  owner_approval_status: string;
  preflight_policy_status: "pass" | "fail";
  approval_dry_run_status: string;
  blockers: DbDriverReadinessBlocker[];
  forbidden_scope_status: "pass" | "fail";
  safe_summary: string;
  created_at: string;
};

export function buildDbDriverReadinessReport(
  input: DbDriverReadinessReportInput,
  context: DbDriverReadinessReportContext
): DbDriverReadinessReport {
  const blockers = new Set<DbDriverReadinessBlocker>();
  assertContextBinding(input, context);

  const selectedDriver = input.approvalDryRunRecord.selected_driver ?? input.preflightPolicyRecord.selected_driver ?? null;
  if (selectedDriver !== null) blockers.add("selected_driver_forbidden_in_committed_report");
  if (input.ownerApprovalRecord.approval_status !== "approved") blockers.add("owner_approval_not_approved");
  if (input.preflightPolicyRecord.driver_choice_status !== "selected" || selectedDriver === null) blockers.add("driver_not_selected");
  if (input.approvalDryRunRecord.dry_run_status !== "pass") blockers.add("approval_dry_run_not_pass");

  addReviewBlockers(input.approvalDryRunRecord, blockers);
  addForbiddenScopeBlockers(input, blockers);

  const blockerList = [...blockers];
  return {
    schema_version: "1.0.0",
    harness_version: context.harnessVersion ?? "1.1.6",
    repository: context.repository,
    pr_number: context.prNumber,
    target_branch: context.targetBranch,
    target_commit_sha: context.targetCommitSha,
    base_commit_sha: context.baseCommitSha,
    readiness_status: blockerList.length === 0 ? "ready" : "not_ready",
    selected_driver: selectedDriver,
    owner_approval_status: input.ownerApprovalRecord.approval_status,
    preflight_policy_status: input.preflightPolicyRecord.driver_choice_status === "not_selected" ? "pass" : "fail",
    approval_dry_run_status: input.approvalDryRunRecord.dry_run_status,
    blockers: blockerList,
    forbidden_scope_status: blockerList.some(isForbiddenScopeBlocker) ? "fail" : "pass",
    safe_summary: blockerList.length === 0
      ? "DB driver readiness report is ready; this state is not expected for the committed v1.1.6 preparation evidence."
      : "DB driver readiness report is not ready. No driver is selected, owner approval is not approved, and required reviews remain incomplete.",
    created_at: context.createdAt
  };
}

export function validateCommittedDbDriverReadinessReport(report: DbDriverReadinessReport) {
  const failures: string[] = [];
  if (report.readiness_status !== "not_ready") failures.push("readiness_status_not_not_ready");
  if (report.selected_driver !== null) failures.push("selected_driver_present");
  if (report.owner_approval_status !== "not_approved") failures.push("owner_approval_not_not_approved");
  for (const required of [
    "owner_approval_not_approved",
    "driver_not_selected",
    "approval_dry_run_not_pass",
    "license_review_missing",
    "supply_chain_review_missing",
    "security_advisory_review_missing",
    "version_pinning_review_missing",
    "lockfile_review_missing",
    "package_diff_review_missing",
    "secret_boundary_review_missing"
  ] satisfies DbDriverReadinessBlocker[]) {
    if (!report.blockers.includes(required)) failures.push(`missing_${required}`);
  }
  if (report.forbidden_scope_status !== "pass") failures.push("forbidden_scope_not_pass");
  assertNoUnsafeReadinessReport(report);
  if (failures.length > 0) throw new Error(`Committed DB driver readiness report is unsafe: ${failures.join(", ")}`);
  return report;
}

function addReviewBlockers(record: DbDriverApprovalDryRunRecord, blockers: Set<DbDriverReadinessBlocker>) {
  if (record.license_review_status !== "pass") blockers.add("license_review_missing");
  if (record.supply_chain_review_status !== "pass") blockers.add("supply_chain_review_missing");
  if (record.security_advisory_review_status !== "pass") blockers.add("security_advisory_review_missing");
  if (record.version_pinning_review_status !== "pass") blockers.add("version_pinning_review_missing");
  if (record.lockfile_review_status !== "pass") blockers.add("lockfile_review_missing");
  if (record.package_diff_review_status !== "pass") blockers.add("package_diff_review_missing");
  if (record.secret_boundary_review_status !== "pass") blockers.add("secret_boundary_review_missing");
}

function addForbiddenScopeBlockers(input: DbDriverReadinessReportInput, blockers: Set<DbDriverReadinessBlocker>) {
  const dryRun = input.approvalDryRunRecord;
  const preflight = input.preflightPolicyRecord;
  if (dryRun.package_change_detected || dryRun.pnpm_lock_change_detected || preflight.package_change_allowed || preflight.pnpm_lock_change_allowed) blockers.add("package_or_lockfile_change_forbidden");
  if (dryRun.real_db_connection_detected || preflight.real_db_connection_allowed) blockers.add("real_db_connection_forbidden");
  if (dryRun.migration_change_detected || preflight.migration_apply_allowed) blockers.add("migration_apply_forbidden");
  if (dryRun.provider_sdk_apply_detected || preflight.provider_sdk_apply_allowed) blockers.add("provider_sdk_apply_forbidden");
  if (dryRun.production_deployment_detected || preflight.actual_production_deployment_allowed) blockers.add("production_deployment_forbidden");
  if (
    dryRun.runtime_readiness_claim_detected ||
    dryRun.production_readiness_claim_detected ||
    preflight.runtime_readiness_claim_allowed ||
    preflight.production_readiness_claim_allowed
  ) {
    blockers.add("readiness_claim_forbidden");
  }
}

function assertContextBinding(input: DbDriverReadinessReportInput, context: DbDriverReadinessReportContext) {
  for (const record of [input.ownerApprovalRecord, input.preflightPolicyRecord, input.approvalDryRunRecord]) {
    if (record.repository !== context.repository) throw new Error("DB driver readiness repository mismatch");
    if (record.pr_number !== context.prNumber) throw new Error("DB driver readiness PR mismatch");
    if (record.target_branch !== context.targetBranch) throw new Error("DB driver readiness branch mismatch");
    if (record.target_commit_sha !== context.targetCommitSha) throw new Error("DB driver readiness head mismatch");
    if (record.base_commit_sha !== context.baseCommitSha) throw new Error("DB driver readiness base mismatch");
  }
}

function isForbiddenScopeBlocker(blocker: DbDriverReadinessBlocker) {
  return [
    "package_or_lockfile_change_forbidden",
    "real_db_connection_forbidden",
    "migration_apply_forbidden",
    "provider_sdk_apply_forbidden",
    "production_deployment_forbidden",
    "readiness_claim_forbidden",
    "selected_driver_forbidden_in_committed_report"
  ].includes(blocker);
}

function assertNoUnsafeReadinessReport(value: unknown) {
  const text = JSON.stringify(value);
  if (/Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|password|clientSecret|apiKey|refreshToken|accessToken|secretValue|connectionString|databaseUrl|postgresUrl|PRIVATE KEY|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|raw[_ -]?provider/i.test(text)) {
    throw new Error("DB driver readiness report contains unsafe evidence");
  }
}
