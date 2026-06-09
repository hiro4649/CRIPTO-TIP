import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { allowedDbIntegrationRequestedScopes, createDefaultDbIntegrationScopeGateRecord, validateDbIntegrationScopeGateRecord, type DbIntegrationScopeGateRecord } from "./db-integration-scope-gate.js";

const base = () => createDefaultDbIntegrationScopeGateRecord({
  repository: "hiro4649/CRIPTO-TIP",
  targetBranch: "feat/db-integration-scope-gate-v116-prep",
  targetCommitSha: "6fd5ab1ebd0e147af5385144df10f7354f03c418",
  createdAt: "2026-06-10T00:00:00Z"
});

function withRecord(patch: Partial<DbIntegrationScopeGateRecord>) {
  return { ...base(), ...patch };
}

describe("DB integration scope gate", () => {
  it("default record is not approved and disables real DB scope", () => {
    const record = validateDbIntegrationScopeGateRecord(base());
    expect(record.approval_status).toBe("not_approved");
    expect(record.owner_approval_required).toBe(true);
    expect(record.package_change_allowed).toBe(false);
    expect(record.pnpm_lock_change_allowed).toBe(false);
    expect(record.real_db_connection_allowed).toBe(false);
    expect(record.live_db_integration_tests_allowed).toBe(false);
    expect(record.migration_apply_allowed).toBe(false);
    expect(record.provider_sdk_apply_allowed).toBe(false);
    expect(record.actual_production_deployment_allowed).toBe(false);
    expect(record.runtime_readiness_claim_allowed).toBe(false);
    expect(record.production_readiness_claim_allowed).toBe(false);
    expect(record.legal_compliance_claim_allowed).toBe(false);
    expect(record.youtube_policy_compliance_claim_allowed).toBe(false);
  });

  it("rejects approved without owner", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "approved",
      owner_approved_at: "2026-06-10T00:00:00Z"
    }))).toThrow(/owner_approved_by/);
  });

  it("rejects approved without timestamp", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "approved",
      owner_approved_by: "project-owner"
    }))).toThrow(/owner_approved_at/);
  });

  it("rejects non-owner approval role", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "approved",
      owner_approved_by: "ai-reviewer",
      owner_approved_at: "2026-06-10T00:00:00Z"
    }))).toThrow(/project-owner/);
  });

  it("rejects package change without driver package", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ package_change_allowed: true }))).toThrow(/db_driver_package/);
  });

  it("rejects real DB connection without secret manager scope", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ real_db_connection_allowed: true }))).toThrow(/secret manager/);
  });

  it("rejects live DB integration without real DB connection approval", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ live_db_integration_tests_allowed: true }))).toThrow(/real DB connection/);
  });

  it("rejects migration apply without rollback plan", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      migration_apply_allowed: true,
      migration_rollback_plan_required: false
    }))).toThrow(/rollback plan/);
  });

  it.each([
    ["provider SDK apply", { provider_sdk_apply_allowed: true }],
    ["production deployment", { actual_production_deployment_allowed: true }],
    ["runtime readiness claim", { runtime_readiness_claim_allowed: true }],
    ["production readiness claim", { production_readiness_claim_allowed: true }],
    ["legal compliance claim", { legal_compliance_claim_allowed: true }],
    ["YouTube policy compliance claim", { youtube_policy_compliance_claim_allowed: true }]
  ] as const)("rejects %s allowed", (_label, patch) => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord(patch))).toThrow(/forbidden/);
  });

  it.each([
    ["connection string value", { db_driver_version_policy: `use ${["postgresql", "://user:pass@example/db"].join("")}` }],
    ["private URL", { db_driver_version_policy: `see ${["https", "://private.example.test/db"].join("")}` }],
    ["wallet address", { db_driver_version_policy: "0x1234567890abcdef1234567890abcdef12345678" }],
    ["token-like value", { db_driver_version_policy: "sk-test-token" }],
    ["raw provider response", { requested_scope: ["raw_provider_response"] as string[] }],
    ["GitHub raw logs reference", { db_driver_version_policy: ["gh run view", "--log 123"].join(" ") }]
  ] as const)("rejects unsafe %s", (_label, patch) => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord(patch))).toThrow(/unsafe/);
  });

  it.each([
    "unknown_scope",
    "real_db_connection",
    "db_driver_dependency",
    "provider_sdk_apply",
    "production_deployment",
    "runtime_readiness_claim"
  ])("rejects requested scope %s", (scope) => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ requested_scope: [scope] }))).toThrow(/requested_scope/);
  });

  it("accepts allowed requested scopes", () => {
    const record = validateDbIntegrationScopeGateRecord(withRecord({ requested_scope: [...allowedDbIntegrationRequestedScopes] }));
    expect(record.requested_scope).toEqual([...allowedDbIntegrationRequestedScopes]);
  });

  it.each([
    ["space", "db integration scope"],
    ["private URL", ["https", "://private.example.test/scope"].join("")],
    ["token-like value", "sk-scope-token"]
  ])("rejects requested scope with %s", (_label, scope) => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ requested_scope: [scope] }))).toThrow(/requested_scope/);
  });

  it("rejects rejected without owner decision", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ approval_status: "rejected" }))).toThrow(/owner_decided_by/);
  });

  it("rejects rejected without owner decision timestamp", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "rejected",
      owner_decided_by: "project-owner"
    }))).toThrow(/owner_decided_at/);
  });

  it("accepts rejected with project-owner decision", () => {
    const record = validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "rejected",
      owner_decided_by: "project-owner",
      owner_decided_at: "2026-06-10T00:00:00Z"
    }));
    expect(record.approval_status).toBe("rejected");
  });

  it("rejects rejected with ai-reviewer decision", () => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "rejected",
      owner_decided_by: "ai-reviewer",
      owner_decided_at: "2026-06-10T00:00:00Z"
    }))).toThrow(/project-owner/);
  });

  it.each([
    "secretValue",
    "apiKeyValue",
    "refreshTokenValue",
    "connectionString",
    "postgresUrl"
  ])("rejects unsafe key %s", (key) => {
    expect(() => validateDbIntegrationScopeGateRecord(withRecord({ [key]: "redacted-reference" } as Partial<DbIntegrationScopeGateRecord>))).toThrow(/unsafe key/);
  });

  it("allows safe secret manager boundary fields", () => {
    const record = validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "approved",
      owner_approved_by: "project-owner",
      owner_approved_at: "2026-06-10T00:00:00Z",
      package_change_allowed: true,
      pnpm_lock_change_allowed: true,
      db_driver_package: "pg",
      db_driver_version_policy: "pinned-semver-with-security-review",
      real_db_connection_allowed: true,
      secret_manager_scope_required: true,
      db_credentials_storage_required: "secret_manager",
      live_db_integration_tests_allowed: true,
      migration_apply_allowed: true
    }));
    expect(record.secret_manager_scope_required).toBe(true);
    expect(record.db_credentials_storage_required).toBe("secret_manager");
  });

  it("accepts not_approved planning record", () => {
    expect(validateDbIntegrationScopeGateRecord(base()).approval_status).toBe("not_approved");
  });

  it("accepts approved planning record only with owner fields while keeping provider and production apply disabled", () => {
    const record = validateDbIntegrationScopeGateRecord(withRecord({
      approval_status: "approved",
      owner_approved_by: "project-owner",
      owner_approved_at: "2026-06-10T00:00:00Z",
      package_change_allowed: true,
      pnpm_lock_change_allowed: true,
      db_driver_package: "pg",
      db_driver_version_policy: "pinned-semver-with-security-review",
      real_db_connection_allowed: true,
      secret_manager_scope_required: true,
      db_credentials_storage_required: "secret_manager",
      live_db_integration_tests_allowed: true,
      migration_apply_allowed: true,
      migration_rollback_plan_required: true
    }));
    expect(record.owner_approved_by).toBe("project-owner");
    expect(record.provider_sdk_apply_allowed).toBe(false);
    expect(record.actual_production_deployment_allowed).toBe(false);
    expect(record.runtime_readiness_claim_allowed).toBe(false);
    expect(record.production_readiness_claim_allowed).toBe(false);
  });

  it("PR 44 machine-readable evidence remains not_approved even though future approved records can validate", () => {
    const evidence = JSON.parse(readFileSync(".codex/db-integration-scope-gate.json", "utf8")) as Record<string, unknown>;
    expect(evidence.ownerApprovalStatus).toBe("not_approved");
    expect(evidence.realDbConnectionAllowed).toBe(false);
    expect(evidence.dbDriverDependencyAllowed).toBe(false);
    expect(evidence.packageChangeAllowed).toBe(false);
    expect(evidence.pnpmLockChangeAllowed).toBe(false);
    expect(evidence.liveDbIntegrationTestsAllowed).toBe(false);
    expect(evidence.migrationApplyAllowed).toBe(false);
    expect(evidence.providerSdkApplyAllowed).toBe(false);
    expect(evidence.actualProductionDeploymentAllowed).toBe(false);
    expect(evidence.runtimeReadinessClaimAllowed).toBe(false);
    expect(evidence.productionReadinessClaimAllowed).toBe(false);
    expect(evidence.legalComplianceClaimAllowed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimAllowed).toBe(false);
  });

  it("machine-readable DB integration scope gate evidence uses a refreshed non-placeholder head", () => {
    const evidence = JSON.parse(readFileSync(".codex/db-integration-scope-gate.json", "utf8")) as { headSha?: string };
    expect(evidence.headSha).toMatch(/^[0-9a-f]{40}$/);
    expect(evidence.headSha).not.toBe("7575d44a5330c5c1c40e7ead6c80805966a26779");
  });
});
