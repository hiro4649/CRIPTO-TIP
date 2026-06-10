import { readFileSync } from "node:fs";
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
  prNumber: 49,
  targetBranch: "feat/db-driver-readiness-report-v116-prep",
  targetCommitSha: "1234567890abcdef1234567890abcdef12345678",
  baseCommitSha: "f8b52aa81360cda462e8926a76730db8c0ce20b2",
  createdAt: "2026-06-10T00:00:00.000Z",
  harnessVersion: "1.1.6"
};

function ownerApproval() {
  return createDefaultDbDriverOwnerApprovalRecord(context);
}

function preflightPolicy(overrides = {}) {
  return {
    ...createDefaultDbDriverPreflightPolicyRecord(context),
    ...overrides
  };
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

function reportFromParts({
  owner = ownerApproval(),
  preflight = preflightPolicy(),
  approval = dryRun()
} = {}) {
  return buildDbDriverReadinessReport({
    ownerApprovalRecord: owner,
    preflightPolicyRecord: preflight,
    approvalDryRunRecord: approval
  }, context);
}

function committedReport() {
  return JSON.parse(readFileSync(".codex/db-driver-readiness-report.json", "utf8")) as {
    prNumber: number;
    headSha: string;
    baseSha: string;
    readinessStatus: string;
    selectedDriver: string | null;
    ownerApprovalStatus: string;
    preflightPolicyStatus: string;
    approvalDryRunStatus: string;
    blockers: string[];
    forbiddenScopeStatus: string;
  };
}

describe("db driver readiness report", () => {
  it("keeps committed readiness report not_ready without selecting a driver", () => {
    const result = report();

    expect(result.readiness_status).toBe("not_ready");
    expect(result.selected_driver).toBeNull();
    expect(result.owner_approval_status).toBe("not_approved");
    expect(result.preflight_policy_status).toBe("pass");
    expect(result.forbidden_scope_status).toBe("pass");
    expect(result.safe_summary).toContain("No driver dependency is authorized");
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

  it("keeps machine-readable committed report bound to PR 49 instead of stale PR 48/base head", () => {
    const evidence = committedReport();

    expect(evidence.prNumber).toBe(49);
    expect(evidence.headSha).toMatch(/^[0-9a-f]{40}$/i);
    expect(evidence.headSha).not.toBe("f8b52aa81360cda462e8926a76730db8c0ce20b2");
    expect(evidence.baseSha).toBe("f8b52aa81360cda462e8926a76730db8c0ce20b2");
    expect(evidence.readinessStatus).toBe("not_ready");
    expect(evidence.selectedDriver).toBeNull();
    expect(evidence.ownerApprovalStatus).toBe("not_approved");
    expect(evidence.preflightPolicyStatus).toBe("pass");
    expect(evidence.approvalDryRunStatus).toBe("not_ready");
    expect(evidence.forbiddenScopeStatus).toBe("pass");
    expect(evidence.blockers).toEqual(expect.arrayContaining([
      "owner_approval_not_approved",
      "driver_not_selected",
      "approval_dry_run_not_pass"
    ]));
  });

  it("rejects committed report if a driver is selected", () => {
    const result = report({ selected_driver: "pg" });

    expect(result.blockers).toContain("selected_driver_forbidden_in_committed_report");
    expect(result.forbidden_scope_status).toBe("fail");
    expect(() => validateCommittedDbDriverReadinessReport(result)).toThrow(/selected_driver_present/);
  });

  it.each([
    ["ready fixture", { readiness_status: "ready" }, /readiness_status_not_not_ready/],
    ["empty blockers", { blockers: [] }, /missing_owner_approval_not_approved/],
    ["approved owner", { owner_approval_status: "approved" }, /owner_approval_not_not_approved/],
    ["passing approval dry-run", { approval_dry_run_status: "pass" }, /approval_dry_run_status_pass/],
    ["selected pg driver", { selected_driver: "pg" }, /selected_driver_present/]
  ] as const)("rejects unsafe committed %s", (_label, overrides, expected) => {
    const result = report();
    const mutated = {
      ...result,
      ...overrides
    } as typeof result;

    expect(() => validateCommittedDbDriverReadinessReport(mutated)).toThrow(expected);
  });

  it.each([
    ["package change", { package_change_detected: true }, "package_or_lockfile_change_forbidden"],
    ["pnpm lock change", { pnpm_lock_change_detected: true }, "package_or_lockfile_change_forbidden"],
    ["real DB connection", { real_db_connection_detected: true }, "real_db_connection_forbidden"],
    ["migration apply", { migration_change_detected: true }, "migration_apply_forbidden"],
    ["provider SDK apply", { provider_sdk_apply_detected: true }, "provider_sdk_apply_forbidden"],
    ["production deployment", { production_deployment_detected: true }, "production_deployment_forbidden"],
    ["runtime readiness claim", { runtime_readiness_claim_detected: true }, "readiness_claim_forbidden"],
    ["production readiness claim", { production_readiness_claim_detected: true }, "readiness_claim_forbidden"],
    ["legal compliance claim", { legal_compliance_claim_detected: true }, "legal_compliance_claim_forbidden"],
    ["YouTube policy compliance claim", { youtube_policy_compliance_claim_detected: true }, "youtube_policy_compliance_claim_forbidden"]
  ] as const)("marks forbidden scope for %s", (_label, overrides, blocker) => {
    const result = report(overrides);

    expect(result.forbidden_scope_status).toBe("fail");
    expect(result.blockers).toContain(blocker);
    expect(() => validateCommittedDbDriverReadinessReport(result)).toThrow(/forbidden_scope_not_pass/);
  });

  it.each([
    ["legal preflight claim", { legal_compliance_claim_allowed: true }, "legal_compliance_claim_forbidden"],
    ["YouTube policy preflight claim", { youtube_policy_compliance_claim_allowed: true }, "youtube_policy_compliance_claim_forbidden"],
    ["selected preflight policy", { driver_choice_status: "selected", selected_driver: "pg" }, "selected_driver_forbidden_in_committed_report"]
  ] as const)("marks forbidden scope for %s", (_label, preflightOverrides, blocker) => {
    const result = reportFromParts({ preflight: preflightPolicy(preflightOverrides) });

    expect(result.forbidden_scope_status).toBe("fail");
    expect(result.blockers).toContain(blocker);
    expect(() => validateCommittedDbDriverReadinessReport(result)).toThrow(/forbidden_scope_not_pass/);
  });

  it("keeps not_ready when preflight policy status passes without driver selection", () => {
    const result = reportFromParts({ preflight: preflightPolicy() });

    expect(result.preflight_policy_status).toBe("pass");
    expect(result.readiness_status).toBe("not_ready");
    expect(result.selected_driver).toBeNull();
    expect(result.blockers).toContain("driver_not_selected");
  });

  it("rejects context mismatch across source evidence", () => {
    const badDryRun = dryRun({ target_commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });

    expect(() => buildDbDriverReadinessReport({
      ownerApprovalRecord: ownerApproval(),
      preflightPolicyRecord: preflightPolicy(),
      approvalDryRunRecord: badDryRun
    }, context)).toThrow(/head mismatch/);
  });

  it.each([
    ["owner repository", { owner: { ...ownerApproval(), repository: "other/repo" } }, /repository mismatch/],
    ["owner PR", { owner: { ...ownerApproval(), pr_number: 48 } }, /PR mismatch/],
    ["owner branch", { owner: { ...ownerApproval(), target_branch: "other" } }, /branch mismatch/],
    ["owner head", { owner: { ...ownerApproval(), target_commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } }, /head mismatch/],
    ["owner base", { owner: { ...ownerApproval(), base_commit_sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } }, /base mismatch/],
    ["preflight repository", { preflight: preflightPolicy({ repository: "other/repo" }) }, /repository mismatch/],
    ["preflight PR", { preflight: preflightPolicy({ pr_number: 48 }) }, /PR mismatch/],
    ["preflight branch", { preflight: preflightPolicy({ target_branch: "other" }) }, /branch mismatch/],
    ["preflight head", { preflight: preflightPolicy({ target_commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }) }, /head mismatch/],
    ["preflight base", { preflight: preflightPolicy({ base_commit_sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }) }, /base mismatch/]
  ] as const)("rejects %s context mismatch", (_label, parts, expected) => {
    expect(() => reportFromParts(parts)).toThrow(expected);
  });

  it.each([
    ["private URL value", { safe_summary: "private endpoint https://example.invalid" }],
    ["wallet address value", { safe_summary: "wallet 0x1111111111111111111111111111111111111111" }],
    ["token-like value", { safe_summary: "token sk-test" }],
    ["unsafe key", { nested: { apiKey: "safe-looking" } }]
  ] as const)("rejects unsafe readiness report %s", (_label, unsafe) => {
    const result = report();

    expect(() => validateCommittedDbDriverReadinessReport({
      ...result,
      ...unsafe
    })).toThrow(/unsafe/);
  });
});
