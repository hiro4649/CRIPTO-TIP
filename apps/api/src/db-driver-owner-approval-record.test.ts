import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
    approval_id: "db-driver-approval-owner-1",
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

function machineEvidence() {
  return JSON.parse(readFileSync(".codex/db-driver-owner-approval-record.json", "utf8")) as Record<string, unknown>;
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

  it.each(["dependabot[bot]", "renovate[bot]", "github-actions[bot]", "copilot", "chatgpt", "openai-assistant"])("rejects bracketed or AI actor %s", (actor) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_actor: actor }), context())).toThrow(/cannot approve|GitHub username/);
  });

  it("rejects empty actor", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_actor: "" }), context())).toThrow(/approved_by_actor/);
  });

  it.each([
    ["approval id with spaces", { approval_id: "db-driver approval bad" }],
    ["approval id with URL", { approval_id: ["https", "://private.example.test/approval"].join("") }],
    ["approval id with token-like value", { approval_id: "sk-approval-token" }]
  ])("rejects %s", (_label, patch) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord(patch), context())).toThrow(/approval_id|unsafe/);
  });

  it.each([
    ["slash", "owner/name"],
    ["at sign", "@hiro4649"],
    ["URL", ["https", "://example.test/actor"].join("")]
  ])("rejects approved_by_actor with %s", (_label, actor) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_actor: actor }), context())).toThrow(/GitHub username|unsafe/);
  });

  it("accepts hiro4649 actor", () => {
    expect(validateDbDriverOwnerApprovalRecord(approvedRecord({ approved_by_actor: "hiro4649" }), context()).approved_by_actor).toBe("hiro4649");
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

  it.each([
    ["package_change_allowed", { package_change_allowed: true, driver_package: "pg", driver_version_policy: "pinned" }],
    ["pnpm_lock_change_allowed", { package_change_allowed: true, pnpm_lock_change_allowed: true, driver_package: "pg", driver_version_policy: "pinned" }],
    ["real_db_connection_allowed", { real_db_connection_allowed: true, secret_manager_scope_required: true, db_credentials_storage_required: "secret_manager" }],
    ["live_db_integration_tests_allowed", { live_db_integration_tests_allowed: true }],
    ["migration_apply_allowed", { migration_apply_allowed: true }],
    ["non-empty approval_scope", { approval_scope: ["db_driver_dependency_introduction"] }],
    ["driver_package", { driver_package: "pg", driver_version_policy: "pinned" }],
    ["approval_fingerprint", { approval_fingerprint: "a".repeat(64) }]
  ])("not_approved rejects %s", (_label, patch) => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord(patch), context())).toThrow(/non-approved/);
  });

  it("rejected rejects package_change_allowed", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord({
      approval_status: "rejected",
      package_change_allowed: true,
      driver_package: "pg",
      driver_version_policy: "pinned"
    }), context())).toThrow(/non-approved/);
  });

  it("expired rejects real_db_connection_allowed", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord({
      approval_status: "expired",
      expires_at: "2026-06-10T11:00:00Z",
      real_db_connection_allowed: true,
      secret_manager_scope_required: true,
      db_credentials_storage_required: "secret_manager"
    }), context())).toThrow(/non-approved/);
  });

  it("absent rejects approval_scope", () => {
    expect(() => validateDbDriverOwnerApprovalRecord(withRecord({
      approval_status: "absent",
      approval_scope: ["db_driver_dependency_introduction"]
    }), context())).toThrow(/non-approved/);
  });

  it.each([
    ["package_change_allowed", { approval_scope: ["db_driver_dependency_introduction"], package_change_allowed: true, pnpm_lock_change_allowed: false }, /package_change_for_db_driver/],
    ["pnpm_lock_change_allowed", { approval_scope: ["db_driver_dependency_introduction", "package_change_for_db_driver"], pnpm_lock_change_allowed: true }, /pnpm_lock_change_for_db_driver/],
    ["driver_package", { approval_scope: ["package_change_for_db_driver"], package_change_allowed: true, pnpm_lock_change_allowed: false }, /db_driver_dependency_introduction/],
    ["real_db_connection_allowed", { real_db_connection_allowed: true, secret_manager_scope_required: true, db_credentials_storage_required: "secret_manager" }, /db_secret_manager_scope/],
    ["live_db_integration_tests_allowed", { approval_scope: [...allowedDbDriverApprovalScopes].filter((scope) => scope !== "live_db_integration_test_plan"), real_db_connection_allowed: true, secret_manager_scope_required: true, db_credentials_storage_required: "secret_manager", live_db_integration_tests_allowed: true }, /live_db_integration_test_plan/],
    ["migration_apply_allowed", { migration_apply_allowed: true }, /migration_apply_plan|rollback plan/]
  ])("approved %s requires matching approval scope", (_label, patch, message) => {
    expect(() => validateDbDriverOwnerApprovalRecord(approvedRecord({
      approval_scope: ["db_driver_dependency_introduction", "package_change_for_db_driver", "pnpm_lock_change_for_db_driver"],
      ...patch
    }), context())).toThrow(message);
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

  it.each([
    ["approval_status", { approval_status: "not_approved" as const }],
    ["expires_at", { expires_at: "2026-06-12T12:00:01Z" }],
    ["approved_by_actor", { approved_by_actor: "owner-two" }],
    ["package_change_allowed", { package_change_allowed: false }],
    ["driver_version_policy", { driver_version_policy: "different-pinning-policy" }]
  ])("fingerprint changes when %s changes", (_label, patch) => {
    const record = approvedRecord();
    expect(computeDbDriverOwnerApprovalFingerprint({ ...record, approval_fingerprint: undefined, ...patch })).not.toBe(record.approval_fingerprint);
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

  it("machine-readable DB driver owner approval evidence is bound to PR 45 and rejects known stale head", () => {
    const evidence = machineEvidence();
    expect(evidence.prNumber).toBe(45);
    expect(evidence.headSha).not.toBe("0479c08a5a9d1e5184c4f51d9596243476d3175d");
    expect(evidence.baseSha).toBe("0479c08a5a9d1e5184c4f51d9596243476d3175d");
  });

  it("machine-readable DB driver owner approval evidence remains not_approved with all real DB permissions false", () => {
    const evidence = machineEvidence();
    expect(evidence.approvalRecordStatus).toBe("not_approved");
    expect(evidence.ownerApprovalPresent).toBe(false);
    expect(evidence.approvalFingerprintStatus).toBe("not_applicable");
    expect(evidence.dbDriverDependencyAllowed).toBe(false);
    expect(evidence.packageChangeAllowed).toBe(false);
    expect(evidence.pnpmLockChangeAllowed).toBe(false);
    expect(evidence.realDbConnectionAllowed).toBe(false);
    expect(evidence.liveDbIntegrationTestsAllowed).toBe(false);
    expect(evidence.migrationApplyAllowed).toBe(false);
    expect(evidence.providerSdkApplyAllowed).toBe(false);
    expect(evidence.actualProductionDeploymentAllowed).toBe(false);
    expect(evidence.runtimeReadinessClaimAllowed).toBe(false);
    expect(evidence.productionReadinessClaimAllowed).toBe(false);
    expect(evidence.legalComplianceClaimAllowed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimAllowed).toBe(false);
    expect(evidence.safeDefaults).toBe(true);
    expect(evidence.forbiddenScopeStatus).toBe("pass");
  });
});
