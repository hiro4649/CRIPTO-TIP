import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverPreflightPolicyRecord,
  validateDbDriverPreflightPolicyRecord,
  type DbDriverCandidateEvaluation,
  type DbDriverPreflightPolicyContext,
  type DbDriverPreflightPolicyRecord
} from "./db-driver-preflight-policy.js";

const targetCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const baseCommit = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const context = (): DbDriverPreflightPolicyContext => ({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 1,
  targetBranch: "feat/db-driver-preflight-policy-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit
});

const base = () => createDefaultDbDriverPreflightPolicyRecord({
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 1,
  targetBranch: "feat/db-driver-preflight-policy-v116-prep",
  targetCommitSha: targetCommit,
  baseCommitSha: baseCommit,
  createdAt: "2026-06-10T00:00:00Z"
});

function withRecord(patch: Partial<DbDriverPreflightPolicyRecord>) {
  return { ...base(), ...patch };
}

function machineEvidence() {
  return JSON.parse(readFileSync(".codex/db-driver-preflight-policy.json", "utf8")) as Record<string, unknown>;
}

function firstEvaluation(patch: Partial<DbDriverCandidateEvaluation> = {}): DbDriverCandidateEvaluation {
  const evaluation = base().candidate_evaluations?.[0];
  if (!evaluation) throw new Error("missing test candidate evaluation");
  return { ...evaluation, ...patch };
}

describe("DB driver preflight policy", () => {
  it("default DB driver preflight policy is not_selected", () => {
    const record = validateDbDriverPreflightPolicyRecord(base());
    expect(record.driver_choice_status).toBe("not_selected");
    expect(record.selected_driver).toBeNull();
    expect(record.candidate_drivers).toEqual(["pg", "postgres"]);
  });

  it("default DB driver preflight policy rejects selected driver", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord({ selected_driver: "pg" }))).toThrow(/selected_driver/);
  });

  it.each([
    ["package change allowed", { package_change_allowed: true }],
    ["pnpm lock change allowed", { pnpm_lock_change_allowed: true }],
    ["real DB connection allowed", { real_db_connection_allowed: true }],
    ["live DB integration allowed", { live_db_integration_tests_allowed: true }],
    ["migration apply allowed", { migration_apply_allowed: true }],
    ["provider SDK apply allowed", { provider_sdk_apply_allowed: true }],
    ["production deployment allowed", { actual_production_deployment_allowed: true }],
    ["runtime readiness claim allowed", { runtime_readiness_claim_allowed: true }],
    ["production readiness claim allowed", { production_readiness_claim_allowed: true }]
  ])("default DB driver preflight policy rejects %s", (_label, patch) => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord(patch))).toThrow();
  });

  it.each([
    ["owner approval record", { owner_approval_record_required: false }],
    ["license review", { license_review_required: false }],
    ["supply-chain review", { supply_chain_review_required: false }],
    ["security advisory review", { security_advisory_review_required: false }],
    ["version pinning", { version_pinning_required: false }],
    ["lockfile review", { lockfile_review_required: false }],
    ["package diff review", { package_diff_review_required: false }]
  ])("default DB driver preflight policy requires %s", (_label, patch) => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord(patch))).toThrow();
  });

  it("preflight policy accepts pg as candidate", () => {
    expect(validateDbDriverPreflightPolicyRecord(withRecord({ candidate_drivers: ["pg"] })).candidate_drivers).toEqual(["pg"]);
  });

  it("preflight policy accepts postgres as candidate", () => {
    expect(validateDbDriverPreflightPolicyRecord(withRecord({ candidate_drivers: ["postgres"] })).candidate_drivers).toEqual(["postgres"]);
  });

  it("preflight policy rejects unknown candidate driver", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord({ candidate_drivers: ["mysql"] }))).toThrow(/unknown/);
  });

  it("preflight policy rejects selected driver without approved owner record", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord({
      driver_choice_status: "selected",
      selected_driver: "pg"
    }))).toThrow(/approved owner/);
  });

  it("preflight policy rejects selected driver not in candidates", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord({
      driver_choice_status: "selected",
      selected_driver: "pg",
      candidate_drivers: ["postgres"],
      owner_approval_record_status: "approved"
    }))).toThrow(/candidate_drivers/);
  });

  it("preflight policy rejects candidate evaluation final candidate status", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord({
      candidate_evaluations: [firstEvaluation({ recommended_status: "candidate" })]
    }))).toThrow(/final candidate/);
  });

  it.each([
    ["DB connection string", { candidate_evaluations: [firstEvaluation({ operational_risk: "postgres://user:pass@example/db" })] }],
    ["private URL", { candidate_evaluations: [firstEvaluation({ operational_risk: ["https", "://private.example.test"].join("") })] }],
    ["wallet address", { candidate_evaluations: [firstEvaluation({ operational_risk: "0x1234567890abcdef1234567890abcdef12345678" })] }],
    ["token-like value", { candidate_evaluations: [firstEvaluation({ operational_risk: "sk-test-token" })] }],
    ["raw provider response", { candidate_evaluations: [firstEvaluation({ operational_risk: "raw provider response" })] }],
    ["raw GitHub logs reference", { candidate_evaluations: [firstEvaluation({ operational_risk: ["gh run view", "--log 123"].join(" ") })] }]
  ])("preflight policy rejects %s", (_label, patch) => {
    expect(() => validateDbDriverPreflightPolicyRecord(withRecord(patch))).toThrow(/unsafe/);
  });

  it("preflight policy allows safe review-required strings", () => {
    expect(validateDbDriverPreflightPolicyRecord(base()).candidate_evaluations?.[0]?.security_advisory_status).toBe("future_review_required");
  });

  it("preflight policy binds to context when provided", () => {
    const record = validateDbDriverPreflightPolicyRecord(base(), context());
    expect(record.target_branch).toBe("feat/db-driver-preflight-policy-v116-prep");
  });

  it("preflight policy rejects wrong target commit binding", () => {
    expect(() => validateDbDriverPreflightPolicyRecord(base(), {
      ...context(),
      targetCommitSha: "cccccccccccccccccccccccccccccccccccccccc"
    })).toThrow(/target commit/);
  });

  it("preflight policy does not add package or lockfile changes in machine evidence", () => {
    const evidence = machineEvidence();
    expect(evidence.packageChangeAllowed).toBe(false);
    expect(evidence.pnpmLockChangeAllowed).toBe(false);
    expect(evidence.driverChoiceStatus).toBe("not_selected");
    expect(evidence.selectedDriver).toBeNull();
    expect(evidence.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(evidence.forbiddenScopeStatus).toBe("pass");
  });
});
