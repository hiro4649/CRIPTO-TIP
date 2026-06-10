import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverApprovalDryRunRecord,
  type DbDriverApprovalDryRunRecord
} from "./db-driver-approval-dry-run.js";
import {
  buildDbDriverReadinessReport,
  validateCommittedDbDriverReadinessReport
} from "./db-driver-readiness-report.js";
import { createDefaultDbDriverOwnerApprovalRecord } from "./db-driver-owner-approval-record.js";
import { createDefaultDbDriverPreflightPolicyRecord } from "./db-driver-preflight-policy.js";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 48,
  targetBranch: "feat/db-driver-readiness-report-v116-prep",
  targetCommitSha: "1234567890abcdef1234567890abcdef12345678",
  baseCommitSha: "f8b52aa81360cda462e8926a76730db8c0ce20b2",
  createdAt: "2026-06-10T00:00:00.000Z",
  harnessVersion: "1.1.6"
};

function ownerApproval() {
  return createDefaultDbDriverOwnerApprovalRecord(context);
}

function preflightPolicy() {
  return createDefaultDbDriverPreflightPolicyRecord(context);
}

function dryRun(overrides: Partial<DbDriverApprovalDryRunRecord> = {}) {
  return {
    ...createDefaultDbDriverApprovalDryRunRecord({
      ...context,
      dryRunId: "db-driver-readiness-report-test"
    }),
    ...overrides
  };
}

function report(overrides: Partial<DbDriverApprovalDryRunRecord> = {}) {
  return buildDbDriverReadinessReport({
    ownerApprovalRecord: ownerApproval(),
    preflightPolicyRecord: preflightPolicy(),
    approvalDryRunRecord: dryRun(overrides)
  }, context);
}

describe("db driver readiness report", () => {
  it("keeps committed readiness report not_ready without selecting a driver", () => {
    const result = report();

    expect(result.readiness_status).toBe("not_ready");
    expect(result.selected_driver).toBeNull();
    expect(result.owner_approval_status).toBe("not_approved");
    expect(result.forbidden_scope_status).toBe("pass");
    expect(result.blockers).toEqual(expect.arrayContaining([
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
    ]));
    expect(validateCommittedDbDriverReadinessReport(result)).toBe(result);
  });

  it("rejects committed report if a driver is selected", () => {
    const result = report({ selected_driver: "pg" });

    expect(result.blockers).toContain("selected_driver_forbidden_in_committed_report");
    expect(result.forbidden_scope_status).toBe("fail");
    expect(() => validateCommittedDbDriverReadinessReport(result)).toThrow(/selected_driver_present/);
  });

  it.each([
    ["package change", { package_change_detected: true }, "package_or_lockfile_change_forbidden"],
    ["pnpm lock change", { pnpm_lock_change_detected: true }, "package_or_lockfile_change_forbidden"],
    ["real DB connection", { real_db_connection_detected: true }, "real_db_connection_forbidden"],
    ["migration apply", { migration_change_detected: true }, "migration_apply_forbidden"],
    ["provider SDK apply", { provider_sdk_apply_detected: true }, "provider_sdk_apply_forbidden"],
    ["production deployment", { production_deployment_detected: true }, "production_deployment_forbidden"],
    ["runtime readiness claim", { runtime_readiness_claim_detected: true }, "readiness_claim_forbidden"],
    ["production readiness claim", { production_readiness_claim_detected: true }, "readiness_claim_forbidden"]
  ] as const)("marks forbidden scope for %s", (_label, overrides, blocker) => {
    const result = report(overrides);

    expect(result.forbidden_scope_status).toBe("fail");
    expect(result.blockers).toContain(blocker);
    expect(() => validateCommittedDbDriverReadinessReport(result)).toThrow(/forbidden_scope_not_pass/);
  });

  it("rejects context mismatch across source evidence", () => {
    const badDryRun = dryRun({ target_commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });

    expect(() => buildDbDriverReadinessReport({
      ownerApprovalRecord: ownerApproval(),
      preflightPolicyRecord: preflightPolicy(),
      approvalDryRunRecord: badDryRun
    }, context)).toThrow(/head mismatch/);
  });

  it("rejects unsafe readiness report evidence values", () => {
    const result = report();

    expect(() => validateCommittedDbDriverReadinessReport({
      ...result,
      safe_summary: "private endpoint https://example.invalid"
    })).toThrow(/unsafe evidence/);
  });
});
