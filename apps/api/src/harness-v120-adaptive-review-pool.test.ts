import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultHarnessV120AdaptiveReviewPoolRecord,
  validateHarnessV120AdaptiveReviewPoolRecord,
  type HarnessV120AdaptiveReviewPoolRecord
} from "./harness-v120-adaptive-review-pool.js";

function record(patch: Partial<HarnessV120AdaptiveReviewPoolRecord> = {}) {
  return {
    ...createDefaultHarnessV120AdaptiveReviewPoolRecord(),
    ...patch
  } as HarnessV120AdaptiveReviewPoolRecord;
}

describe("harness v1.2.0 adaptive review pool profile", () => {
  it("default v1.2.0 adaptive review pool profile is valid", () => {
    const current = validateHarnessV120AdaptiveReviewPoolRecord(record());

    expect(current.profileStatus).toBe("profile_ready");
    expect(current.sourceOfRecordStatus).toBe("aligned");
    expect(current.modelTierRoutingStatus).toBe("policy_ready");
    expect(current.typedBlockerStatus).toBe("policy_ready");
    expect(current.reviewPoolPolicyStatus).toBe("policy_ready");
    expect(current.escalationHysteresisStatus).toBe("policy_ready");
    expect(current.highTierRepairPlanningStatus).toBe("policy_ready");
    expect(current.safetyReduction).toBe(false);
    expect(current.qualityGateWeakening).toBe(false);
  });

  it.each([
    ["modelTierRoutingProfile", "UNKNOWN_MODEL_TIER"],
    ["typedBlockerProfile", "UNKNOWN_BLOCKERS"],
    ["reviewPoolProfile", "UNKNOWN_REVIEW_POOL"],
    ["escalationHysteresisProfile", "UNKNOWN_HYSTERESIS"],
    ["highTierRepairPlanningProfile", "UNKNOWN_REPAIR_PLANNING"]
  ] as const)("rejects unknown %s", (field, value) => {
    expect(() => validateHarnessV120AdaptiveReviewPoolRecord(record({ [field]: value }))).toThrow(
      new RegExp(`unknown ${field}`)
    );
  });

  it("rejects sourceOfRecordStatus stale", () => {
    expect(() => validateHarnessV120AdaptiveReviewPoolRecord(record({ sourceOfRecordStatus: "stale" }))).toThrow(
      /sourceOfRecordStatus/
    );
  });

  it.each([
    "safetyReduction",
    "qualityGateWeakening",
    "mergeAuthorityCreated",
    "ownerApprovalCreated",
    "githubApprovalReviewCreated",
    "packageJsonChangeAllowed",
    "pnpmLockChangeAllowed",
    "dbDriverDependencyAllowed",
    "realDbConnectionAllowed",
    "runtimeReadinessClaimAllowed",
    "productionReadinessClaimAllowed",
    "legalComplianceClaimAllowed",
    "youtubePolicyComplianceClaimAllowed",
    "rawGitHubLogsAllowed",
    "rawAdvisoryOutputAllowed"
  ] as const)("rejects %s true", (flag) => {
    expect(() => validateHarnessV120AdaptiveReviewPoolRecord(record({ [flag]: true }))).toThrow(
      new RegExp(`${flag} true is forbidden`)
    );
  });

  it("committed evidence remains no-driver, no-package, no-lockfile, no-real-DB", () => {
    const committedEvidence = JSON.parse(
      readFileSync(".codex/harness-v120-adaptive-review-pool.json", "utf8")
    ) as HarnessV120AdaptiveReviewPoolRecord;
    const current = validateHarnessV120AdaptiveReviewPoolRecord(committedEvidence);

    expect(current.selectedDriver).toBeNull();
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
  });

  it("AGENTS active marker and v1.2.0 compatibility boundary are aligned", () => {
    const agents = readFileSync("AGENTS.md", "utf8");

    expect(agents).toContain("CODEX_QUALITY_HARNESS_FILE v1.2.6");
    expect(agents).toContain("Active target harness: v1.2.6 / v126.");
    expect(agents).toContain("v1.2.0 adaptive routing");
    expect(agents).toContain("v1.2.4 specialist-governance fields remain compatibility layers");
    expect(agents).toContain("v1.2.5 adds only internal Goal Shard");
    expect(agents).not.toContain("downstream project consuming Codex Harness v1.1.8");
  });
});
