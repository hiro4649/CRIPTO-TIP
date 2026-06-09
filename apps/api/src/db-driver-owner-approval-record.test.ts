import { describe, expect, it } from "vitest";
import {
  allowedDbDriverApprovalScopes,
  computeDbDriverOwnerApprovalFingerprint,
  createDefaultDbDriverOwnerApprovalRecord,
  validateDbDriverOwnerApprovalRecord,
  type DbDriverOwnerApprovalContext,
  type DbDriverOwnerApprovalRecord
} from "./db-driver-owner-approval-record.js";

const targetCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const baseCommit = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const otherCommit = "cccccccccccccccccccccccccccccccccccccccc";

const context = (): DbDriverOwnerApprovalContext => ({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 45,
  targetBranch: "feat/db-driver-owner-approval-record-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit,
  now: "2026-06-10T12:00:00Z"
});

const base = () => createDefaultDbDriverOwnerApprovalRecord({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 45,
  targetBranch: "feat/db-driver-owner-approval-record-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit,
  createdAt: "2026-06-10T00:00:00Z"
});

function withRecord(patch: Partial<DbDriverOwnerApprovalRecord>) {
  return { ...base(), ...patch };
}

function approvedRecord(patch: Partial<DbDriverOwnerApprovalRecord> = {}) {
  const record = withRecord({
    approval_id: "db-driver-owner-approval-1",
    approval_status: "approved",
    approval_scope: ["db_driver_dependency_introduction", "package_change_for_db_driver", "pnpm_lock_change_for_db_driver"],
    approved_by_role: "project-owner",
    approved_by_actor: "hiro4649",
    approved_at: "2026-06-10T12:00:00Z",
    expires_at: "2026-06-12T12:00:00Z",
    driver_package: "pg",
    driver_version_policy: "pinned-semver-with-security-review",
    package_change_allowed: true,
    pnpm_lock_change_allowed: true,
    ...patch
  });
  return { ...record, approval_fingerprint: computeDbDriverOwnerApprovalFingerprint(record) };
}

describe("DB driver owner approval record", () => {
  it("default record is not_approved and disables DB driver scope", () => {
    const record = validateDbDriverOwnerApprovalRecord(base(), context());
    expect(record.approval_status).toBe("not_approved");
    expect(record.package_change_allowed).toBe(false);
    expect(record.pnpm_lock_change_allowed).toBe(false);
    expect(record.real_db_connection_allowed).toBe(false);
    expect(record.live_db_integration_tests_allowed).toBe(false);
    expect(record.migration_apply_allowed).toBe(false);
    expect(record.provider_sdk_apply_allowed).toBe(false);
    expect(record.actual_production_deployment_allowed).toBe(false);
  });

  it.each([
    ["package change", { package_change_allowed: true }],
    ["pnpm lock change", { pnpm_lock_change_allowed: true }],
    ["real DB connection", { real_db_connection_allowed: true }],
    ["live DB integration", { live_db_integration_tests_allowed: true }],
    ["migration apply", { migration_apply_allowed: true }],
    ["provider SDK apply", { provider_sdk_apply_allowed: true }],
    ["production deployment", { actual_production_deployment_allowed: true }],
    ["runtime readiness", { runtime_readiness_claim_allowed: true }],
    ["production readiness", { production_readiness_claim_allowed: true }],
    ["legal compliance", { legal_compliance_claim_allowed: true }],
    ["YouTube policy compliance", { youtube_policy_compliance_claim_allowed: true }]
  ])("default-style record rejects %s expansion", (_label, patch) => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord(patch), context())).toThrow();
  });

  it("rejects approved record missing project-owner role", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_role: "developer" }), context())).toThrow(/project-owner/);
  });

  it.each(["ai-reviewer", "github-actions", "codex", "assistant", "release-bot", "unknown"])("rejects %s actor", (actor) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_actor: actor }), context())).toThrow(/cannot approve/);
  });

  it("rejects missing approved_at", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_at: undefined }), context())).toThrow(/approved_at/);
  });

  it("rejects missing expires_at", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ expires_at: undefined }), context())).toThrow(/expires_at/);
  });

  it("rejects expired approval", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ expires_at: "2026-06-10T11:00:00Z" }), context())).toThrow(/expired|after/);
  });

  it("rejects expires_at beyond 72 hours", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ expires_at: "2026-06-14T12:00:01Z" }), context())).toThrow(/72 hours/);
  });

  it("rejects wrong repository", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ repository: "other/repo" }), context())).toThrow(/repository/);
  });

  it("rejects wrong branch", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ target_branch: "feat/other" }), context())).toThrow(/branch/);
  });

  it("rejects wrong PR number", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ pr_number: 99 }), context())).toThrow(/PR number/);
  });

  it("rejects wrong target commit", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ target_commit_sha: otherCommit }), context())).toThrow(/target commit/);
  });

  it("rejects wrong base commit", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ base_commit_sha: otherCommit }), context())).toThrow(/base commit/);
  });

  it.each([
    "real_provider_sdk_apply",
    "actual_production_deployment",
    "runtime_readiness_claim",
    "production_readiness_claim",
    "legal_compliance_claim",
    "youtube_policy_compliance_claim",
    "token_sale",
    "token_exchange",
    "cash_out",
    "custody",
    "internal_balance",
    "investment_wording",
    "youtube_scraping",
    "wallet_rpc_deploy_change",
    "youtube_connector_change",
    "chain_listener_change"
  ])("rejects forbidden approval scope %s", (scope) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approval_scope: [scope] }), context())).toThrow(/approval_scope/);
  });

  it("accepts all allowed approval scopes", () => {
    const record = approvedRecord({
      approval_scope: [...allowedDbDriverApprovalScopes],
      real_db_connection_allowed: true,
      live_db_integration_tests_allowed: true,
      migration_apply_allowed: true,
      secret_manager_scope_required: true,
      db_credentials_storage_required: "secret_manager"
    });
    expect(validateDbDriverOwnerApprovalRecord(record, context()).approval_scope).toEqual([...allowedDbDriverApprovalScopes]);
  });

  it("rejects package change without driver package", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ driver_package: undefined }), context())).toThrow(/driver_package/);
  });

  it("rejects driver package without version policy", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ driver_version_policy: "not_selected" }), context())).toThrow(/driver_version_policy/);
  });

  it("rejects real DB connection without secret manager scope", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ real_db_connection_allowed: true }), context())).toThrow(/secret manager/);
  });

  it("rejects real DB connection without secret_manager credential storage", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({
      real_db_connection_allowed: true,
      secret_manager_scope_required: true,
      db_credentials_storage_required: "not_allowed"
    }), context())).toThrow(/secret_manager/);
  });

  it("rejects live DB integration without real DB connection allowed", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ live_db_integration_tests_allowed: true }), context())).toThrow(/real DB connection/);
  });

  it("rejects migration apply without rollback plan scope", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ migration_apply_allowed: true }), context())).toThrow(/rollback plan/);
  });

  it.each([
    ["raw DB connection string", { driver_version_policy: "postgres://user:pass@example/db" }],
    ["private URL", { driver_version_policy: ["https", "://private.example.test/policy"].join("") }],
    ["wallet address", { approval_id: "0x1234567890abcdef1234567890abcdef12345678" }],
    ["token-like value", { approval_id: "sk-test-token" }],
    ["raw provider response", { driver_version_policy: "raw provider response" }],
    ["raw GitHub logs reference", { driver_version_policy: ["gh run view", "--log 123"].join(" ") }]
  ])("rejects %s", (_label, patch) => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord(patch), context())).toThrow(/unsafe/);
  });

  it("fingerprint is stable for canonical fields", () => {
    const record = approvedRecord();
    const reordered = { ...record, approval_fingerprint: undefined };
    expect(computeDbDriverOwnerApprovalFingerprint(reordered)).toBe(record.approval_fingerprint);
  });

  it("fingerprint changes when target commit changes", () => {
    const record = approvedRecord();
    expect(computeDbDriverOwnerApprovalFingerprint({ ...record, approval_fingerprint: undefined, target_commit_sha: otherCommit })).not.toBe(record.approval_fingerprint);
  });

  it("fingerprint changes when approval scope changes", () => {
    const record = approvedRecord();
    expect(computeDbDriverOwnerApprovalFingerprint({ ...record, approval_fingerprint: undefined, approval_scope: ["db_secret_manager_scope"] })).not.toBe(record.approval_fingerprint);
  });

  it("rejects replay on another branch", () => {
    const replay = approvedRecord({ target_branch: "feat/copied-branch" });
    expect(() => validateDbDriverOwnerApprovalRecord(replay, context())).toThrow(/branch/);
  });

  it("rejects replay on another PR", () => {
    const replay = approvedRecord({ pr_number: 46 });
    expect(() => validateDbDriverOwnerApprovalRecord(replay, context())).toThrow(/PR number/);
  });

  it("rejects replay on another commit even with copied fingerprint", () => {
    const record = approvedRecord();
    const replay = { ...record, target_commit_sha: otherCommit };
    expect(() => validateDbDriverOwnerApprovalRecord(replay, { ...context(), targetCommitSha: otherCommit })).toThrow(/fingerprint/);
  });

  it("accepts future approved record only with owner, target binding, expiry, fingerprint, and allowed scope", () => {
    expect(validateDbDriverOwnerApprovalRecord(approvedRecord(), context()).approval_status).toBe("approved");
  });

  it("PR evidence default remains not_approved", () => {
    const evidence = base();
    expect(evidence.approval_status).toBe("not_approved");
    expect(evidence.package_change_allowed).toBe(false);
  });
});
