import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverAdvisoryReviewEnvelopeRecord,
  validateCommittedDbDriverAdvisoryReviewEnvelopeEvidence,
  validateCurrentDbDriverAdvisoryReviewEnvelopeRecord,
  validateFutureReviewedDbDriverAdvisoryReviewEnvelopeFixture,
  type DbDriverAdvisoryReviewEnvelopeRecord,
  type DbDriverCandidateAdvisoryReview
} from "./db-driver-advisory-review-envelope.js";

const branchName = "feat/db-driver-advisory-review-envelope-v118-prep";
const baseSha = "4eb244b5a522a0eb1eaf08e9a878b2d2e87fb23a";
const targetSha = "4eb244b5a522a0eb1eaf08e9a878b2d2e87fb23a";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 0,
  targetBranch: branchName,
  targetCommitSha: targetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-11T00:00:00Z",
  harnessVersion: "1.1.7"
};

function record(patch: Partial<DbDriverAdvisoryReviewEnvelopeRecord> = {}) {
  return {
    ...createDefaultDbDriverAdvisoryReviewEnvelopeRecord(context),
    ...patch
  } as DbDriverAdvisoryReviewEnvelopeRecord;
}

function candidateAdvisory(driverName: "pg" | "postgres", patch: Partial<DbDriverCandidateAdvisoryReview> = {}) {
  const candidate = createDefaultDbDriverAdvisoryReviewEnvelopeRecord(context).candidateAdvisoryReviews.find(
    (entry) => entry.driverName === driverName
  );
  if (!candidate) throw new Error(`missing default ${driverName} advisory review`);
  return {
    ...candidate,
    ...patch
  } as DbDriverCandidateAdvisoryReview;
}

function committedEnvelopeFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-advisory-review-envelope.json", "utf8")) as DbDriverAdvisoryReviewEnvelopeRecord;
}

describe("db driver advisory review envelope", () => {
  it("creates not-reviewed advisory envelope evidence without selecting a driver", () => {
    const current = record();

    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.cveReviewStatus).toBe("not_reviewed");
    expect(current.securityAdvisoryReviewStatus).toBe("not_reviewed");
    expect(current.packageAuditReviewStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.rawOutputPolicyStatus).toBe("safe_summary_only");
    expect(current.advisorySourcePolicyStatus).toBe("not_reviewed");
    expect(current.freshnessStatus).toBe("not_ready");
    expect(validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(current)).toBe(current);
  });

  it("keeps pg and postgres candidate advisory reviews not reviewed", () => {
    const current = record();

    expect(current.candidateAdvisoryReviews).toHaveLength(2);
    for (const candidate of current.candidateAdvisoryReviews) {
      expect(candidate.advisoryReviewStatus).toBe("not_reviewed");
      expect(candidate.cveReviewStatus).toBe("not_reviewed");
      expect(candidate.packageAuditReviewStatus).toBe("not_reviewed");
      expect(candidate.knownBlockersStatus).toBe("not_reviewed");
      expect(candidate.knownBlockers).toBeNull();
      expect(candidate.rawOutputPolicyStatus).toBe("safe_summary_only");
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
    ["review ready status", { advisoryEnvelopeStatus: "review_ready" }],
    ["CVE pass", { cveReviewStatus: "pass" }],
    ["security advisory pass", { securityAdvisoryReviewStatus: "pass" }],
    ["package audit pass", { packageAuditReviewStatus: "pass" }],
    ["known blockers empty array", { knownBlockers: [] }],
    ["known blockers reviewed", { knownBlockersStatus: "reviewed" }],
    ["advisory source reviewed", { advisorySourcePolicyStatus: "reviewed" }],
    ["freshness fresh", { freshnessStatus: "fresh" }],
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
  ])("rejects %s in committed envelope evidence", (_label, patch) => {
    expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record(patch as Partial<DbDriverAdvisoryReviewEnvelopeRecord>))).toThrow();
  });

  it.each([
    ["candidate advisory pass", { advisoryReviewStatus: "pass" }],
    ["candidate CVE pass", { cveReviewStatus: "pass" }],
    ["candidate package audit pass", { packageAuditReviewStatus: "pass" }],
    ["candidate known blockers empty array", { knownBlockers: [] }],
    ["candidate known blockers reviewed", { knownBlockersStatus: "reviewed" }],
    ["candidate lastReviewedAt", { lastReviewedAt: "2026-06-11T00:00:00Z" }],
    ["candidate expiresAt", { expiresAt: "2026-06-18T00:00:00Z" }],
    ["candidate refreshRequired false", { refreshRequired: false }]
  ])("rejects %s in committed candidate advisory review", (_label, patch) => {
    expect(() =>
      validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(
        record({ candidateAdvisoryReviews: [candidateAdvisory("pg", patch as Partial<DbDriverCandidateAdvisoryReview>), candidateAdvisory("postgres")] })
      )
    ).toThrow();
  });

  it.each([
    ["private URL", ["https", "://private.example.invalid/advisory"].join("")],
    ["DB connection string", ["postgres", "://user:pass@example.invalid/db"].join("")],
    ["wallet address", "0x1234567890abcdef1234567890abcdef12345678"],
    ["token-like value", "ghp_exampletoken"],
    ["bearer token", ["Bearer", "token"].join(" ")],
    ["raw npm audit JSON", ["npm audit --", "json"].join("")],
    ["raw GitHub advisory response", "GitHub advisory API response"],
    ["raw dependency tree", "dependency tree"],
    ["raw terminal output", "stdout stderr"],
    ["raw logs", "raw logs"],
    ["stack trace", "stack_trace"],
    ["file contents", "file_contents"]
  ])("rejects unsafe advisory evidence value: %s", (_label, unsafeValue) => {
    expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record({ safeSummary: unsafeValue }))).toThrow(/unsafe|safeSummary/);
  });

  it.each(["no blockers", "no CVEs", "audit clean", "pass", "selected", "approved", "recommended", "production ready"])(
    "rejects summary claim: %s",
    (summary) => {
      expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record({ safeSummary: summary }))).toThrow(/safeSummary/);
    }
  );

  it("accepts future reviewed fixture only through the future fixture validator", () => {
    const fixture = record({
      advisoryEnvelopeStatus: "review_ready",
      cveReviewStatus: "pass",
      securityAdvisoryReviewStatus: "pass",
      packageAuditReviewStatus: "pass",
      knownBlockersStatus: "reviewed",
      knownBlockers: [],
      advisorySourcePolicyStatus: "reviewed",
      freshnessStatus: "fresh",
      candidateAdvisoryReviews: [
        candidateAdvisory("pg", {
          advisoryReviewStatus: "pass",
          cveReviewStatus: "pass",
          packageAuditReviewStatus: "pass",
          knownBlockersStatus: "reviewed",
          knownBlockers: [],
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-06-18T00:00:00Z"
        }),
        candidateAdvisory("postgres", {
          advisoryReviewStatus: "pass",
          cveReviewStatus: "pass",
          packageAuditReviewStatus: "pass",
          knownBlockersStatus: "reviewed",
          knownBlockers: [],
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-06-18T00:00:00Z"
        })
      ]
    });

    expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(fixture)).toThrow();
    expect(validateFutureReviewedDbDriverAdvisoryReviewEnvelopeFixture(fixture)).toBe(fixture);
  });

  it("keeps committed .codex advisory evidence not reviewed", () => {
    const current = committedEnvelopeFromDisk();

    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.cveReviewStatus).toBe("not_reviewed");
    expect(current.securityAdvisoryReviewStatus).toBe("not_reviewed");
    expect(current.packageAuditReviewStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.rawOutputPolicyStatus).toBe("safe_summary_only");
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(current)).toBe(current);
  });

  it("validates committed advisory evidence context", () => {
    const current = {
      ...committedEnvelopeFromDisk(),
      targetCommitSha: "1111111111111111111111111111111111111111",
      baseCommitSha: baseSha
    };
    const validationContext = {
      repository: "hiro4649/CRIPTO-TIP",
      prNumber: 0,
      targetBranch: branchName,
      targetCommitSha: "1111111111111111111111111111111111111111",
      baseCommitSha: baseSha
    };

    expect(validateCommittedDbDriverAdvisoryReviewEnvelopeEvidence(current, validationContext)).toBe(current);
    expect(() =>
      validateCommittedDbDriverAdvisoryReviewEnvelopeEvidence(current, {
        ...validationContext,
        targetCommitSha: "2222222222222222222222222222222222222222"
      })
    ).toThrow(/targetCommitSha/);
  });
});
