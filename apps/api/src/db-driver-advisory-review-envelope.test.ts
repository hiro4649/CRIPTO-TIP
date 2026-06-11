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
const staleEvidenceSha = ["bd2fd3a0ac8ccdfb65b512", "0131424ba291dc17f2"].join("");

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

function evidencePackFromDisk() {
  return JSON.parse(readFileSync(".codex/evidence-pack.json", "utf8")) as {
    prNumber: number;
    headSha: string;
    baseSha: string;
    productCiStatus: string;
    qualityGateStatus: string;
    ciRunId: string;
    qualityGateRunId: string;
    qualityGateArtifactId: string;
  };
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
    ["known blockers pass", { knownBlockersStatus: "pass" }],
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
    ["candidate raw output allowed", { rawOutputPolicyStatus: "raw_allowed" }],
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
    ["audit report version field", "auditReportVersion"],
    ["vulnerabilities raw field", "vulnerabilities"],
    ["raw GitHub advisory response", "GitHub advisory API response"],
    ["GitHub Advisory Database raw", "GitHub Advisory Database raw"],
    ["GHSA advisory id", "GHSA-xxxx-yyyy-zzzz"],
    ["CVE id", "CVE-2026-1234"],
    ["raw dependency tree", "dependency tree"],
    ["raw dependency tree exact", "raw dependency tree"],
    ["raw terminal output", "stdout stderr"],
    ["logs url field", "logs_url"],
    ["jobs url field", "jobs_url"],
    ["raw logs", "raw logs"],
    ["stack trace", "stack_trace"],
    ["file contents", "file_contents"]
  ])("rejects unsafe advisory evidence value: %s", (_label, unsafeValue) => {
    expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record({ safeSummary: unsafeValue }))).toThrow(/unsafe|safeSummary/);
  });

  it.each([
    "no blockers",
    "no CVEs",
    "no vulnerabilities",
    "audit clean",
    "security approved",
    "safe to install",
    "dependency approved",
    "best choice",
    "winner",
    "preferred",
    "pass",
    "selected",
    "approved",
    "recommended",
    "production ready",
    "policy compliant",
    "legally safe"
  ])(
    "rejects summary claim: %s",
    (summary) => {
      expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record({ safeSummary: summary }))).toThrow(/safeSummary/);
    }
  );

  it.each([
    "no vulnerabilities",
    "audit clean",
    "security approved",
    "safe to install",
    "dependency approved",
    "recommended",
    "winner"
  ])("rejects candidate safeSummary claim: %s", (summary) => {
    expect(() =>
      validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(
        record({ candidateAdvisoryReviews: [candidateAdvisory("pg", { safeSummary: summary }), candidateAdvisory("postgres")] })
      )
    ).toThrow(/safeSummary/);
  });

  it.each([
    "rawAuditJson",
    "rawAuditOutput",
    "rawAdvisoryJson",
    "rawAdvisoryResponse",
    "rawDependencyTree",
    "rawTerminalOutput",
    "stdout",
    "stderr",
    "stackTrace",
    "logsUrl",
    "jobsUrl",
    "advisoryApiResponse",
    "npmAuditJson",
    "githubAdvisoryResponse"
  ])("rejects unsafe raw advisory key: %s", (key) => {
    expect(() => validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record({ [key]: "safe-looking" } as Partial<DbDriverAdvisoryReviewEnvelopeRecord>))).toThrow(
      /unsafe/
    );
  });

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

  it("rejects stale advisory envelope target commit from prior PR head", () => {
    expect(() =>
      validateCommittedDbDriverAdvisoryReviewEnvelopeEvidence(
        { ...committedEnvelopeFromDisk(), targetCommitSha: staleEvidenceSha },
        {
          repository: "hiro4649/CRIPTO-TIP",
          prNumber: 55,
          targetBranch: branchName,
          targetCommitSha: "f8b858e0a4cec311d75e89d74cd6830fd0486be6",
          baseCommitSha: baseSha
        }
      )
    ).toThrow(/targetCommitSha/);
  });

  it("keeps committed advisory envelope target commit distinct from base commit", () => {
    const current = committedEnvelopeFromDisk();

    expect(current.targetCommitSha).not.toBe(current.baseCommitSha);
  });

  it("rejects stale headSha in committed evidence pack", () => {
    const evidencePack = evidencePackFromDisk();

    expect(evidencePack.prNumber).toBe(55);
    expect(evidencePack.headSha).not.toBe(staleEvidenceSha);
    expect(evidencePack.headSha).not.toBe(evidencePack.baseSha);
    expect(evidencePack.productCiStatus).not.toMatch(/not_applicable_before_current_head/);
    expect(evidencePack.qualityGateStatus).not.toMatch(/not_applicable_before_current_head/);
    expect(evidencePack.ciRunId).not.toMatch(/not_applicable_before_current_head/);
    expect(evidencePack.qualityGateRunId).not.toMatch(/not_applicable_before_current_head/);
    expect(evidencePack.qualityGateArtifactId).not.toMatch(/not_applicable_before_current_head/);
  });

  it("validates committed advisory evidence context", () => {
    const committed = committedEnvelopeFromDisk();
    const current = {
      ...committed,
      targetCommitSha: "1111111111111111111111111111111111111111",
      baseCommitSha: baseSha
    };
    const validationContext = {
      repository: committed.repository,
      prNumber: committed.prNumber,
      targetBranch: committed.targetBranch,
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
