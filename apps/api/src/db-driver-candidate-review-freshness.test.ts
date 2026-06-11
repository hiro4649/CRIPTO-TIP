import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDefaultDbDriverCandidateReviewPackRecord } from "./db-driver-candidate-review-pack.js";
import {
  createDefaultDbDriverCandidateReviewFreshnessRecord,
  dbDriverCandidateReviewFreshnessRefreshReasons,
  validateCommittedDbDriverCandidateReviewFreshnessEvidence,
  validateCurrentDbDriverCandidateReviewFreshnessRecord,
  validateDbDriverCandidateReviewFreshnessAgainstPack,
  validateFutureFreshDbDriverCandidateReviewFreshnessFixture,
  type DbDriverCandidateFreshness,
  type DbDriverCandidateReviewFreshnessRecord
} from "./db-driver-candidate-review-freshness.js";

const branchName = "feat/db-driver-candidate-review-freshness-v118-prep";
const baseSha = "775119a5e5ed8fe9fadf6056075aa3b117f01118";
const staleTargetSha = ["3bf9de81e87a31872198", "46afa331b5d8a96ed474"].join("");
const reviewTargetSha = "32cb94b9bb82cab5ecc5666edcabe5d90b6bd843";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 54,
  targetBranch: branchName,
  targetCommitSha: reviewTargetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-11T00:00:00Z",
  harnessVersion: "1.1.7"
};

function record(patch: Partial<DbDriverCandidateReviewFreshnessRecord> = {}) {
  return {
    ...createDefaultDbDriverCandidateReviewFreshnessRecord(context),
    ...patch
  } as DbDriverCandidateReviewFreshnessRecord;
}

function candidateFreshness(driverName: "pg" | "postgres", patch: Partial<DbDriverCandidateFreshness> = {}) {
  const candidate = createDefaultDbDriverCandidateReviewFreshnessRecord(context).candidateFreshness.find(
    (entry) => entry.driverName === driverName
  );
  if (!candidate) throw new Error(`missing default ${driverName} freshness`);
  return {
    ...candidate,
    ...patch
  } as DbDriverCandidateFreshness;
}

function committedFreshnessFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-candidate-review-freshness.json", "utf8")) as DbDriverCandidateReviewFreshnessRecord;
}

function evidencePackFromDisk() {
  return JSON.parse(readFileSync(".codex/evidence-pack.json", "utf8")) as {
    prNumber: number;
    headSha: string;
    baseSha: string;
    title: string;
  };
}

describe("db driver candidate review freshness", () => {
  it("creates not-ready freshness evidence without selecting a driver", () => {
    const current = record();

    expect(current.freshnessStatus).toBe("not_ready");
    expect(current.reviewPackStatus).toBe("not_ready");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.licenseReviewFreshnessStatus).toBe("not_reviewed");
    expect(current.supplyChainReviewFreshnessStatus).toBe("not_reviewed");
    expect(current.securityAdvisoryFreshnessStatus).toBe("not_reviewed");
    expect(current.packageMetadataFreshnessStatus).toBe("not_reviewed");
    expect(current.versionPolicyFreshnessStatus).toBe("not_selected");
    expect(current.packageDiffFreshnessStatus).toBe("missing");
    expect(current.lockfileFreshnessStatus).toBe("missing");
    expect(current.secretBoundaryFreshnessStatus).toBe("not_reviewed");
    expect(current.refreshRequired).toBe(true);
    expect(current.refreshReasons).toEqual([...dbDriverCandidateReviewFreshnessRefreshReasons]);
    expect(validateCurrentDbDriverCandidateReviewFreshnessRecord(current)).toBe(current);
  });

  it("keeps pg and postgres freshness in the review queue only", () => {
    const current = record();

    expect(current.candidateFreshness).toHaveLength(2);
    for (const candidate of current.candidateFreshness) {
      expect(candidate.candidateStatus).toBe("candidate");
      expect(candidate.freshnessStatus).toBe("not_ready");
      expect(candidate.refreshRequired).toBe(true);
      expect(candidate.lastReviewedAt).toBeNull();
      expect(candidate.expiresAt).toBeNull();
      expect(candidate.refreshReasons).toEqual([...dbDriverCandidateReviewFreshnessRefreshReasons]);
    }
  });

  it("keeps committed freshness evidence not ready and without package authorization", () => {
    const current = committedFreshnessFromDisk();

    expect(current.freshnessStatus).toBe("not_ready");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(validateCurrentDbDriverCandidateReviewFreshnessRecord(current)).toBe(current);
    expect(
      validateCommittedDbDriverCandidateReviewFreshnessEvidence(current, {
        repository: context.repository,
        prNumber: context.prNumber,
        targetBranch: context.targetBranch,
        targetCommitSha: context.targetCommitSha,
        baseCommitSha: context.baseCommitSha
      })
    ).toBe(current);
  });

  it("keeps committed freshness evidence bound to PR 54 freshness work", () => {
    const current = committedFreshnessFromDisk();

    expect(current.prNumber).toBe(54);
    expect(current.targetCommitSha).toBe(reviewTargetSha);
    expect(current.baseCommitSha).toBe(baseSha);
    expect(current.targetCommitSha).not.toBe(current.baseCommitSha);
    expect(current.targetCommitSha).not.toBe(staleTargetSha);
    expect(current.targetBranch).toBe(branchName);
  });

  it("rejects stale targetCommitSha in committed freshness evidence", () => {
    const current = committedFreshnessFromDisk();

    expect(current.targetCommitSha).toBe(reviewTargetSha);
    expect(current.targetCommitSha).not.toBe(staleTargetSha);
    expect(current.targetCommitSha).not.toBe(current.baseCommitSha);
  });

  it("matches the candidate review pack without selecting a driver", () => {
    const freshness = record();
    const pack = createDefaultDbDriverCandidateReviewPackRecord(context);

    expect(validateDbDriverCandidateReviewFreshnessAgainstPack(freshness, pack)).toBe(freshness);
  });

  it("rejects selected driver and selected driver choice", () => {
    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ selectedDriver: "pg" }))).toThrow(
      /must not select/
    );
    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ driverChoiceStatus: "selected" }))).toThrow(
      /not_selected/
    );
  });

  it("rejects fresh status in committed current evidence", () => {
    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ freshnessStatus: "fresh" }))).toThrow(
      /not_ready/
    );
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ licenseReviewFreshnessStatus: "fresh" }))
    ).toThrow(/not_reviewed/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ supplyChainReviewFreshnessStatus: "fresh" }))
    ).toThrow(/not_reviewed/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ securityAdvisoryFreshnessStatus: "fresh" }))
    ).toThrow(/not_reviewed/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ packageMetadataFreshnessStatus: "fresh" }))
    ).toThrow(/not_reviewed/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ versionPolicyFreshnessStatus: "fresh" }))
    ).toThrow(/not_selected/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ packageDiffFreshnessStatus: "fresh" }))
    ).toThrow(/missing/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ lockfileFreshnessStatus: "fresh" }))
    ).toThrow(/missing/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ secretBoundaryFreshnessStatus: "fresh" }))
    ).toThrow(/not_reviewed/);
  });

  it("rejects copied future fresh fixture as committed evidence", () => {
    const fresh = record({
      freshnessStatus: "fresh",
      licenseReviewFreshnessStatus: "fresh",
      supplyChainReviewFreshnessStatus: "fresh",
      securityAdvisoryFreshnessStatus: "fresh",
      packageMetadataFreshnessStatus: "fresh",
      versionPolicyFreshnessStatus: "fresh",
      packageDiffFreshnessStatus: "fresh",
      lockfileFreshnessStatus: "fresh",
      secretBoundaryFreshnessStatus: "fresh",
      refreshRequired: false,
      refreshReasons: [],
      candidateFreshness: [
        candidateFreshness("pg", {
          freshnessStatus: "fresh",
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-07-11T00:00:00Z",
          refreshRequired: false,
          refreshReasons: []
        }),
        candidateFreshness("postgres", {
          freshnessStatus: "fresh",
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-07-11T00:00:00Z",
          refreshRequired: false,
          refreshReasons: []
        })
      ]
    });

    expect(() => validateCommittedDbDriverCandidateReviewFreshnessEvidence(fresh, context)).toThrow(
      /not_ready|lastReviewedAt|not_reviewed/
    );
  });

  it("rejects missing, extra, or duplicate candidate freshness", () => {
    const pg = candidateFreshness("pg");
    const postgres = candidateFreshness("postgres");

    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ candidateFreshness: [pg] }))).toThrow(
      /pg and postgres/
    );
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(
        record({
          candidateFreshness: [pg, postgres, { ...postgres, driverName: "pg" }]
        })
      )
    ).toThrow(/pg and postgres|duplicate/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ candidateFreshness: [pg, { ...pg }] }))
    ).toThrow(/duplicate/);
  });

  it("rejects current candidate timestamps or fresh candidate status", () => {
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(
        record({ candidateFreshness: [candidateFreshness("pg", { lastReviewedAt: "2026-06-11T00:00:00Z" }), candidateFreshness("postgres")] })
      )
    ).toThrow(/lastReviewedAt/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(
        record({ candidateFreshness: [candidateFreshness("pg", { expiresAt: "2026-07-11T00:00:00Z" }), candidateFreshness("postgres")] })
      )
    ).toThrow(/expiresAt/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewFreshnessRecord(
        record({ candidateFreshness: [candidateFreshness("pg", { freshnessStatus: "fresh" }), candidateFreshness("postgres")] })
      )
    ).toThrow(/not_ready/);
  });

  it("rejects missing refresh reasons and refreshRequired false", () => {
    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ refreshRequired: false }))).toThrow(
      /refreshRequired/
    );
    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ refreshReasons: [] }))).toThrow(
      /requires refresh reason/
    );
  });

  it("rejects permission flags and readiness claims", () => {
    const flagPatches: Array<Partial<DbDriverCandidateReviewFreshnessRecord>> = [
      { packageJsonChangeAllowed: true },
      { pnpmLockChangeAllowed: true },
      { dbDriverDependencyAllowed: true },
      { realDbConnectionAllowed: true },
      { migrationExecutionAllowed: true },
      { liveDbIntegrationTestAllowed: true },
      { providerSdkApplyAllowed: true },
      { actualProductionDeploymentAllowed: true },
      { runtimeReadinessClaimAllowed: true },
      { productionReadinessClaimAllowed: true },
      { legalComplianceClaimAllowed: true },
      { youtubePolicyComplianceClaimAllowed: true }
    ];

    for (const patch of flagPatches) {
      expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record(patch))).toThrow(/must remain false/);
    }
  });

  it("rejects candidate selection wording in safe summaries", () => {
    const forbidden = [
      "selected",
      "approved",
      "recommended",
      "winner",
      "best choice",
      "preferred",
      "safe for dependency",
      "ready for dependency",
      "install now",
      "production candidate",
      "production ready",
      "legally safe",
      "policy compliant",
      "approved choice",
      "fresh enough to select",
      "selection ready",
      "owner approved",
      "dependency approved"
    ];

    for (const word of forbidden) {
      expect(() =>
        validateCurrentDbDriverCandidateReviewFreshnessRecord(
          record({
            candidateFreshness: [
              candidateFreshness("pg", { safeSummary: `pg is ${word}` }),
              candidateFreshness("postgres")
            ]
          })
        )
      ).toThrow(/safeSummary/);
    }
  });

  it("rejects unsafe private, DB, wallet, token, raw log, and provider values", () => {
    const unsafeValues = [
      "https://private.example.invalid/hook",
      ["postgres", "://user:pass@example.invalid/db"].join(""),
      "0x0000000000000000000000000000000000000000",
      "ghp_exampletoken",
      "sk-exampletoken",
      "xoxb-exampletoken",
      `AKIA${"0".repeat(16)}`,
      "Bearer token",
      "raw GitHub logs",
      "gh run view --log",
      "raw provider response"
    ];

    for (const value of unsafeValues) {
      expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(record({ safeSummary: value }))).toThrow(
        /unsafe|safeSummary/
      );
    }
  });

  it("allows a future fresh fixture only through the explicit fixture validator", () => {
    const fresh = record({
      freshnessStatus: "fresh",
      licenseReviewFreshnessStatus: "fresh",
      supplyChainReviewFreshnessStatus: "fresh",
      securityAdvisoryFreshnessStatus: "fresh",
      packageMetadataFreshnessStatus: "fresh",
      versionPolicyFreshnessStatus: "fresh",
      packageDiffFreshnessStatus: "fresh",
      lockfileFreshnessStatus: "fresh",
      secretBoundaryFreshnessStatus: "fresh",
      refreshRequired: false,
      refreshReasons: [],
      candidateFreshness: [
        candidateFreshness("pg", {
          freshnessStatus: "fresh",
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-07-11T00:00:00Z",
          refreshRequired: false,
          refreshReasons: []
        }),
        candidateFreshness("postgres", {
          freshnessStatus: "fresh",
          lastReviewedAt: "2026-06-11T00:00:00Z",
          expiresAt: "2026-07-11T00:00:00Z",
          refreshRequired: false,
          refreshReasons: []
        })
      ]
    });

    expect(() => validateCurrentDbDriverCandidateReviewFreshnessRecord(fresh)).toThrow(/not_ready|lastReviewedAt/);
    expect(validateFutureFreshDbDriverCandidateReviewFreshnessFixture(fresh)).toBe(fresh);
  });
});
