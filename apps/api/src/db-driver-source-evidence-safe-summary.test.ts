import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverSourceEvidenceSafeSummaryRecord,
  dbDriverSourceEvidenceAllowedCountFields,
  dbDriverSourceEvidenceAllowedStatusFields,
  dbDriverSourceEvidenceAllowedSummaryFields,
  dbDriverSourceEvidenceForbiddenRawFields,
  dbDriverSourceEvidenceForbiddenWording,
  validateCurrentDbDriverSourceEvidenceSafeSummaryRecord,
  validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture,
  type DbDriverSourceEvidenceCandidateSafeSummary,
  type DbDriverSourceEvidenceSafeSummaryRecord
} from "./db-driver-source-evidence-safe-summary.js";

const branchName = "feat/db-driver-source-evidence-safe-summary-v118-prep";
const baseSha = "7e4d561ab0335ac8f143a367d8433ca6e6baba74";
const targetSha = "1ec848b325b97ceec20cdcff290f7094985c2f02";

const context = {
  harnessVersion: "1.1.8",
  prNumber: 60,
  targetBranch: branchName,
  targetCommitSha: targetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-12T00:00:00Z"
};

function record(patch: Partial<DbDriverSourceEvidenceSafeSummaryRecord> = {}) {
  return {
    ...createDefaultDbDriverSourceEvidenceSafeSummaryRecord(context),
    ...patch
  } as DbDriverSourceEvidenceSafeSummaryRecord;
}

function candidate(driverName: "pg" | "postgres", patch: Partial<DbDriverSourceEvidenceCandidateSafeSummary> = {}) {
  const item = createDefaultDbDriverSourceEvidenceSafeSummaryRecord(context).candidateSafeSummaries.find(
    (entry) => entry.driverName === driverName
  );
  if (!item) throw new Error(`missing ${driverName}`);
  return { ...item, ...patch } as DbDriverSourceEvidenceCandidateSafeSummary;
}

function futureReviewedFixture(candidatePatch: Partial<DbDriverSourceEvidenceCandidateSafeSummary> = {}) {
  return record({
    candidateSafeSummaries: [
      candidate("pg", {
        summaryStatus: "pass",
        allowedSummary: {
          sourceCategory: "github_advisory_summary",
          sourceName: "GitHub advisory summary",
          sourceCheckedAt: "2026-06-12T00:00:00Z",
          sourceExpiresAt: "2026-06-19T00:00:00Z",
          packageName: "pg",
          packageVersion: "8.16.0",
          candidateDriver: "pg",
          targetCommitSha: "2222222222222222222222222222222222222222",
          prNumber: 60,
          targetBranch: branchName,
          reviewStatus: "pass",
          summaryStatus: "pass",
          counts: {
            advisoryCount: 0,
            criticalCount: 0,
            highCount: 0,
            moderateCount: 0,
            lowCount: 0,
            unknownSeverityCount: 0,
            transitiveDependencyCount: 0,
            sourceCount: 1
          },
          statuses: {
            reviewStatus: "pass",
            summaryStatus: "pass",
            freshnessStatus: "fresh",
            rawPayloadStatus: "raw_payload_absent",
            knownBlockersStatus: "reviewed",
            sourceBindingStatus: "reviewed",
            packageVersionBindingStatus: "reviewed"
          },
          safeSummary: "Reviewed source-bound summary with counts and statuses only.",
          knownBlockersStatus: "reviewed",
          knownBlockers: []
        },
        reviewStatus: "pass",
        sourceCategory: "github_advisory_summary",
        packageVersion: "8.16.0",
        targetCommitSha: "2222222222222222222222222222222222222222",
        prNumber: 60,
        targetBranch: branchName,
        counts: {
          advisoryCount: 0,
          criticalCount: 0,
          highCount: 0,
          moderateCount: 0,
          lowCount: 0,
          unknownSeverityCount: 0,
          transitiveDependencyCount: 0,
          sourceCount: 1
        },
        statuses: {
          reviewStatus: "pass",
          summaryStatus: "pass",
          freshnessStatus: "fresh",
          rawPayloadStatus: "raw_payload_absent",
          knownBlockersStatus: "reviewed",
          sourceBindingStatus: "reviewed",
          packageVersionBindingStatus: "reviewed"
        },
        knownBlockersStatus: "reviewed",
        knownBlockers: [],
        safeSummary: "Reviewed source-bound summary with counts and statuses only.",
        refreshRequired: false,
        ...candidatePatch
      }),
      candidate("postgres")
    ]
  });
}

function futureReviewedCandidate() {
  const item = futureReviewedFixture().candidateSafeSummaries[0];
  if (!item) throw new Error("missing future reviewed candidate");
  return item;
}

describe("DB driver source evidence safe-summary contract", () => {
  it("defaults to contract ready without source review or driver selection", () => {
    const current = validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(record());

    expect(current.safeSummaryContractStatus).toBe("contract_ready");
    expect(current.sourceEvidenceStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.candidateSafeSummaries.map((item) => item.driverName)).toEqual(["pg", "postgres"]);
    expect(current.candidateSafeSummaries.every((item) => item.summaryStatus === "not_reviewed")).toBe(true);
    expect(current.allowedSummaryFields).toEqual([...dbDriverSourceEvidenceAllowedSummaryFields]);
    expect(current.allowedCountFields).toEqual([...dbDriverSourceEvidenceAllowedCountFields]);
    expect(current.allowedStatusFields).toEqual([...dbDriverSourceEvidenceAllowedStatusFields]);
    expect(current.forbiddenRawFields).toEqual([...dbDriverSourceEvidenceForbiddenRawFields]);
    expect(current.forbiddenWording).toEqual([...dbDriverSourceEvidenceForbiddenWording]);
    expect(current.rawPayloadStatus).toBe("raw_payload_absent");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.reviewStatus).toBe("not_reviewed");
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
  });

  it.each([
    ["selected driver", { selectedDriver: "pg" }],
    ["driver choice selected", { driverChoiceStatus: "selected" }],
    ["reviewed source evidence", { sourceEvidenceStatus: "reviewed" }],
    ["pass review status", { reviewStatus: "pass" }],
    ["known blockers empty array", { knownBlockers: [] as string[] }],
    ["raw payload present", { rawPayloadStatus: "raw_present" }],
    ["package json allowed", { packageJsonChangeAllowed: true }],
    ["pnpm lock allowed", { pnpmLockChangeAllowed: true }],
    ["db dependency allowed", { dbDriverDependencyAllowed: true }],
    ["real db allowed", { realDbConnectionAllowed: true }],
    ["migration execution allowed", { migrationExecutionAllowed: true }],
    ["live db integration allowed", { liveDbIntegrationTestAllowed: true }],
    ["provider SDK apply allowed", { providerSdkApplyAllowed: true }],
    ["production deployment allowed", { actualProductionDeploymentAllowed: true }],
    ["runtime readiness allowed", { runtimeReadinessClaimAllowed: true }],
    ["production readiness allowed", { productionReadinessClaimAllowed: true }],
    ["legal compliance allowed", { legalComplianceClaimAllowed: true }],
    ["youtube policy compliance allowed", { youtubePolicyComplianceClaimAllowed: true }]
  ] as const)("rejects %s in committed evidence", (_name, patch) => {
    expect(() => validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(record(patch))).toThrow();
  });

  it.each([
    ["PR #59 stale prNumber", { prNumber: 59 }],
    ["stale target SHA", { targetCommitSha: "c9e19b852640ae28b3aa77190c1368873b1fb2d2" }],
    ["target is base commit", { targetCommitSha: baseSha }]
  ] as const)("rejects %s in machine-readable safe-summary evidence", (_name, patch) => {
    expect(() => validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(record(patch))).toThrow();
  });

  it("rejects stale quality-gate run and artifact values in machine-readable evidence", () => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(
        record({
          safeSummary:
            "DB driver source evidence safe-summary contract references 27379749965 and 7577783685 as stale evidence."
        })
      )
    ).toThrow(/stale evidence value/);
  });

  it.each([
    ["reviewed status", { sourceEvidenceStatus: "reviewed" }],
    ["selected driver", { selectedDriver: "pg" }],
    ["dependency allowed", { dbDriverDependencyAllowed: true }],
    ["package json allowed", { packageJsonChangeAllowed: true }],
    ["knownBlockers empty array", { knownBlockers: [] as string[] }]
  ] as const)("contract_ready does not permit %s", (_name, patch) => {
    expect(() => validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(record(patch))).toThrow();
  });

  it.each([
    ["copied future reviewed fixture", [...futureReviewedFixture().candidateSafeSummaries]],
    ["candidate allowedSummary object", [candidate("pg", { allowedSummary: { sourceName: "summary" } }), candidate("postgres")]],
    ["candidate counts object", [candidate("pg", { counts: futureReviewedCandidate().counts }), candidate("postgres")]],
    ["candidate statuses object", [candidate("pg", { statuses: futureReviewedCandidate().statuses }), candidate("postgres")]],
    ["candidate reviewStatus pass", [candidate("pg", { reviewStatus: "pass" }), candidate("postgres")]],
    ["candidate summaryStatus pass", [candidate("pg", { summaryStatus: "pass" }), candidate("postgres")]]
  ] as const)("rejects %s in committed safe-summary evidence", (_name, candidateSafeSummaries) => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(record({ candidateSafeSummaries: [...candidateSafeSummaries] }))
    ).toThrow();
  });

  it.each([
    "rawAuditJson",
    "rawAdvisoryResponse",
    "rawOsvResponse",
    "rawNpmRegistryMetadata",
    "rawDependencyTree",
    "stdout",
    "stderr",
    "logsUrl",
    "fileContents",
    "databaseUrl",
    "connectionString",
    "privateKey",
    "clientSecret",
    "apiKey",
    "accessToken",
    "refreshToken"
  ])("rejects forbidden raw field %s recursively", (field) => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(
        record({ candidateSafeSummaries: [candidate("pg", { allowedSummary: { [field]: "unsafe" } }), candidate("postgres")] })
      )
    ).toThrow(/forbidden raw field|unsafe key/);
  });

  it.each([
    ["raw npm audit JSON value", '{"auditReportVersion":2,"vulnerabilities":{}}'],
    ["GHSA advisory id value", "GHSA-abcd-efgh-ijkl"],
    ["CVE id value", "CVE-2026-12345"],
    ["OSV raw value", "OSV raw response body"],
    ["npm registry raw value", "npm registry raw metadata"],
    ["dependency tree value", "full dependency tree"],
    ["stdout value", "stdout from command"],
    ["stderr value", "stderr from command"],
    ["stack trace value", "stack trace frame"],
    ["logs_url value", "logs_url reference"],
    ["jobs_url value", "jobs_url reference"],
    ["private URL", "https://private.example.test/report"],
    ["DB connection string", "postgres://user:pass@example.test/db"],
    ["postgresql connection string", "postgresql://user:pass@example.test/db"],
    ["DATABASE_URL value", "DATABASE_URL=postgres://user:pass@example.test/db"],
    ["PRIVATE KEY value", "BEGIN PRIVATE KEY"],
    ["wallet address", "0x1111111111111111111111111111111111111111"],
    ["token-like value", "ghp_exampletoken"],
    ["API token-like value", "sk-exampletoken"],
    ["Slack token-like value", "xoxb-exampletoken"],
    ["AWS key-like value", `AK${"IA"}1234567890ABCDEF`]
  ])("rejects %s", (_name, unsafeValue) => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(
        record({ candidateSafeSummaries: [candidate("pg", { safeSummary: unsafeValue }), candidate("postgres")] })
      )
    ).toThrow(/unsafe evidence|forbidden wording/);
  });

  it.each([
    "clean",
    "no vulnerabilities",
    "no known blockers",
    "safe to install",
    "approved",
    "secure",
    "legally safe",
    "policy compliant",
    "production ready",
    "dependency approved",
    "no issues",
    "no risk",
    "risk free",
    "safe for production",
    "approved for production",
    "ready to install",
    "installation approved",
    "dependency allowed",
    "package allowed",
    "source approved",
    "summary approved",
    "reviewed and safe",
    "security passed",
    "audit passed",
    "advisory passed",
    "all clear",
    "green light"
  ])("rejects forbidden wording in safe summary: %s", (wording) => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(
        record({ candidateSafeSummaries: [candidate("pg", { safeSummary: `This dependency is ${wording}.` }), candidate("postgres")] })
      )
    ).toThrow(/forbidden wording|unsafe evidence/);
  });

  it("accepts future reviewed safe-summary fixture only in tests", () => {
    expect(validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(futureReviewedFixture(), "pg")).toBeTruthy();
  });

  it("rejects future reviewed fixture with raw payload", () => {
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(
        futureReviewedFixture({ allowedSummary: { rawAuditJson: "{}" } }),
        "pg"
      )
    ).toThrow(/forbidden raw field/);
  });

  it.each(["clean", "no vulnerabilities", "approved"])("rejects future reviewed fixture wording: %s", (wording) => {
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(futureReviewedFixture({ safeSummary: wording }), "pg")
    ).toThrow(/forbidden wording|unsafe evidence/);
  });

  it("rejects future reviewed fixture missing target commit", () => {
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(futureReviewedFixture({ targetCommitSha: null }), "pg")
    ).toThrow(/bind package version/);
  });

  it("rejects future reviewed fixture package version mismatch", () => {
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(futureReviewedFixture({ packageName: "postgres" }), "pg")
    ).toThrow(/package version mismatch/);
  });

  it.each([
    ["negative count", { advisoryCount: -1 }],
    ["non-integer count", { advisoryCount: 0.5 }],
    ["advisoryCount mismatch", { advisoryCount: 2 }],
    ["sourceCount 0", { sourceCount: 0 }],
    ["transitiveDependencyCount over cap", { transitiveDependencyCount: 1001 }]
  ] as const)("rejects future reviewed fixture with %s", (_name, countPatch) => {
    const baseCounts = futureReviewedCandidate().counts;
    if (!baseCounts) throw new Error("missing counts");
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(
        futureReviewedFixture({ counts: { ...baseCounts, ...countPatch } }),
        "pg"
      )
    ).toThrow();
  });

  it.each([
    ["unknown status field", { customStatus: "pass" }],
    ["legalComplianceStatus", { legalComplianceStatus: "pass" }],
    ["youtubePolicyComplianceStatus", { youtubePolicyComplianceStatus: "pass" }],
    ["raw payload present", { rawPayloadStatus: "raw_present" }],
    ["stale freshness", { freshnessStatus: "stale" }]
  ] as const)("rejects future reviewed fixture with %s", (_name, statusPatch) => {
    const baseStatuses = futureReviewedCandidate().statuses;
    if (!baseStatuses) throw new Error("missing statuses");
    expect(() =>
      validateFutureReviewedDbDriverSourceEvidenceSafeSummaryFixture(
        futureReviewedFixture({ statuses: { ...baseStatuses, ...statusPatch } as never }),
        "pg"
      )
    ).toThrow();
  });

  it("committed .codex evidence remains no-driver, no-package, no-lockfile, no-real-DB", () => {
    const evidence = JSON.parse(readFileSync(".codex/db-driver-source-evidence-safe-summary.json", "utf8"));
    const current = validateCurrentDbDriverSourceEvidenceSafeSummaryRecord(evidence);

    expect(current.safeSummaryContractStatus).toBe("contract_ready");
    expect(current.sourceEvidenceStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.knownBlockers).toBeNull();
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
  });
});
