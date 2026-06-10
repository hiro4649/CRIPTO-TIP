import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allowedDbDriverCandidateDrivers,
  assertNoUnsafeDbDriverCandidateReviewPackEvidence,
  createDefaultDbDriverCandidateReviewPackRecord,
  dbDriverCandidateReviewPackBlockers,
  dbDriverCandidateReviewPackRequiredSections,
  validateCommittedDbDriverCandidateReviewPackEvidence,
  validateCurrentDbDriverCandidateReviewPackRecord,
  type DbDriverCandidateReview,
  type DbDriverCandidateReviewPackRecord
} from "./db-driver-candidate-review-pack.js";

const pr53HeadSha = "cbde064f86d4906e206ba679dffa306b090fd0c8";
const pr53BaseSha = "62bbe12522e51b82b422a364271f8553ad2eed49";
const pr51MergeSha = "3ba972cd1f923d31dabeb1926749eff7d5bcb27d";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 53,
  targetBranch: "feat/db-driver-candidate-review-pack-v117-prep",
  targetCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  baseCommitSha: pr53BaseSha,
  createdAt: "2026-06-11T00:00:00.000Z",
  harnessVersion: "1.1.7"
};

const pr53Context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 53,
  targetBranch: "feat/db-driver-candidate-review-pack-v117-prep",
  targetCommitSha: pr53HeadSha,
  baseCommitSha: pr53BaseSha
};

function pack(patch: Partial<DbDriverCandidateReviewPackRecord> = {}) {
  return {
    ...createDefaultDbDriverCandidateReviewPackRecord(context),
    ...patch
  } as DbDriverCandidateReviewPackRecord;
}

function candidateReview(driverName: "pg" | "postgres", patch: Partial<DbDriverCandidateReview> = {}) {
  const review = createDefaultDbDriverCandidateReviewPackRecord(context).candidateReviews.find(
    (candidate) => candidate.driverName === driverName
  );
  if (!review) throw new Error(`missing default ${driverName} review`);
  return {
    ...review,
    ...patch
  } as DbDriverCandidateReview;
}

function committedPackFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-candidate-review-pack.json", "utf8")) as DbDriverCandidateReviewPackRecord;
}

function evidencePackFromDisk() {
  return JSON.parse(readFileSync(".codex/evidence-pack.json", "utf8")) as {
    prNumber: number;
    headSha: string;
    baseSha: string;
    testSummary: { testFiles: number; passed: number; skipped: number };
  };
}

describe("db driver candidate review pack", () => {
  it("creates not-ready candidate evidence without selecting a driver", () => {
    const record = pack();

    expect(record.reviewPackStatus).toBe("not_ready");
    expect(record.driverChoiceStatus).toBe("not_selected");
    expect(record.selectedDriver).toBeNull();
    expect(record.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(record.licenseReviewStatus).toBe("not_reviewed");
    expect(record.supplyChainReviewStatus).toBe("not_reviewed");
    expect(record.securityAdvisoryReviewStatus).toBe("not_reviewed");
    expect(record.versionPolicyStatus).toBe("not_selected");
    expect(record.packageDiffStatus).toBe("missing");
    expect(record.lockfileReviewStatus).toBe("missing");
    expect(record.secretBoundaryStatus).toBe("not_reviewed");
    expect(record.ownerApprovalStatus).toBe("not_approved");
    expect(record.finalApprovalGateStatus).toBe("blocked");
    expect(record.dependencyPrTemplateStatus).toBe("template_ready");
    expect(validateCurrentDbDriverCandidateReviewPackRecord(record)).toBe(record);
  });

  it("keeps pg and postgres as candidates only", () => {
    const record = pack();

    expect(record.candidateReviews).toHaveLength(2);
    expect(record.candidateReviews.map((review) => review.driverName)).toEqual([...allowedDbDriverCandidateDrivers]);
    for (const review of record.candidateReviews) {
      expect(review.packageName).toBe(review.driverName);
      expect(review.candidateStatus).toBe("candidate");
      expect(review.licenseReviewStatus).toBe("not_reviewed");
      expect(review.supplyChainReviewStatus).toBe("not_reviewed");
      expect(review.securityAdvisoryReviewStatus).toBe("not_reviewed");
      expect(review.versionPolicyStatus).toBe("not_selected");
      expect(review.packageDiffStatus).toBe("missing");
      expect(review.lockfileReviewStatus).toBe("missing");
      expect(review.secretBoundaryStatus).toBe("not_reviewed");
      expect(review.ownerApprovalStatus).toBe("not_approved");
      expect(review.finalApprovalGateStatus).toBe("blocked");
      expect(review.blockers).toEqual([...dbDriverCandidateReviewPackBlockers]);
    }
  });

  it("keeps all permission flags false", () => {
    const record = pack();

    expect(record.packageJsonChangeAllowed).toBe(false);
    expect(record.pnpmLockChangeAllowed).toBe(false);
    expect(record.dbDriverDependencyAllowed).toBe(false);
    expect(record.realDbConnectionAllowed).toBe(false);
    expect(record.migrationExecutionAllowed).toBe(false);
    expect(record.liveDbIntegrationTestAllowed).toBe(false);
    expect(record.providerSdkApplyAllowed).toBe(false);
    expect(record.actualProductionDeploymentAllowed).toBe(false);
    expect(record.runtimeReadinessClaimAllowed).toBe(false);
    expect(record.productionReadinessClaimAllowed).toBe(false);
    expect(record.legalComplianceClaimAllowed).toBe(false);
    expect(record.youtubePolicyComplianceClaimAllowed).toBe(false);
  });

  it("keeps committed machine-readable candidate pack evidence safe and not ready", () => {
    const record = committedPackFromDisk();

    expect(record.reviewPackStatus).toBe("not_ready");
    expect(record.driverChoiceStatus).toBe("not_selected");
    expect(record.selectedDriver).toBeNull();
    expect(record.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(record.packageJsonChangeAllowed).toBe(false);
    expect(record.pnpmLockChangeAllowed).toBe(false);
    expect(record.dbDriverDependencyAllowed).toBe(false);
    expect(validateCurrentDbDriverCandidateReviewPackRecord(record)).toBe(record);
    expect(validateCommittedDbDriverCandidateReviewPackEvidence(record, pr53Context)).toBe(record);
  });

  it("keeps committed evidence bound to PR 53 head and base without selecting a driver", () => {
    const record = committedPackFromDisk();
    const evidencePack = evidencePackFromDisk();

    expect(record.prNumber).toBe(53);
    expect(record.targetCommitSha).toBe(pr53HeadSha);
    expect(record.baseCommitSha).toBe(pr53BaseSha);
    expect(record.targetCommitSha).not.toBe(record.baseCommitSha);
    expect(evidencePack.prNumber).toBe(53);
    expect(evidencePack.headSha).toBe(pr53HeadSha);
    expect(evidencePack.baseSha).toBe(pr53BaseSha);
    expect(evidencePack.headSha).not.toBe(evidencePack.baseSha);
  });

  it.each([
    ["selected driver", { selectedDriver: "pg" }, /must not select a driver/],
    ["selected choice status", { driverChoiceStatus: "selected" }, /driverChoiceStatus must remain not_selected/],
    ["ready review pack status", { reviewPackStatus: "ready_for_owner_review" }, /must remain not_ready/],
    ["license pass", { licenseReviewStatus: "pass" }, /licenseReviewStatus must remain not_reviewed/],
    ["supply chain pass", { supplyChainReviewStatus: "pass" }, /supplyChainReviewStatus must remain not_reviewed/],
    ["security advisory pass", { securityAdvisoryReviewStatus: "pass" }, /securityAdvisoryReviewStatus must remain not_reviewed/],
    ["version selected", { versionPolicyStatus: "selected" }, /versionPolicyStatus must remain not_selected/],
    ["package diff pass", { packageDiffStatus: "pass" }, /packageDiffStatus must remain missing/],
    ["lockfile pass", { lockfileReviewStatus: "pass" }, /lockfileReviewStatus must remain missing/],
    ["secret boundary pass", { secretBoundaryStatus: "pass" }, /secretBoundaryStatus must remain not_reviewed/],
    ["owner approved", { ownerApprovalStatus: "approved" }, /ownerApprovalStatus must remain not_approved/],
    ["final gate approved", { finalApprovalGateStatus: "approved_for_dependency_pr" }, /finalApprovalGateStatus must remain blocked/]
  ] as Array<[string, Partial<DbDriverCandidateReviewPackRecord>, RegExp]>)("rejects current pack with %s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack(patch))).toThrow(expected);
  });

  it.each([
    ["package change allowed", { packageJsonChangeAllowed: true }, /packageJsonChangeAllowed must remain false/],
    ["lockfile change allowed", { pnpmLockChangeAllowed: true }, /pnpmLockChangeAllowed must remain false/],
    ["DB driver dependency allowed", { dbDriverDependencyAllowed: true }, /dbDriverDependencyAllowed must remain false/],
    ["real DB connection", { realDbConnectionAllowed: true }, /realDbConnectionAllowed must remain false/],
    ["migration execution", { migrationExecutionAllowed: true }, /migrationExecutionAllowed must remain false/],
    ["live DB integration", { liveDbIntegrationTestAllowed: true }, /liveDbIntegrationTestAllowed must remain false/],
    ["provider SDK apply", { providerSdkApplyAllowed: true }, /providerSdkApplyAllowed must remain false/],
    ["production deployment", { actualProductionDeploymentAllowed: true }, /actualProductionDeploymentAllowed must remain false/],
    ["runtime readiness", { runtimeReadinessClaimAllowed: true }, /runtimeReadinessClaimAllowed must remain false/],
    ["production readiness", { productionReadinessClaimAllowed: true }, /productionReadinessClaimAllowed must remain false/],
    ["legal compliance", { legalComplianceClaimAllowed: true }, /legalComplianceClaimAllowed must remain false/],
    ["YouTube policy compliance", { youtubePolicyComplianceClaimAllowed: true }, /youtubePolicyComplianceClaimAllowed must remain false/]
  ] as Array<[string, Partial<DbDriverCandidateReviewPackRecord>, RegExp]>)("rejects permission flag %s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack(patch))).toThrow(expected);
  });

  it.each([
    ["missing candidate driver", ["pg"], /must list exactly pg and postgres/],
    ["extra candidate driver", ["pg", "postgres", "future-db-driver"], /must list exactly pg and postgres/],
    ["wrong order", ["postgres", "pg"], /candidateDrivers must be exactly pg then postgres/]
  ] as Array<[string, string[], RegExp]>)("rejects %s", (_label, candidateDrivers, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack({ candidateDrivers: candidateDrivers as ["pg", "postgres"] }))).toThrow(expected);
  });

  it.each([
    ["missing pg review", [candidateReview("postgres")], /exactly one review/],
    ["extra review", [candidateReview("pg"), candidateReview("postgres"), { ...candidateReview("pg"), driverName: "future-db-driver" }], /exactly one review/],
    ["duplicate review", [candidateReview("pg"), candidateReview("pg")], /duplicate DB driver candidate review/],
    ["package name mismatch", [candidateReview("pg", { packageName: "postgres" }), candidateReview("postgres")], /packageName must match/],
    ["selected candidate status", [candidateReview("pg", { candidateStatus: "selected" as "candidate" }), candidateReview("postgres")], /status must remain candidate/],
    ["not selected candidate status", [candidateReview("pg", { candidateStatus: "not_selected" }), candidateReview("postgres")], /status must remain candidate/],
    ["rejected candidate status", [candidateReview("pg", { candidateStatus: "rejected" }), candidateReview("postgres")], /status must remain candidate/],
    ["candidate license pass", [candidateReview("pg", { licenseReviewStatus: "pass" }), candidateReview("postgres")], /pg licenseReviewStatus must remain not_reviewed/],
    ["candidate package diff pass", [candidateReview("pg", { packageDiffStatus: "pass" }), candidateReview("postgres")], /pg packageDiffStatus must remain missing/],
    ["candidate final gate approved", [candidateReview("pg", { finalApprovalGateStatus: "approved_for_dependency_pr" }), candidateReview("postgres")], /pg finalApprovalGateStatus must remain blocked/]
  ] as Array<[string, DbDriverCandidateReview[], RegExp]>)("rejects candidate review with %s", (_label, candidateReviews, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack({ candidateReviews }))).toThrow(expected);
  });

  it("keeps candidate status separate from driver selection", () => {
    const record = pack();

    expect(record.candidateReviews.every((review) => review.candidateStatus === "candidate")).toBe(true);
    expect(record.driverChoiceStatus).toBe("not_selected");
    expect(record.selectedDriver).toBeNull();
    expect(record.ownerApprovalStatus).toBe("not_approved");
    expect(record.packageDiffStatus).toBe("missing");
  });

  it.each([
    ["candidate status does not allow driverChoiceStatus selected", { driverChoiceStatus: "selected" }, /driverChoiceStatus must remain not_selected/],
    ["candidate status does not allow selectedDriver", { selectedDriver: "pg" }, /must not select a driver/],
    ["candidate status still requires ownerApprovalStatus not_approved", { ownerApprovalStatus: "approved" }, /ownerApprovalStatus must remain not_approved/],
    ["candidate status still requires packageDiffStatus missing", { packageDiffStatus: "pass" }, /packageDiffStatus must remain missing/]
  ] as Array<[string, Partial<DbDriverCandidateReviewPackRecord>, RegExp]>)("%s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack(patch))).toThrow(expected);
  });

  it("requires every review pack section", () => {
    const record = pack({
      requiredPrSections: dbDriverCandidateReviewPackRequiredSections.filter(
        (section) => section !== "Candidate Driver Review Matrix"
      )
    });

    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(record)).toThrow(/Candidate Driver Review Matrix/);
  });

  it("requires known blocker vocabulary", () => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack({ blockers: ["unknown_blocker"] }))).toThrow(/unknown blocker/);
    expect(() =>
      validateCurrentDbDriverCandidateReviewPackRecord(
        pack({
          blockers: dbDriverCandidateReviewPackBlockers.filter((blocker) => blocker !== "package_diff_missing")
        })
      )
    ).toThrow(/package_diff_missing/);
  });

  it.each([
    ["approval wording", "Candidate is approved for dependency work."],
    ["selection wording", "Candidate is selected for implementation."],
    ["production readiness wording", "Candidate is production ready."],
    ["runtime readiness wording", "Candidate is runtime ready."],
    ["legal compliant wording", "Candidate is legal compliant."],
    ["YouTube policy compliant wording", "Candidate is YouTube policy compliant."],
    ["ready for owner review wording", "Candidate is ready_for_owner_review."]
  ])("rejects unsafe safeSummary claim: %s", (_label, safeSummary) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack({ safeSummary }))).toThrow(/safeSummary must not claim/);
  });

  it.each([
    ["candidate approval wording", "Candidate is approved for dependency work."],
    ["candidate selection wording", "Candidate is selected for implementation."],
    ["candidate production readiness wording", "Candidate is production_ready."],
    ["candidate legal compliant wording", "Candidate is legal_compliant."],
    ["candidate YouTube policy compliant wording", "Candidate is youtube_policy_compliant."],
    ["candidate recommended wording", "Candidate is recommended for review."],
    ["candidate winner wording", "Candidate is the winner."],
    ["candidate best choice wording", "Candidate is the best choice."],
    ["candidate preferred wording", "Candidate is preferred."],
    ["candidate approved choice wording", "Candidate is the approved choice."],
    ["candidate safe for dependency wording", "Candidate is safe for dependency."],
    ["candidate ready for dependency wording", "Candidate is ready for dependency."],
    ["candidate install now wording", "Install now."],
    ["candidate production candidate wording", "Candidate is a production candidate."],
    ["candidate legally safe wording", "Candidate is legally safe."],
    ["candidate policy compliant wording", "Candidate is policy compliant."]
  ])("rejects candidate safeSummary claim: %s", (_label, safeSummary) => {
    expect(() =>
      validateCurrentDbDriverCandidateReviewPackRecord(
        pack({
          candidateReviews: [candidateReview("pg", { safeSummary }), candidateReview("postgres")]
        })
      )
    ).toThrow(/safeSummary must not claim/);
  });

  it.each([
    ["private URL", "private URL omitted https://example.invalid/provider"],
    ["DB connection string", "postgres://user:pass@db.local:5432/app"],
    ["wallet address", "0x1111111111111111111111111111111111111111"],
    ["GitHub token", ["ghp", "abcdefghijklmnopqrstuvwxyz"].join("_")],
    ["OpenAI style token", ["sk", "abcdefghijklmnopqrstuvwxyz"].join("-")],
    ["Slack token", ["xoxb", "abcdefghijklmnopqrstuvwxyz"].join("-")],
    ["AWS key", ["AKIA", "1234567890ABCDEF"].join("")],
    ["Bearer token", ["Bearer", "abc.def.ghi"].join(" ")],
    ["raw GitHub logs", "raw GitHub logs copied here"],
    ["gh raw log command", "gh run view --log"],
    ["raw provider response", "raw provider response copied here"],
    ["stdout", "stdout copied here"],
    ["stderr", "stderr copied here"],
    ["stack trace", "stack_trace copied here"],
    ["secret assignment", "secret=unsafe"],
    ["api key assignment", "api_key=unsafe"],
    ["OAuth token", "OAuth token copied here"],
    ["unsafe key apiKey", { apiKey: "safe-looking" }],
    ["unsafe key connectionString", { connectionString: "safe-looking" }],
    ["unsafe key password", { password: "safe-looking" }],
    ["unsafe key clientSecret", { clientSecret: "safe-looking" }],
    ["unsafe key refreshToken", { refreshToken: "safe-looking" }],
    ["unsafe key rawProviderResponse", { rawProviderResponse: "safe-looking" }],
    ["unsafe key privateUrl", { privateUrl: "safe-looking" }]
  ] as const)("rejects unsafe evidence value/key: %s", (_label, unsafe) => {
    if (typeof unsafe === "string") {
      expect(() => assertNoUnsafeDbDriverCandidateReviewPackEvidence({ safeSummary: unsafe })).toThrow(
        /unsafe DB driver candidate review pack evidence rejected/
      );
      return;
    }
    expect(() => assertNoUnsafeDbDriverCandidateReviewPackEvidence(unsafe)).toThrow(
      /unsafe DB driver candidate review pack evidence rejected/
    );
  });

  it.each([
    ["targetCommitSha placeholder", { targetCommitSha: "current_pr_head" }, /40-character SHA/],
    ["baseCommitSha placeholder", { baseCommitSha: "current_pr_base" }, /40-character SHA/],
    ["target equals base", { targetCommitSha: context.baseCommitSha }, /must differ from baseCommitSha/],
    ["non-UTC createdAt", { createdAt: "2026-06-11T00:00:00.000+09:00" }, /createdAt must be UTC/]
  ])("rejects invalid context %s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverCandidateReviewPackRecord(pack(patch))).toThrow(expected);
  });

  it.each([
    ["stale targetCommitSha equal to rollout main SHA", { targetCommitSha: pr53BaseSha }, /targetCommitSha must match context|targetCommitSha must differ/],
    ["baseCommitSha from PR 51 merge commit", { targetCommitSha: pr53HeadSha, baseCommitSha: pr51MergeSha }, /baseCommitSha must match context/],
    ["targetCommitSha equal baseCommitSha", { targetCommitSha: pr53BaseSha, baseCommitSha: pr53BaseSha }, /targetCommitSha must differ/],
    ["wrong prNumber", { prNumber: 52, targetCommitSha: pr53HeadSha, baseCommitSha: pr53BaseSha }, /prNumber must match context/],
    ["wrong branch", { targetBranch: "feat/old-branch", targetCommitSha: pr53HeadSha, baseCommitSha: pr53BaseSha }, /targetBranch must match context/]
  ] as Array<[string, Partial<DbDriverCandidateReviewPackRecord>, RegExp]>)("rejects committed candidate review pack with %s", (_label, patch, expected) => {
    expect(() => validateCommittedDbDriverCandidateReviewPackEvidence(pack(patch), pr53Context)).toThrow(expected);
  });

  it("does not commit a selected or ready review pack as machine-readable evidence", () => {
    const committed = committedPackFromDisk();

    expect(committed.selectedDriver).toBeNull();
    expect(committed.driverChoiceStatus).toBe("not_selected");
    expect(committed.reviewPackStatus).toBe("not_ready");
    expect(committed.ownerApprovalStatus).toBe("not_approved");
    expect(committed.finalApprovalGateStatus).toBe("blocked");
    expect(committed.packageJsonChangeAllowed).toBe(false);
    expect(committed.pnpmLockChangeAllowed).toBe(false);
    expect(committed.dbDriverDependencyAllowed).toBe(false);
  });
});
