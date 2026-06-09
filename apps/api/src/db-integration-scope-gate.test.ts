import { describe, expect, it } from "vitest";
import { createDefaultDbIntegrationScopeGateRecord, validateDbIntegrationScopeGateRecord, type DbIntegrationScopeGateRecord } from "./db-integration-scope-gate.js";

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
});
