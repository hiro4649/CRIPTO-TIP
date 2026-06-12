import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverSourceSummaryCanonicalModelRecord,
  dbDriverSourceSummaryCanonicalCandidateDrivers,
  dbDriverSourceSummaryCanonicalPrNumber,
  dbDriverSourceSummaryRejectedSyntheticHeadSha,
  dbDriverSourceSummaryVerificationProfile,
  validateCurrentDbDriverSourceSummaryCanonicalModelRecord,
  validateCurrentHeadCommittedRequiredFixture,
  type DbDriverSourceSummaryCurrentHeadEvidence,
  type DbDriverSourceSummaryCanonicalModelRecord
} from "./db-driver-source-summary-canonical-model.js";

const baseSha = "2758cfa576c11ccbc8fd62e473d06d9d3d0d937b";
const pr62HeadSha = "18ace6bbe9b41e572dc2b8310d6d6c0d3598f30e";
const fixtureCurrentHeadSha = "3333333333333333333333333333333333333333";
const fixtureFutureHeadSha = "2222222222222222222222222222222222222222";
const branchName = "feat/db-driver-source-summary-canonical-model-v118-prep";

function record(patch: Partial<DbDriverSourceSummaryCanonicalModelRecord> = {}) {
  return {
    ...createDefaultDbDriverSourceSummaryCanonicalModelRecord({
      prNumber: dbDriverSourceSummaryCanonicalPrNumber,
      targetBranch: branchName,
      targetCommitSha: pr62HeadSha,
      baseCommitSha: baseSha,
      createdAt: "2026-06-12T00:00:00Z"
    }),
    currentHeadEvidence: {
      prBodyStatus: "current_head_recorded",
      githubChecksStatus: "same_head_pass",
      qualityGateArtifactStatus: "same_head_artifact_present",
      prNumber: dbDriverSourceSummaryCanonicalPrNumber,
      headSha: pr62HeadSha,
      baseSha,
      ciRunId: "27384710953",
      qualityGateRunId: "27384898010",
      qualityGateArtifactId: "7579705811",
      evidenceSource: "pr_body_github_checks_safe_artifact"
    },
    ...patch
  } as DbDriverSourceSummaryCanonicalModelRecord;
}

function currentHeadFixture(patch: Partial<DbDriverSourceSummaryCanonicalModelRecord> = {}) {
  return record({
    targetCommitSha: fixtureFutureHeadSha,
    baseCommitSha: baseSha,
    currentHeadEvidence: {
      ...record().currentHeadEvidence,
      headSha: fixtureFutureHeadSha
    },
    evidenceMode: "current_head_committed_required",
    committedEvidenceRole: "current_head_committed_evidence",
    committedEvidenceStatus: "current_head_required",
    previousHeadCommittedEvidenceAllowed: false,
    ...patch
  });
}

describe("DB driver source-summary canonical evidence model", () => {
  it("accepts previous-head committed evidence only with current-head PR body, checks, and safe artifact evidence", () => {
    const current = validateCurrentDbDriverSourceSummaryCanonicalModelRecord(record());

    expect(current.canonicalModelStatus).toBe("model_ready");
    expect(current.evidenceMode).toBe("previous_head_committed_plus_current_head_artifact");
    expect(current.committedEvidenceRole).toBe("previous_head_safe_evidence");
    expect(current.currentHeadEvidenceRole).toBe("pr_body_github_checks_safe_artifact");
    expect(current.committedEvidenceStatus).toBe("previous_head_allowed");
    expect(current.previousHeadCommittedEvidenceAllowed).toBe(true);
    expect(current.selfReferentialShaPolicy).toBe("exception_allowed_with_current_head_artifact");
    expect(current.artifactLoopStopPolicy).toBe("stop_after_same_head_pass");
    expect(current.safeSummaryVerificationProfile).toBe(dbDriverSourceSummaryVerificationProfile);
    expect(current.prNumber).toBe(62);
    expect(current.targetCommitSha).toBe(pr62HeadSha);
    expect(current.baseCommitSha).toBe(baseSha);
    expect(current.currentHeadEvidence.prNumber).toBe(62);
    expect(current.currentHeadEvidence.headSha).toBe(pr62HeadSha);
    expect(current.currentHeadEvidence.baseSha).toBe(baseSha);
    expect(current.currentHeadEvidence.qualityGateRunId).toBe("27384898010");
    expect(current.currentHeadEvidence.qualityGateArtifactId).toBe("7579705811");
  });

  it("keeps DB driver selection, dependency, runtime, and compliance readiness out of scope", () => {
    const current = validateCurrentDbDriverSourceSummaryCanonicalModelRecord(record());

    expect(current.sourceEvidenceStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual([...dbDriverSourceSummaryCanonicalCandidateDrivers]);
    expect(current.ownerApprovalStatus).toBe("not_approved");
    expect(current.finalApprovalGateStatus).toBe("blocked");
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
    ["missing PR body", { prBodyStatus: "missing" }],
    ["placeholder PR body", { prBodyStatus: "placeholder" }],
    ["missing GitHub checks", { githubChecksStatus: "missing" }],
    ["failed GitHub checks", { githubChecksStatus: "failed" }],
    ["stale GitHub checks", { githubChecksStatus: "stale" }],
    ["missing quality-gate artifact", { qualityGateArtifactStatus: "missing" }],
    ["fake quality-gate artifact status", { qualityGateArtifactStatus: "fake" }],
    ["stale quality-gate artifact", { qualityGateArtifactStatus: "stale" }],
    ["missing current-head PR number", { prNumber: null }],
    ["stale current-head PR number", { prNumber: 61 }],
    ["missing current-head SHA", { headSha: null }],
    ["synthetic current-head SHA", { headSha: dbDriverSourceSummaryRejectedSyntheticHeadSha }],
    ["base commit as current-head SHA", { headSha: baseSha }],
    ["missing current-head base SHA", { baseSha: null }],
    ["wrong current-head base SHA", { baseSha: fixtureCurrentHeadSha }],
    ["missing CI run", { ciRunId: null }],
    ["stale CI run", { ciRunId: "27382334854" }],
    ["missing quality-gate run", { qualityGateRunId: null }],
    ["stale quality-gate run", { qualityGateRunId: "27382242932" }],
    ["missing quality-gate artifact ID", { qualityGateArtifactId: null }],
    ["stale quality-gate artifact ID", { qualityGateArtifactId: "7578755317" }],
    ["known fake artifact ID", { qualityGateArtifactId: "7500000000" }],
    ["missing evidence source", { evidenceSource: "missing" }]
  ])("rejects %s", (_label, patch) => {
    const evidencePatch = patch as Partial<DbDriverSourceSummaryCurrentHeadEvidence>;
    expect(() =>
      validateCurrentDbDriverSourceSummaryCanonicalModelRecord(
        record({
          currentHeadEvidence: {
            ...record().currentHeadEvidence,
            ...evidencePatch
          }
        })
      )
    ).toThrow();
  });

  it.each([
    ["zero PR number", { prNumber: 0 }],
    ["stale PR number", { prNumber: 61 }],
    ["synthetic target SHA", { targetCommitSha: dbDriverSourceSummaryRejectedSyntheticHeadSha }],
    ["target SHA equal to base", { targetCommitSha: baseSha }],
    ["invalid evidence mode", { evidenceMode: "invalid" }],
    ["wrong committed role", { committedEvidenceRole: "current_head_committed_evidence" }],
    ["missing self-referential policy", { selfReferentialShaPolicy: "not_handled" }],
    ["missing artifact loop stop policy", { artifactLoopStopPolicy: "not_defined" }],
    ["previous-head mode not allowed", { previousHeadCommittedEvidenceAllowed: false }],
    ["selected driver", { selectedDriver: "pg" }],
    ["driver choice selected", { driverChoiceStatus: "selected" }],
    ["package change allowed", { packageJsonChangeAllowed: true }],
    ["pnpm lock change allowed", { pnpmLockChangeAllowed: true }],
    ["dependency allowed", { dbDriverDependencyAllowed: true }],
    ["real DB allowed", { realDbConnectionAllowed: true }],
    ["migration allowed", { migrationExecutionAllowed: true }],
    ["live DB test allowed", { liveDbIntegrationTestAllowed: true }],
    ["provider SDK apply allowed", { providerSdkApplyAllowed: true }],
    ["production deployment allowed", { actualProductionDeploymentAllowed: true }],
    ["runtime readiness allowed", { runtimeReadinessClaimAllowed: true }],
    ["production readiness allowed", { productionReadinessClaimAllowed: true }],
    ["legal compliance allowed", { legalComplianceClaimAllowed: true }],
    ["YouTube policy compliance allowed", { youtubePolicyComplianceClaimAllowed: true }]
  ])("rejects unsafe canonical state: %s", (_label, patch) => {
    expect(() => validateCurrentDbDriverSourceSummaryCanonicalModelRecord(record(patch as never))).toThrow();
  });

  it.each([
    "branch_head_sha_in_pr_metadata",
    "main_head_sha_in_pr_metadata",
    "github_actions_required_on_pushed_head",
    "current_pr_head",
    "current_pr_base",
    "HEAD_SHA_PLACEHOLDER",
    "BASE_SHA_PLACEHOLDER",
    "pending_after_pr_creation",
    "pending until GitHub Actions run",
    "not_applicable_before_pr_creation",
    "artifact pending",
    "local evidence collected before push",
    "recorded in GitHub PR body after push",
    "https://private.example.invalid/evidence",
    "postgres://user:pass@example.invalid/db",
    "0x1111111111111111111111111111111111111111",
    "ghp_exampletoken"
  ])("rejects unsafe evidence text %s", (unsafeText) => {
    expect(() =>
      validateCurrentDbDriverSourceSummaryCanonicalModelRecord(
        record({
          safeSummary: `Unsafe evidence value: ${unsafeText}`
        })
      )
    ).toThrow(/unsafe evidence rejected/);
  });

  it("allows rejection vocabulary inside policy fields without treating it as real evidence", () => {
    expect(() =>
      validateCurrentDbDriverSourceSummaryCanonicalModelRecord(
        record({
          placeholderPolicy: [
            "reject_current_pr_head",
            "reject_current_pr_base",
            "reject_HEAD_SHA_PLACEHOLDER",
            "reject_BASE_SHA_PLACEHOLDER",
            "reject_not_applicable_before_pr_creation",
            "reject_pending_until_github_actions"
          ],
          fakeArtifactPolicy: ["reject_7500000000", "reject_missing_artifact"]
        })
      )
    ).not.toThrow();
  });

  it("keeps a fixture-only current-head committed mode separate from the current product model", () => {
    const fixture = validateCurrentHeadCommittedRequiredFixture(currentHeadFixture());

    expect(fixture.evidenceMode).toBe("current_head_committed_required");
    expect(fixture.committedEvidenceRole).toBe("current_head_committed_evidence");
    expect(fixture.committedEvidenceStatus).toBe("current_head_required");
    expect(fixture.targetCommitSha).not.toBe(fixture.baseCommitSha);
  });

  it("accepts explicitly separated previous-head committed evidence with current-head artifact evidence", () => {
    const current = validateCurrentDbDriverSourceSummaryCanonicalModelRecord(
      record({
        committedEvidenceHeadSha: baseSha,
        committedEvidenceBaseSha: baseSha,
        targetCommitSha: pr62HeadSha,
        currentHeadEvidence: {
          ...record().currentHeadEvidence,
          headSha: pr62HeadSha,
          baseSha,
          prNumber: 62
        }
      })
    );

    expect(current.committedEvidenceHeadSha).toBe(baseSha);
    expect(current.currentHeadEvidence.headSha).toBe(pr62HeadSha);
  });

  it("rejects a current-head fixture that reuses the previous-head target SHA", () => {
    expect(() =>
      validateCurrentHeadCommittedRequiredFixture(
        currentHeadFixture({
          targetCommitSha: baseSha
        })
      )
    ).toThrow(/targetCommitSha must differ from baseCommitSha/);
  });

  it("keeps fixture values out of committed machine-readable evidence", () => {
    const committedEvidence = readFileSync(".codex/db-driver-source-summary-canonical-model.json", "utf8");

    expect(committedEvidence).not.toContain('"prNumber": 61');
    expect(committedEvidence).not.toContain(dbDriverSourceSummaryRejectedSyntheticHeadSha);
    expect(committedEvidence).toContain('"prNumber": 62');
  });
});
