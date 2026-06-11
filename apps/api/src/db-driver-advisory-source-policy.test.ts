import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allowedDbDriverAdvisorySourceCategories,
  createDefaultDbDriverAdvisorySourcePolicyRecord,
  forbiddenDbDriverAdvisorySourceCategories,
  validateCurrentDbDriverAdvisorySourcePolicyRecord,
  validateFutureReviewedDbDriverAdvisorySourcePolicyFixture,
  type DbDriverAdvisorySourcePolicyRecord,
  type DbDriverCandidateSourcePolicy
} from "./db-driver-advisory-source-policy.js";

const branchName = "feat/db-driver-advisory-source-policy-v118-prep";
const baseSha = "0dbf5d2a86294d67d7c7d5e1ae198918f157dc24";
const targetSha = "0dbf5d2a86294d67d7c7d5e1ae198918f157dc24";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 0,
  targetBranch: branchName,
  targetCommitSha: targetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-11T00:00:00Z",
  harnessVersion: "1.1.7"
};

function record(patch: Partial<DbDriverAdvisorySourcePolicyRecord> = {}) {
  return {
    ...createDefaultDbDriverAdvisorySourcePolicyRecord(context),
    ...patch
  } as DbDriverAdvisorySourcePolicyRecord;
}

function candidateSource(driverName: "pg" | "postgres", patch: Partial<DbDriverCandidateSourcePolicy> = {}) {
  const candidate = createDefaultDbDriverAdvisorySourcePolicyRecord(context).candidateSourcePolicies.find(
    (entry) => entry.driverName === driverName
  );
  if (!candidate) throw new Error(`missing default ${driverName} advisory source policy`);
  return {
    ...candidate,
    ...patch
  } as DbDriverCandidateSourcePolicy;
}

function committedSourcePolicyFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-advisory-source-policy.json", "utf8")) as DbDriverAdvisorySourcePolicyRecord;
}

describe("db driver advisory source policy", () => {
  it("creates not-reviewed source policy evidence without selecting a driver", () => {
    const current = record();

    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.allowedSourceCategories).toEqual([...allowedDbDriverAdvisorySourceCategories]);
    expect(current.sourceBindingStatus).toBe("not_reviewed");
    expect(current.sourceTimestampStatus).toBe("not_reviewed");
    expect(current.sourceFreshnessStatus).toBe("not_reviewed");
    expect(current.safeSummaryPolicyStatus).toBe("safe_summary_only");
    expect(current.rawOutputPolicyStatus).toBe("raw_output_forbidden");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(validateCurrentDbDriverAdvisorySourcePolicyRecord(current)).toBe(current);
  });

  it("keeps pg and postgres candidate source policies not reviewed", () => {
    const current = record();

    expect(current.candidateSourcePolicies).toHaveLength(2);
    for (const candidate of current.candidateSourcePolicies) {
      expect(candidate.driverName).toBe(candidate.packageName);
      expect(candidate.sourcePolicyStatus).toBe("not_reviewed");
      expect(candidate.allowedSourceCategories).toEqual([...allowedDbDriverAdvisorySourceCategories]);
      expect(candidate.forbiddenSourceCategories).toEqual([...forbiddenDbDriverAdvisorySourceCategories]);
      expect(candidate.sourceBindingStatus).toBe("not_reviewed");
      expect(candidate.sourceTimestampStatus).toBe("not_reviewed");
      expect(candidate.sourceFreshnessStatus).toBe("not_reviewed");
      expect(candidate.safeSummaryPolicyStatus).toBe("safe_summary_only");
      expect(candidate.rawOutputPolicyStatus).toBe("raw_output_forbidden");
      expect(candidate.lastReviewedAt).toBeNull();
      expect(candidate.expiresAt).toBeNull();
      expect(candidate.refreshRequired).toBe(true);
    }
  });

  it("keeps permission flags false", () => {
    const current = record();

    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(current.migrationExecutionAllowed).toBe(false);
    expect(current.liveDbIntegrationTestAllowed).toBe(false);
    expect(current.providerSdkApplyAllowed).toBe(false);
    expect(current.actualProductionDeploymentAllowed).toBe(false);
    expect(current.runtimeReadinessClaimAllowed).toBe(false);
    expect(current.productionReadinessClaimAllowed).toBe(false);
    expect(current.legalComplianceClaimAllowed).toBe(false);
    expect(current.youtubePolicyComplianceClaimAllowed).toBe(false);
  });

  it.each([
    ["selected driver", { selectedDriver: "pg" }],
    ["selected driverChoiceStatus", { driverChoiceStatus: "selected" }],
    ["policy ready", { sourcePolicyStatus: "policy_ready" }],
    ["reviewed source binding", { sourceBindingStatus: "reviewed" }],
    ["pass source binding", { sourceBindingStatus: "pass" }],
    ["reviewed source timestamp", { sourceTimestampStatus: "reviewed" }],
    ["fresh source freshness", { sourceFreshnessStatus: "fresh" }],
    ["pass source freshness", { sourceFreshnessStatus: "pass" }],
    ["unsafe safe summary policy", { safeSummaryPolicyStatus: "invalid" }],
    ["raw output allowed", { rawOutputPolicyStatus: "raw_allowed" }],
    ["reviewed advisory envelope", { advisoryEnvelopeStatus: "reviewed" }],
    ["known blockers empty array", { knownBlockers: [] }],
    ["known blockers reviewed", { knownBlockersStatus: "reviewed" }],
    ["known blockers pass", { knownBlockersStatus: "pass" }],
    ["owner approved", { ownerApprovalStatus: "approved" }],
    ["final gate approved", { finalApprovalGateStatus: "approved_for_dependency_pr" }],
    ["package change allowed", { packageJsonChangeAllowed: true }],
    ["lockfile change allowed", { pnpmLockChangeAllowed: true }],
    ["dependency allowed", { dbDriverDependencyAllowed: true }],
    ["real DB allowed", { realDbConnectionAllowed: true }],
    ["migration allowed", { migrationExecutionAllowed: true }],
    ["live DB integration allowed", { liveDbIntegrationTestAllowed: true }],
    ["provider SDK apply allowed", { providerSdkApplyAllowed: true }],
    ["production deployment allowed", { actualProductionDeploymentAllowed: true }],
    ["runtime readiness claim allowed", { runtimeReadinessClaimAllowed: true }],
    ["production readiness claim allowed", { productionReadinessClaimAllowed: true }],
    ["legal compliance claim allowed", { legalComplianceClaimAllowed: true }],
    ["YouTube policy compliance claim allowed", { youtubePolicyComplianceClaimAllowed: true }]
  ])("rejects %s in committed source policy evidence", (_label, patch) => {
    expect(() => validateCurrentDbDriverAdvisorySourcePolicyRecord(record(patch as Partial<DbDriverAdvisorySourcePolicyRecord>))).toThrow();
  });

  it.each([
    ["candidate source policy reviewed", { sourcePolicyStatus: "policy_ready" }],
    ["candidate binding reviewed", { sourceBindingStatus: "reviewed" }],
    ["candidate timestamp reviewed", { sourceTimestampStatus: "reviewed" }],
    ["candidate freshness fresh", { sourceFreshnessStatus: "fresh" }],
    ["candidate safe summary invalid", { safeSummaryPolicyStatus: "invalid" }],
    ["candidate raw output allowed", { rawOutputPolicyStatus: "raw_allowed" }],
    ["candidate lastReviewedAt", { lastReviewedAt: "2026-06-11T00:00:00Z" }],
    ["candidate expiresAt", { expiresAt: "2026-06-18T00:00:00Z" }],
    ["candidate refreshRequired false", { refreshRequired: false }]
  ])("rejects %s in committed candidate source policy", (_label, patch) => {
    expect(() =>
      validateCurrentDbDriverAdvisorySourcePolicyRecord(
        record({ candidateSourcePolicies: [candidateSource("pg", patch as Partial<DbDriverCandidateSourcePolicy>), candidateSource("postgres")] })
      )
    ).toThrow();
  });

  it.each([
    ["missing pg source policy", [candidateSource("postgres")]],
    ["missing postgres source policy", [candidateSource("pg")]],
    ["extra source policy", [candidateSource("pg"), candidateSource("postgres"), candidateSource("pg")]],
    ["duplicate source policy", [candidateSource("pg"), candidateSource("pg")]]
  ])("rejects %s", (_label, candidateSourcePolicies) => {
    expect(() => validateCurrentDbDriverAdvisorySourcePolicyRecord(record({ candidateSourcePolicies }))).toThrow();
  });

  it.each([
    ["forbidden source category", ["github_raw_logs", ...allowedDbDriverAdvisorySourceCategories.slice(1)]],
    ["missing required source category", allowedDbDriverAdvisorySourceCategories.slice(0, -1)]
  ])("rejects %s", (_label, allowedSourceCategories) => {
    expect(() =>
      validateCurrentDbDriverAdvisorySourcePolicyRecord(
        record({ allowedSourceCategories: allowedSourceCategories as DbDriverAdvisorySourcePolicyRecord["allowedSourceCategories"] })
      )
    ).toThrow();
  });

  it.each([
    ["raw npm audit JSON", ["npm audit --", "json"].join("")],
    ["raw GitHub advisory response", "GitHub advisory raw response"],
    ["raw OSV response", "OSV raw response"],
    ["raw Snyk response", "Snyk raw response"],
    ["raw npm registry metadata", "npm registry raw metadata"],
    ["raw dependency tree", "dependency tree"],
    ["raw terminal output", "stdout stderr"],
    ["raw logs", "raw logs"],
    ["private URL", ["https", "://private.example.invalid/advisory"].join("")],
    ["DB connection string", ["postgres", "://user:pass@example.invalid/db"].join("")],
    ["wallet address", "0x1234567890abcdef1234567890abcdef12345678"],
    ["token-like value", "ghp_exampletoken"],
    ["GHSA advisory id", "GHSA-xxxx-yyyy-zzzz"],
    ["CVE id", "CVE-2026-1234"],
    ["audit report version", "auditReportVersion"],
    ["vulnerabilities raw field", "vulnerabilities"]
  ])("rejects unsafe source evidence value: %s", (_label, unsafeValue) => {
    expect(() => validateCurrentDbDriverAdvisorySourcePolicyRecord(record({ safeSummary: unsafeValue }))).toThrow(/unsafe|safeSummary/);
  });

  it.each([
    "clean",
    "no vulnerabilities",
    "secure",
    "approved",
    "safe to install",
    "dependency approved",
    "production ready",
    "legal compliant",
    "policy compliant",
    "recommended",
    "winner",
    "preferred"
  ])("rejects unsafe safeSummary claim: %s", (summary) => {
    expect(() => validateCurrentDbDriverAdvisorySourcePolicyRecord(record({ safeSummary: summary }))).toThrow(/safeSummary/);
  });

  it("accepts future reviewed source fixture only through the future fixture validator", () => {
    const fixture = record({
      sourcePolicyStatus: "policy_ready",
      sourceBindingStatus: "reviewed",
      sourceTimestampStatus: "reviewed",
      sourceFreshnessStatus: "fresh",
      candidateSourcePolicies: [
        candidateSource("pg", {
          sourcePolicyStatus: "policy_ready",
          sourceBindingStatus: "reviewed",
          sourceTimestampStatus: "reviewed",
          sourceFreshnessStatus: "fresh",
          lastReviewedAt: "2026-06-01T00:00:00Z",
          expiresAt: "2026-06-18T00:00:00Z"
        }),
        candidateSource("postgres", {
          sourcePolicyStatus: "policy_ready",
          sourceBindingStatus: "reviewed",
          sourceTimestampStatus: "reviewed",
          sourceFreshnessStatus: "fresh",
          lastReviewedAt: "2026-06-01T00:00:00Z",
          expiresAt: "2026-06-18T00:00:00Z"
        })
      ]
    });

    expect(() => validateCurrentDbDriverAdvisorySourcePolicyRecord(fixture)).toThrow();
    expect(validateFutureReviewedDbDriverAdvisorySourcePolicyFixture(fixture)).toBe(fixture);
  });

  it("keeps committed .codex source policy evidence not reviewed", () => {
    const current = committedSourcePolicyFromDisk();

    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.allowedSourceCategories).toEqual([...allowedDbDriverAdvisorySourceCategories]);
    expect(current.sourceBindingStatus).toBe("not_reviewed");
    expect(current.sourceTimestampStatus).toBe("not_reviewed");
    expect(current.sourceFreshnessStatus).toBe("not_reviewed");
    expect(current.safeSummaryPolicyStatus).toBe("safe_summary_only");
    expect(current.rawOutputPolicyStatus).toBe("raw_output_forbidden");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(validateCurrentDbDriverAdvisorySourcePolicyRecord(current)).toBe(current);
  });
});
