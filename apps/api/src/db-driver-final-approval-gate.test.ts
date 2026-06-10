import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverApprovalDryRunRecord,
  type DbDriverApprovalDryRunRecord
} from "./db-driver-approval-dry-run.js";
import {
  assertNoUnsafeDbDriverFinalApprovalGateEvidence,
  buildDbDriverFinalApprovalGate,
  validateCommittedDbDriverFinalApprovalGateRecord,
  type DbDriverFinalApprovalGateRecord
} from "./db-driver-final-approval-gate.js";
import {
  computeDbDriverOwnerApprovalFingerprint,
  createDefaultDbDriverOwnerApprovalRecord,
  type DbDriverOwnerApprovalRecord
} from "./db-driver-owner-approval-record.js";
import { createDefaultDbDriverPreflightPolicyRecord, type DbDriverPreflightPolicyRecord } from "./db-driver-preflight-policy.js";
import { buildDbDriverReadinessReport, type DbDriverReadinessReport } from "./db-driver-readiness-report.js";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 50,
  targetBranch: "feat/db-driver-final-approval-gate-v117-prep",
  targetCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  baseCommitSha: "735557519cbf3b1cc1b186c5591744336d4d7eeb",
  createdAt: "2026-06-10T00:00:00.000Z",
  harnessVersion: "1.1.6"
};

function ownerApproval(patch: Partial<DbDriverOwnerApprovalRecord> = {}) {
  return {
    ...createDefaultDbDriverOwnerApprovalRecord(context),
    ...patch
  };
}

function preflightPolicy(patch: Partial<DbDriverPreflightPolicyRecord> = {}) {
  return {
    ...createDefaultDbDriverPreflightPolicyRecord(context),
    ...patch
  };
}

function dryRun(patch: Partial<DbDriverApprovalDryRunRecord> = {}) {
  return {
    ...createDefaultDbDriverApprovalDryRunRecord({
      ...context,
      dryRunId: "db-driver-final-approval-gate-test"
    }),
    ...patch
  };
}

function readinessReport(patch: Partial<DbDriverReadinessReport> = {}) {
  return {
    ...buildDbDriverReadinessReport({
      ownerApprovalRecord: ownerApproval(),
      preflightPolicyRecord: preflightPolicy(),
      approvalDryRunRecord: dryRun()
    }, context),
    ...patch
  };
}

function gate(parts: {
  owner?: DbDriverOwnerApprovalRecord;
  preflight?: DbDriverPreflightPolicyRecord;
  approval?: DbDriverApprovalDryRunRecord;
  readiness?: DbDriverReadinessReport;
} = {}) {
  const owner = parts.owner ?? ownerApproval();
  const preflight = parts.preflight ?? preflightPolicy();
  const approval = parts.approval ?? dryRun();
  const readiness = parts.readiness ?? readinessReport();
  return buildDbDriverFinalApprovalGate({
    ownerApprovalRecord: owner,
    preflightPolicyRecord: preflight,
    approvalDryRunRecord: approval,
    readinessReport: readiness
  }, context);
}

function approvedOwner() {
  const record = {
    ...ownerApproval(),
    approval_id: "db-driver-final-approval-test",
    approval_status: "approved",
    approval_scope: ["db_driver_dependency_introduction", "package_change_for_db_driver", "pnpm_lock_change_for_db_driver"],
    approved_by_role: "project-owner",
    approved_by_actor: "hiro4649",
    approved_at: "2026-06-10T00:10:00.000Z",
    expires_at: "2026-06-11T00:10:00.000Z",
    driver_package: "pg",
    driver_version_policy: "exact",
    package_change_allowed: true,
    pnpm_lock_change_allowed: true
  } satisfies DbDriverOwnerApprovalRecord;
  return {
    ...record,
    approval_fingerprint: computeDbDriverOwnerApprovalFingerprint(record)
  };
}

function completeFutureFixture() {
  const owner = approvedOwner();
  const preflight = preflightPolicy({
    driver_choice_status: "selected",
    selected_driver: "pg",
    owner_approval_record_status: "approved",
    package_change_allowed: true,
    pnpm_lock_change_allowed: true
  });
  const approval = dryRun({
    dry_run_status: "pass",
    selected_driver: "pg",
    owner_approval_record_status: "approved",
    owner_approval_record_fingerprint_status: "pass",
    preflight_policy_status: "pass",
    license_review_status: "pass",
    supply_chain_review_status: "pass",
    security_advisory_review_status: "pass",
    version_pinning_review_status: "pass",
    lockfile_review_status: "pass",
    package_diff_review_status: "pass",
    secret_boundary_review_status: "pass",
    failure_reasons: [],
    safe_summary: "Test-only final approval fixture is complete without authorizing current committed evidence."
  });
  const readiness = readinessReport({
    readiness_status: "ready",
    selected_driver: "pg",
    owner_approval_status: "approved",
    preflight_policy_status: "pass",
    approval_dry_run_status: "pass",
    blockers: [],
    forbidden_scope_status: "pass",
    safe_summary: "Test-only readiness fixture is ready for a future dependency PR."
  });
  return gate({ owner, preflight, approval, readiness });
}

function committedGateFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-final-approval-gate.json", "utf8")) as DbDriverFinalApprovalGateRecord;
}

describe("db driver final approval gate", () => {
  it("keeps committed final approval gate blocked without selecting a driver", () => {
    const result = gate();

    expect(result.gate_status).toBe("blocked");
    expect(result.selected_driver).toBeNull();
    expect(result.owner_approval_status).toBe("not_approved");
    expect(result.owner_approval_fingerprint_status).toBe("not_applicable");
    expect(result.readiness_report_status).toBe("not_ready");
    expect(result.preflight_policy_status).toBe("pass");
    expect(result.approval_dry_run_status).toBe("not_ready");
    expect(result.forbidden_scope_status).toBe("pass");
    expect(result.blockers).toEqual(expect.arrayContaining([
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
    ]));
    expect(validateCommittedDbDriverFinalApprovalGateRecord(result)).toBe(result);
  });

  it("keeps machine-readable final approval evidence blocked and unapproved", () => {
    const evidence = committedGateFromDisk();

    expect(evidence.pr_number).toBe(50);
    expect(evidence.target_commit_sha).toMatch(/^[0-9a-f]{40}$/i);
    expect(evidence.target_commit_sha).not.toBe("89bc65a7eb173b4ec6964387d9e52eb6f9913a02");
    expect(evidence.target_commit_sha).not.toBe("d0113b8d4bb2a3473874ee23895fdc85e165b132");
    expect(evidence.target_commit_sha).not.toBe(evidence.base_commit_sha);
    expect(evidence.gate_status).toBe("blocked");
    expect(evidence.selected_driver).toBeNull();
    expect(evidence.owner_approval_status).toBe("not_approved");
    expect(evidence.owner_approval_fingerprint_status).toBe("not_applicable");
    expect(evidence.readiness_report_status).toBe("not_ready");
    expect(evidence.approval_dry_run_status).toBe("not_ready");
    expect(evidence.package_change_allowed).toBe(false);
    expect(evidence.pnpm_lock_change_allowed).toBe(false);
    expect(evidence.blockers).toContain("package_change_not_approved");
    expect(evidence.blockers).toContain("pnpm_lock_change_not_approved");
    expect(evidence.forbidden_scope_status).toBe("pass");
    expect(validateCommittedDbDriverFinalApprovalGateRecord(evidence)).toBe(evidence);
  });

  it("allows a future complete fixture to reach approved_for_dependency_pr only in test code", () => {
    const result = completeFutureFixture();

    expect(result.gate_status).toBe("approved_for_dependency_pr");
    expect(result.selected_driver).toBe("pg");
    expect(result.blockers).toEqual([]);
    expect(() => validateCommittedDbDriverFinalApprovalGateRecord(result)).toThrow(/must remain blocked/);
  });

  it.each([
    ["selected driver", { selected_driver: "pg" }, /must not select a driver/],
    ["postgres selected driver", { selected_driver: "postgres" }, /must not select a driver/],
    ["ready owner review gate", { gate_status: "ready_for_owner_review" }, /must remain blocked/],
    ["approved gate", { gate_status: "approved_for_dependency_pr" }, /must remain blocked/],
    ["empty blockers", { blockers: [] }, /must keep blockers/],
    ["owner-only blocker", { blockers: ["owner_approval_not_approved"] }, /must not be ready_for_owner_review/],
    ["approved owner", { owner_approval_status: "approved" }, /must remain not_approved/],
    ["valid owner fingerprint", { owner_approval_fingerprint_status: "pass" }, /must remain not_applicable/],
    ["ready readiness report", { readiness_report_status: "ready" }, /must remain not_ready/],
    ["passing dry-run", { approval_dry_run_status: "pass" }, /must remain not_ready/],
    ["passing license review", { license_review_status: "pass" }, /license_review_status must remain missing/]
  ] as const)("rejects committed evidence with %s", (_label, patch, expected) => {
    const result = {
      ...gate(),
      ...patch
    } as DbDriverFinalApprovalGateRecord;

    expect(() => validateCommittedDbDriverFinalApprovalGateRecord(result)).toThrow(expected);
  });

  it.each([
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
  ] as const)("rejects committed %s=true", (key) => {
    const result = {
      ...gate(),
      [key]: true
    } as DbDriverFinalApprovalGateRecord;

    expect(() => validateCommittedDbDriverFinalApprovalGateRecord(result)).toThrow(new RegExp(`${key} must remain false`));
  });

  it.each([
    ["unsafe key password", { password: "safe-looking" }],
    ["unsafe key clientSecret", { clientSecret: "safe-looking" }],
    ["unsafe key apiKey", { apiKey: "safe-looking" }],
    ["unsafe key refreshToken", { refreshToken: "safe-looking" }],
    ["unsafe key connectionString", { connectionString: "safe-looking" }],
    ["unsafe key rawProviderResponse", { rawProviderResponse: "safe-looking" }],
    ["private URL", "private URL https://example.invalid/dashboard"],
    ["DB connection string", "postgres://user:pass@db.local:5432/app"],
    ["wallet address", "0x1111111111111111111111111111111111111111"],
    ["token-like value", "Bearer abc.def.ghi"],
    ["GitHub raw trace reference", "raw GitHub logs include failure payload"],
    ["raw provider response", "raw provider response: unavailable"]
  ] as const)("rejects unsafe %s evidence", (_label, unsafeValue) => {
    if (typeof unsafeValue === "string") {
      expect(() => gate({
        readiness: readinessReport({ safe_summary: unsafeValue })
      })).toThrow(/unsafe DB driver final approval evidence rejected/);
      return;
    }
    expect(() => assertNoUnsafeDbDriverFinalApprovalGateEvidence(unsafeValue)).toThrow(/unsafe DB driver final approval evidence rejected/);
  });

  it.each([
    ["target commit", { target_commit_sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }, /target_commit_sha/],
    ["base commit", { base_commit_sha: "cccccccccccccccccccccccccccccccccccccccc" }, /base_commit_sha/],
    ["branch", { target_branch: "other-branch" }, /target_branch/],
    ["PR number", { pr_number: 999 }, /pr_number/]
  ] as const)("rejects %s mismatch across inputs", (_label, patch, expected) => {
    const approval = dryRun(patch);

    expect(() => gate({ approval })).toThrow(expected);
  });

  it("does not commit the future complete fixture as machine-readable evidence", () => {
    const evidence = committedGateFromDisk();
    const future = completeFutureFixture();

    expect(evidence).not.toEqual(future);
    expect(evidence.gate_status).not.toBe("approved_for_dependency_pr");
    expect(evidence.gate_status).toBe("blocked");
    expect(evidence.selected_driver).toBeNull();
    expect(evidence.owner_approval_status).toBe("not_approved");
    expect(evidence.package_change_allowed).toBe(false);
    expect(evidence.pnpm_lock_change_allowed).toBe(false);
    expect(evidence.real_db_connection_allowed).toBe(false);
    expect(evidence.actual_production_deployment_allowed).toBe(false);
    expect(() => validateCommittedDbDriverFinalApprovalGateRecord(future)).toThrow(/must remain blocked/);
  });

  it.each([
    ["owner driver only", { owner: approvedOwner(), preflight: preflightPolicy(), approval: dryRun(), readiness: readinessReport() }],
    ["preflight selected without dry-run", {
      preflight: preflightPolicy({ driver_choice_status: "selected", selected_driver: "pg", package_change_allowed: true, pnpm_lock_change_allowed: true }),
      approval: dryRun(),
      readiness: readinessReport()
    }],
    ["dry-run selected without readiness", {
      preflight: preflightPolicy({ driver_choice_status: "selected", selected_driver: "pg", package_change_allowed: true, pnpm_lock_change_allowed: true }),
      approval: dryRun({ selected_driver: "pg" }),
      readiness: readinessReport()
    }],
    ["mismatched selected drivers", {
      owner: approvedOwner(),
      preflight: preflightPolicy({ driver_choice_status: "selected", selected_driver: "pg", package_change_allowed: true, pnpm_lock_change_allowed: true }),
      approval: dryRun({ selected_driver: "postgres" }),
      readiness: readinessReport({ selected_driver: "pg" })
    }]
  ] as const)("blocks selected driver source mismatch for %s", (_label, parts) => {
    const result = gate(parts);

    expect(result.gate_status).toBe("blocked");
    expect(result.selected_driver).toBeNull();
    expect(result.blockers).toEqual(expect.arrayContaining(["driver_not_selected", "selected_driver_source_mismatch"]));
  });

  it("requires all selected driver sources to agree for the future complete fixture", () => {
    const result = completeFutureFixture();

    expect(result.gate_status).toBe("approved_for_dependency_pr");
    expect(result.selected_driver).toBe("pg");
  });

  it("keeps selected preflight policy alone blocked without owner approval or dry-run pass", () => {
    const result = gate({
      preflight: preflightPolicy({ driver_choice_status: "selected", selected_driver: "pg", package_change_allowed: true, pnpm_lock_change_allowed: true }),
      approval: dryRun(),
      readiness: readinessReport()
    });

    expect(result.gate_status).toBe("blocked");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "owner_approval_not_approved",
      "approval_dry_run_not_pass",
      "selected_driver_source_mismatch"
    ]));
  });
});
