import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeDbDriverOwnerApprovalFingerprint,
  createDefaultDbDriverOwnerApprovalRecord,
  type DbDriverOwnerApprovalRecord
} from "./db-driver-owner-approval-record.js";
import { createDefaultDbDriverPreflightPolicyRecord } from "./db-driver-preflight-policy.js";
import {
  createDefaultDbDriverApprovalDryRunRecord,
  evaluateDbDriverApprovalDryRun,
  validateCommittedDbDriverApprovalDryRunEvidence,
  type DbDriverApprovalDryRunContext,
  type DbDriverApprovalDryRunInputs,
  type DbDriverLicenseReviewEvidence,
  type DbDriverLockfileReviewEvidence,
  type DbDriverPackageDiffEvidence,
  type DbDriverSecretBoundaryEvidence,
  type DbDriverSecurityAdvisoryReviewEvidence,
  type DbDriverSupplyChainReviewEvidence,
  type DbDriverVersionPinningEvidence
} from "./db-driver-approval-dry-run.js";

const targetCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const baseCommit = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const context = (patch: Partial<DbDriverApprovalDryRunContext> = {}): DbDriverApprovalDryRunContext => ({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 47,
  targetBranch: "feat/db-driver-approval-dry-run-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit,
  now: "2026-06-10T12:00:00Z",
  ...patch
});

const preflight = () => createDefaultDbDriverPreflightPolicyRecord({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 47,
  targetBranch: "feat/db-driver-approval-dry-run-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit,
  createdAt: "2026-06-10T00:00:00Z"
});

function ownerApproval(patch: Partial<DbDriverOwnerApprovalRecord> = {}) {
  const record = {
    ...createDefaultDbDriverOwnerApprovalRecord({
      repository: "hiro4649/CRIPTO-TIP",
      prNumber: 47,
      targetBranch: "feat/db-driver-approval-dry-run-v116-prep",
      targetCommitSha: targetCommit,
      baseCommitSha: baseCommit,
      createdAt: "2026-06-10T00:00:00Z"
    }),
    approval_id: "db-driver-approval-dry-run-test",
    approval_status: "approved",
    approval_scope: ["db_driver_dependency_introduction", "package_change_for_db_driver", "pnpm_lock_change_for_db_driver"],
    approved_by_role: "project-owner",
    approved_by_actor: "hiro4649",
    approved_at: "2026-06-10T11:00:00Z",
    expires_at: "2026-06-11T11:00:00Z",
    driver_package: "pg",
    driver_version_policy: "exact-version-after-review",
    package_change_allowed: true,
    pnpm_lock_change_allowed: true,
    ...patch
  } satisfies DbDriverOwnerApprovalRecord;
  return { ...record, approval_fingerprint: computeDbDriverOwnerApprovalFingerprint(record) };
}

const packageDiff = (patch: Partial<DbDriverPackageDiffEvidence> = {}): DbDriverPackageDiffEvidence => ({
  package_json_changed: false,
  pnpm_lock_changed: false,
  added_dependencies: [],
  removed_dependencies: [],
  changed_scripts: [],
  selected_driver: "pg",
  safe_summary: "test-only package diff evidence uses no real package change",
  ...patch
});

const licenseReview = (patch: Partial<DbDriverLicenseReviewEvidence> = {}): DbDriverLicenseReviewEvidence => ({
  status: "pass",
  driver: "pg",
  license_name: "fixture-license-review",
  source_checked: true,
  legal_compliance_claim: false,
  ...patch
});

const supplyChainReview = (patch: Partial<DbDriverSupplyChainReviewEvidence> = {}): DbDriverSupplyChainReviewEvidence => ({
  status: "pass",
  driver: "pg",
  maintainer_reviewed: true,
  release_cadence_reviewed: true,
  transitive_dependencies_reviewed: true,
  install_scripts_reviewed: true,
  provenance_reviewed: true,
  ...patch
});

const advisoryReview = (patch: Partial<DbDriverSecurityAdvisoryReviewEvidence> = {}): DbDriverSecurityAdvisoryReviewEvidence => ({
  status: "pass",
  driver: "pg",
  advisory_checked: true,
  cve_checked: true,
  audit_checked: true,
  known_blockers: [],
  ...patch
});

const versionPinning = (patch: Partial<DbDriverVersionPinningEvidence> = {}): DbDriverVersionPinningEvidence => ({
  status: "pass",
  driver: "pg",
  version_policy: "exact",
  approved_version: "fixture-only",
  ...patch
});

const lockfileReview = (patch: Partial<DbDriverLockfileReviewEvidence> = {}): DbDriverLockfileReviewEvidence => ({
  status: "pass",
  pnpm_lock_changed: false,
  unrelated_dependency_changes: false,
  transitive_dependency_count: 0,
  ...patch
});

const secretBoundary = (patch: Partial<DbDriverSecretBoundaryEvidence> = {}): DbDriverSecretBoundaryEvidence => ({
  status: "pass",
  secret_manager_scope_defined: true,
  raw_connection_string_present: false,
  env_file_changed: false,
  credential_storage: "secret_manager",
  ...patch
});

function completeFutureFixture(patch: DbDriverApprovalDryRunInputs = {}) {
  return {
    ownerApprovalRecord: ownerApproval(),
    preflightPolicyRecord: preflight(),
    packageDiffEvidence: packageDiff(),
    lockfileReviewEvidence: lockfileReview(),
    licenseReviewEvidence: licenseReview(),
    supplyChainReviewEvidence: supplyChainReview(),
    securityAdvisoryReviewEvidence: advisoryReview(),
    versionPinningEvidence: versionPinning(),
    secretBoundaryEvidence: secretBoundary(),
    ...patch
  };
}

function machineEvidence() {
  return JSON.parse(readFileSync(".codex/db-driver-approval-dry-run.json", "utf8")) as Record<string, unknown>;
}

function committedEvidence(patch: Record<string, unknown> = {}) {
  return {
    prNumber: 47,
    headSha: targetCommit,
    baseSha: baseCommit,
    dryRunStatus: "not_ready",
    selectedDriver: null,
    ownerApprovalRecordStatus: "not_approved",
    ownerApprovalRecordFingerprintStatus: "not_applicable",
    preflightPolicyStatus: "pass",
    licenseReviewStatus: "missing",
    supplyChainReviewStatus: "missing",
    securityAdvisoryReviewStatus: "missing",
    versionPinningReviewStatus: "missing",
    lockfileReviewStatus: "missing",
    packageDiffReviewStatus: "missing",
    secretBoundaryReviewStatus: "missing",
    packageChangeDetected: false,
    pnpmLockChangeDetected: false,
    realDbConnectionDetected: false,
    migrationChangeDetected: false,
    providerSdkApplyDetected: false,
    productionDeploymentDetected: false,
    runtimeReadinessClaimDetected: false,
    productionReadinessClaimDetected: false,
    legalComplianceClaimDetected: false,
    youtubePolicyComplianceClaimDetected: false,
    failureReasons: [
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
    forbiddenScopeStatus: "pass",
    ...patch
  };
}

describe("DB driver approval dry-run", () => {
  it("dry-run default record is not_ready", () => {
    const record = createDefaultDbDriverApprovalDryRunRecord({
      repository: "hiro4649/CRIPTO-TIP",
      prNumber: 47,
      targetBranch: "feat/db-driver-approval-dry-run-v116-prep",
      targetCommitSha: targetCommit,
      baseCommitSha: baseCommit,
      dryRunId: "dry-run-default",
      createdAt: "2026-06-10T00:00:00Z"
    });
    expect(record.dry_run_status).toBe("not_ready");
    expect(record.selected_driver).toBeNull();
    expect(record.failure_reasons).toContain("owner_approval_missing");
    expect(record.failure_reasons).toContain("driver_not_selected");
  });

  it.each([
    ["package change", { packageDiffEvidence: packageDiff({ package_json_changed: true }) }, "package_change_without_approval"],
    ["pnpm lock change", { packageDiffEvidence: packageDiff({ pnpm_lock_changed: true }) }, "pnpm_lock_change_without_approval"],
    ["added pg dependency", { packageDiffEvidence: packageDiff({ added_dependencies: ["pg"] }) }, "package_change_without_approval"],
    ["added postgres dependency", { packageDiffEvidence: packageDiff({ added_dependencies: ["postgres"] }) }, "package_change_without_approval"],
    ["changed scripts", { packageDiffEvidence: packageDiff({ changed_scripts: ["test"] }) }, "package_change_without_approval"]
  ] as const)("dry-run default rejects %s", (_name, patch, reason) => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ...patch }, context());
    expect(record.failure_reasons).toContain(reason);
  });

  it("dry-run rejects selected driver without owner approval", () => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ownerApprovalRecord: null }, context());
    expect(record.failure_reasons).toContain("owner_approval_missing");
  });

  it.each([
    ["expired", ownerApproval({ approved_at: "2026-06-08T00:00:00Z", expires_at: "2026-06-09T00:00:00Z" }), "owner_approval_expired"],
    ["target commit mismatch", ownerApproval({ target_commit_sha: "c".repeat(40) }), "owner_approval_target_mismatch"],
    ["branch mismatch", ownerApproval({ target_branch: "feat/other" }), "owner_approval_target_mismatch"],
    ["PR mismatch", ownerApproval({ pr_number: 99 }), "owner_approval_target_mismatch"],
    ["fingerprint mismatch", { ...ownerApproval(), approval_fingerprint: "0".repeat(64) }, "owner_approval_fingerprint_mismatch"]
  ] as const)("dry-run rejects owner approval %s", (_name, ownerApprovalRecord, reason) => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ownerApprovalRecord }, context());
    expect(record.failure_reasons).toContain(reason);
  });

  it("dry-run rejects selected driver not in allowed candidates", () => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), packageDiffEvidence: { ...packageDiff(), selected_driver: "mysql" as never } }, context());
    expect(record.failure_reasons).toContain("driver_not_allowed");
  });

  it.each([
    ["missing preflight policy", { preflightPolicyRecord: null }, "preflight_policy_missing"],
    ["missing license review", { licenseReviewEvidence: null }, "license_review_missing"],
    ["missing supply-chain review", { supplyChainReviewEvidence: null }, "supply_chain_review_missing"],
    ["missing security advisory review", { securityAdvisoryReviewEvidence: null }, "security_advisory_review_missing"],
    ["missing version pinning review", { versionPinningEvidence: null }, "version_pinning_review_missing"],
    ["missing lockfile review", { lockfileReviewEvidence: null }, "lockfile_review_missing"],
    ["missing package diff review", { packageDiffEvidence: null }, "package_diff_review_missing"],
    ["missing secret boundary review", { secretBoundaryEvidence: null }, "secret_boundary_review_missing"]
  ] as const)("dry-run rejects %s", (_name, patch, reason) => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ...patch }, context());
    expect(record.failure_reasons).toContain(reason);
  });

  it.each([
    ["supply-chain review with private URL", { supplyChainReviewEvidence: { ...supplyChainReview(), provenance_reviewed: true, note: "https://private.example" } as never }],
    ["advisory review with raw log reference", { securityAdvisoryReviewEvidence: advisoryReview({ known_blockers: ["gh run view --log"] }) }]
  ])("dry-run rejects unsafe evidence: %s", (_name, patch) => {
    expect(() => evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ...patch }, context())).toThrow(/unsafe|raw log/i);
  });

  it("dry-run rejects license review with legal compliance claim", () => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), licenseReviewEvidence: licenseReview({ legal_compliance_claim: true as false }) }, context());
    expect(record.failure_reasons).toContain("legal_compliance_claim_forbidden");
    expect(record.failure_reasons).toContain("license_review_missing");
  });

  it("dry-run rejects secret boundary with raw connection string", () => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), secretBoundaryEvidence: secretBoundary({ raw_connection_string_present: true as false }) }, context());
    expect(record.failure_reasons).toContain("secret_boundary_review_missing");
  });

  it.each([
    ["runtime readiness claim", { runtimeReadinessClaimDetected: true }, "runtime_readiness_claim_forbidden"],
    ["production readiness claim", { productionReadinessClaimDetected: true }, "production_readiness_claim_forbidden"],
    ["legal compliance claim", { legalComplianceClaimDetected: true }, "legal_compliance_claim_forbidden"],
    ["YouTube policy compliance claim", { youtubePolicyComplianceClaimDetected: true }, "youtube_policy_compliance_claim_forbidden"],
    ["provider SDK apply detected", { providerSdkApplyDetected: true }, "provider_sdk_apply_forbidden"],
    ["production deployment detected", { productionDeploymentDetected: true }, "production_deployment_forbidden"]
  ] as const)("dry-run rejects %s", (_name, patch, reason) => {
    const record = evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), ...patch }, context());
    expect(record.failure_reasons).toContain(reason);
  });

  it("dry-run accepts test-only future complete dry-run fixture with fake owner approval and no real package changes", () => {
    const record = evaluateDbDriverApprovalDryRun(completeFutureFixture(), context());
    expect(record.dry_run_status).toBe("pass");
    expect(record.failure_reasons).toEqual([]);
  });

  it("machine-readable dry-run evidence remains not_ready", () => {
    const evidence = machineEvidence();
    expect(evidence.dryRunStatus).toBe("not_ready");
    expect(evidence.selectedDriver).toBeNull();
    expect(evidence.ownerApprovalRecordStatus).toBe("not_approved");
    expect(evidence.packageChangeDetected).toBe(false);
    expect(evidence.pnpmLockChangeDetected).toBe(false);
    expect(evidence.realDbConnectionDetected).toBe(false);
  });

  it("machine-readable dry-run evidence headSha is not the stale base merge commit", () => {
    const evidence = machineEvidence();
    expect(evidence.headSha).not.toBe("f3e10067ec542592de2c6acf8694042e638feba2");
    expect(evidence.baseSha).toBe("f3e10067ec542592de2c6acf8694042e638feba2");
  });

  it("committed dry-run evidence accepts safe not_ready evidence", () => {
    expect(validateCommittedDbDriverApprovalDryRunEvidence(committedEvidence() as never, {
      prNumber: 47,
      baseSha: baseCommit,
      staleHeadSha: "f3e10067ec542592de2c6acf8694042e638feba2"
    })).toMatchObject({ dryRunStatus: "not_ready", selectedDriver: null });
  });

  it.each([
    ["pass status", { dryRunStatus: "pass" }],
    ["selected driver", { selectedDriver: "pg" }],
    ["selected postgres driver", { selectedDriver: "postgres" }],
    ["owner approval approved", { ownerApprovalRecordStatus: "approved" }],
    ["package change detected", { packageChangeDetected: true }],
    ["pnpm lock change detected", { pnpmLockChangeDetected: true }],
    ["real DB connection detected", { realDbConnectionDetected: true }],
    ["package diff pass", { packageDiffReviewStatus: "pass" }],
    ["missing owner approval reason", { failureReasons: committedEvidence().failureReasons.filter((reason) => reason !== "owner_approval_missing") }],
    ["missing driver not selected reason", { failureReasons: committedEvidence().failureReasons.filter((reason) => reason !== "driver_not_selected") }]
  ])("committed dry-run evidence rejects %s", (_name, patch) => {
    expect(() => validateCommittedDbDriverApprovalDryRunEvidence(committedEvidence(patch) as never, {
      prNumber: 47,
      baseSha: baseCommit,
      staleHeadSha: "f3e10067ec542592de2c6acf8694042e638feba2"
    })).toThrow(/unsafe/i);
  });

  it.each(["password", "clientSecret", "apiKey", "refreshToken", "connectionString", "rawProviderResponse"])("dry-run rejects unsafe key %s", (key) => {
    expect(() => evaluateDbDriverApprovalDryRun({ ...completeFutureFixture(), [key]: "redacted" } as never, context())).toThrow(/unsafe key/i);
  });

  it("dry-run maps owner approval missing scope to owner_approval_scope_missing", () => {
    const record = evaluateDbDriverApprovalDryRun({
      ...completeFutureFixture(),
      ownerApprovalRecord: ownerApproval({ approval_scope: [] })
    }, context());
    expect(record.failure_reasons).toContain("owner_approval_scope_missing");
  });
});
