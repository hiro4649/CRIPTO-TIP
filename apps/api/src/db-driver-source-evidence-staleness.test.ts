import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverSourceEvidenceStalenessRecord,
  dbDriverSourceEvidenceExpiryWindows,
  dbDriverSourceEvidenceInvalidationTriggers,
  validateCurrentDbDriverSourceEvidenceStalenessRecord,
  validateFutureFreshDbDriverSourceEvidenceFixture,
  type DbDriverSourceEvidenceCandidateStaleness,
  type DbDriverSourceEvidenceFreshFixtureContext,
  type DbDriverSourceEvidenceStalenessRecord
} from "./db-driver-source-evidence-staleness.js";

const branchName = "feat/db-driver-source-evidence-staleness-v118-prep";
const baseSha = "0ed3fbf8814204649c98e8360907db535a29a9ba";
const targetSha = "1111111111111111111111111111111111111111";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 0,
  targetBranch: branchName,
  targetCommitSha: targetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-11T00:00:00Z",
  harnessVersion: "1.1.7"
};

const fixtureContext: DbDriverSourceEvidenceFreshFixtureContext = {
  packageName: "pg",
  packageVersion: "8.16.0",
  sourceCategory: "github_advisory_summary",
  targetCommitSha: "2222222222222222222222222222222222222222",
  baseCommitSha: baseSha,
  prNumber: 58,
  targetBranch: branchName,
  now: "2026-06-11T00:00:00Z"
};

function record(patch: Partial<DbDriverSourceEvidenceStalenessRecord> = {}) {
  return {
    ...createDefaultDbDriverSourceEvidenceStalenessRecord(context),
    ...patch
  } as DbDriverSourceEvidenceStalenessRecord;
}

function candidate(driverName: "pg" | "postgres", patch: Partial<DbDriverSourceEvidenceCandidateStaleness> = {}) {
  const item = createDefaultDbDriverSourceEvidenceStalenessRecord(context).candidateStaleness.find(
    (entry) => entry.driverName === driverName
  );
  if (!item) throw new Error(`missing ${driverName}`);
  return { ...item, ...patch } as DbDriverSourceEvidenceCandidateStaleness;
}

function futureFreshFixture(
  recordPatch: Partial<DbDriverSourceEvidenceStalenessRecord> = {},
  candidatePatch: Partial<DbDriverSourceEvidenceCandidateStaleness> = {}
) {
  return record({
    sourceEvidenceStatus: "fresh",
    sourceBindingStatus: "reviewed",
    sourceTimestampStatus: "reviewed",
    sourceFreshnessStatus: "fresh",
    sourceExpiryStatus: "fresh",
    packageNameBindingStatus: "reviewed",
    packageVersionBindingStatus: "reviewed",
    targetCommitBindingStatus: "reviewed",
    baseCommitBindingStatus: "reviewed",
    prNumberBindingStatus: "reviewed",
    branchBindingStatus: "reviewed",
    sourceCategoryBindingStatus: "reviewed",
    safeSummaryBindingStatus: "reviewed",
    knownBlockersStatus: "reviewed",
    knownBlockers: [],
    candidateStaleness: [
      candidate("pg", {
        stalenessStatus: "fresh",
        sourceCheckedAt: "2026-06-10T00:00:00Z",
        sourceExpiresAt: "2026-06-16T00:00:00Z",
        sourceCategory: fixtureContext.sourceCategory,
        packageVersion: fixtureContext.packageVersion,
        targetCommitSha: fixtureContext.targetCommitSha,
        baseCommitSha: fixtureContext.baseCommitSha,
        prNumber: fixtureContext.prNumber,
        targetBranch: fixtureContext.targetBranch,
        revalidationRequired: false,
        revalidationReasons: [],
        safeSummary: "pg future source fixture uses safe bounded summary only.",
        ...candidatePatch
      }),
      candidate("postgres")
    ],
    ...recordPatch
  });
}

function committedStalenessFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-source-evidence-staleness.json", "utf8")) as DbDriverSourceEvidenceStalenessRecord;
}

describe("db driver source evidence staleness", () => {
  it("creates policy-ready but not-reviewed staleness evidence", () => {
    const current = record();

    expect(current.stalenessPolicyStatus).toBe("policy_ready");
    expect(current.bindingDryRunStatus).toBe("not_reviewed");
    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.sourceEvidenceStatus).toBe("not_reviewed");
    expect(current.sourceBindingStatus).toBe("not_reviewed");
    expect(current.sourceTimestampStatus).toBe("not_reviewed");
    expect(current.sourceFreshnessStatus).toBe("not_reviewed");
    expect(current.sourceExpiryStatus).toBe("not_reviewed");
    expect(current.revalidationRequired).toBe(true);
    expect(current.revalidationReasons).toEqual(expect.arrayContaining(["source_evidence_not_reviewed", "source_timestamp_missing", "package_version_not_bound", "target_commit_not_bound"]));
    expect(validateCurrentDbDriverSourceEvidenceStalenessRecord(current)).toBe(current);
  });

  it("defines exact expiry windows and invalidation triggers", () => {
    const current = record();

    expect(current.expiryWindows).toEqual(dbDriverSourceEvidenceExpiryWindows);
    expect(current.invalidationTriggers).toEqual(expect.arrayContaining([...dbDriverSourceEvidenceInvalidationTriggers]));
  });

  it("keeps candidate staleness not reviewed for pg and postgres", () => {
    const current = record();

    expect(current.candidateStaleness).toHaveLength(2);
    for (const item of current.candidateStaleness) {
      expect(item.driverName).toBe(item.packageName);
      expect(item.stalenessStatus).toBe("not_reviewed");
      expect(item.sourceCheckedAt).toBeNull();
      expect(item.sourceExpiresAt).toBeNull();
      expect(item.sourceCategory).toBeNull();
      expect(item.packageVersion).toBeNull();
      expect(item.targetCommitSha).toBeNull();
      expect(item.baseCommitSha).toBeNull();
      expect(item.prNumber).toBeNull();
      expect(item.targetBranch).toBeNull();
      expect(item.revalidationRequired).toBe(true);
      expect(item.revalidationReasons).toContain("source_evidence_not_reviewed");
    }
  });

  it("keeps all permission flags false", () => {
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
    ["driverChoiceStatus selected", { driverChoiceStatus: "selected" }],
    ["fresh source evidence", { sourceEvidenceStatus: "fresh" }],
    ["reviewed source binding", { sourceBindingStatus: "reviewed" }],
    ["reviewed timestamp", { sourceTimestampStatus: "reviewed" }],
    ["fresh source freshness", { sourceFreshnessStatus: "fresh" }],
    ["fresh expiry", { sourceExpiryStatus: "fresh" }],
    ["reviewed package name", { packageNameBindingStatus: "reviewed" }],
    ["reviewed package version", { packageVersionBindingStatus: "reviewed" }],
    ["reviewed target commit", { targetCommitBindingStatus: "reviewed" }],
    ["reviewed base commit", { baseCommitBindingStatus: "reviewed" }],
    ["reviewed PR number", { prNumberBindingStatus: "reviewed" }],
    ["reviewed branch", { branchBindingStatus: "reviewed" }],
    ["reviewed source category", { sourceCategoryBindingStatus: "reviewed" }],
    ["knownBlockers empty array", { knownBlockers: [] }],
    ["knownBlockersStatus reviewed", { knownBlockersStatus: "reviewed" }],
    ["revalidation false", { revalidationRequired: false }],
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
  ])("rejects %s in committed staleness evidence", (_label, patch) => {
    expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(record(patch as Partial<DbDriverSourceEvidenceStalenessRecord>))).toThrow();
  });

  it.each([
    ["missing source_evidence_not_reviewed", ["source_timestamp_missing", "package_version_not_bound", "target_commit_not_bound"]],
    ["missing source_timestamp_missing", ["source_evidence_not_reviewed", "package_version_not_bound", "target_commit_not_bound"]],
    ["missing package_version_not_bound", ["source_evidence_not_reviewed", "source_timestamp_missing", "target_commit_not_bound"]],
    ["missing target_commit_not_bound", ["source_evidence_not_reviewed", "source_timestamp_missing", "package_version_not_bound"]]
  ])("rejects missing revalidation reason: %s", (_label, revalidationReasons) => {
    expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(record({ revalidationReasons: revalidationReasons as any }))).toThrow(/revalidation reason/);
  });

  it.each([
    ["fresh candidate", { stalenessStatus: "fresh" }],
    ["candidate checked timestamp", { sourceCheckedAt: "2026-06-10T00:00:00Z" }],
    ["candidate expires timestamp", { sourceExpiresAt: "2026-06-16T00:00:00Z" }],
    ["candidate source category", { sourceCategory: "github_advisory_summary" }],
    ["candidate package version", { packageVersion: "8.16.0" }],
    ["candidate target commit", { targetCommitSha: targetSha }],
    ["candidate base commit", { baseCommitSha: baseSha }],
    ["candidate PR number", { prNumber: 58 }],
    ["candidate target branch", { targetBranch: branchName }],
    ["candidate revalidation false", { revalidationRequired: false }]
  ])("rejects %s in committed candidate staleness", (_label, patch) => {
    expect(() =>
      validateCurrentDbDriverSourceEvidenceStalenessRecord(
        record({ candidateStaleness: [candidate("pg", patch as Partial<DbDriverSourceEvidenceCandidateStaleness>), candidate("postgres")] })
      )
    ).toThrow();
  });

  it("accepts future fresh source fixture only through the future validator", () => {
    const fixture = futureFreshFixture();

    expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(fixture)).toThrow();
    expect(validateFutureFreshDbDriverSourceEvidenceFixture(fixture, fixtureContext)).toBe(fixture);
  });

  it.each([
    ["expired timestamp", { sourceExpiresAt: "2026-06-10T00:00:00Z" }],
    ["future checked timestamp", { sourceCheckedAt: "2026-06-12T00:00:00Z" }],
    ["expiry before checked", { sourceCheckedAt: "2026-06-10T00:00:00Z", sourceExpiresAt: "2026-06-09T00:00:00Z" }],
    ["target commit mismatch", { targetCommitSha: "3333333333333333333333333333333333333333" }],
    ["base commit mismatch", { baseCommitSha: "4444444444444444444444444444444444444444" }],
    ["PR number mismatch", { prNumber: 59 }],
    ["branch mismatch", { targetBranch: "feat/wrong" }],
    ["package version mismatch", { packageVersion: "8.15.0" }],
    ["package version not exact semver", { packageVersion: "latest" }],
    ["source category mismatch", { sourceCategory: "npm_registry_metadata" }]
  ])("future fresh fixture rejects %s", (_label, patch) => {
    expect(() =>
      validateFutureFreshDbDriverSourceEvidenceFixture(futureFreshFixture({}, patch as Partial<DbDriverSourceEvidenceCandidateStaleness>), fixtureContext)
    ).toThrow();
  });

  it.each([
    ["raw npm audit JSON", ["npm audit --", "json"].join("")],
    ["raw GitHub advisory response", "GitHub advisory raw response"],
    ["raw OSV response", "OSV raw response"],
    ["raw npm registry metadata", "npm registry raw metadata"],
    ["raw dependency tree", "raw dependency tree"],
    ["raw terminal output", "stdout stderr"],
    ["raw logs", "raw logs"],
    ["private URL", ["https", "://private.example.invalid/source"].join("")],
    ["DB connection string", ["postgres", "://user:pass@example.invalid/db"].join("")],
    ["wallet address", "0x1234567890abcdef1234567890abcdef12345678"],
    ["token-like value", "ghp_exampletoken"],
    ["GHSA advisory id", "GHSA-xxxx-yyyy-zzzz"],
    ["CVE id", "CVE-2026-1234"]
  ])("rejects unsafe source evidence value: %s", (_label, unsafeValue) => {
    expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(record({ safeSummary: unsafeValue }))).toThrow(/unsafe|safeSummary/);
  });

  it.each(["rawAuditJson", "rawAdvisoryResponse", "rawOsvResponse", "rawNpmRegistryMetadata", "rawDependencyTree", "rawTerminalOutput", "stdout", "stderr", "stackTrace", "logsUrl"])(
    "rejects unsafe raw source evidence key: %s",
    (key) => {
      expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(record({ [key]: "safe-looking" } as Partial<DbDriverSourceEvidenceStalenessRecord>))).toThrow(/unsafe/);
    }
  );

  it.each(["no vulnerabilities", "clean", "ready for dependency", "approved", "pass", "fresh source", "reviewed source", "no blockers"])(
    "rejects unsafe safeSummary claim: %s",
    (summary) => {
      expect(() => validateCurrentDbDriverSourceEvidenceStalenessRecord(record({ safeSummary: summary }))).toThrow(/safeSummary/);
    }
  );

  it("keeps committed .codex staleness evidence policy-ready but not reviewed", () => {
    const current = committedStalenessFromDisk();

    expect(current.stalenessPolicyStatus).toBe("policy_ready");
    expect(current.bindingDryRunStatus).toBe("not_reviewed");
    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.sourceEvidenceStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.revalidationRequired).toBe(true);
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(validateCurrentDbDriverSourceEvidenceStalenessRecord(current)).toBe(current);
  });
});
