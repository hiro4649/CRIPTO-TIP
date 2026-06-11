import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDefaultDbDriverAdvisoryBindingDryRunRecord,
  validateCurrentDbDriverAdvisoryBindingDryRunRecord,
  validateFutureReviewedDbDriverAdvisoryBindingFixture,
  type DbDriverAdvisoryBindingDryRunRecord,
  type DbDriverAdvisoryCandidateBinding,
  type DbDriverAdvisoryBindingDryRunValidationContext
} from "./db-driver-advisory-binding-dry-run.js";

const branchName = "feat/db-driver-advisory-binding-dry-run-v118-prep";
const baseSha = "92c15bb1041ea716354a9bf4e4d78038583d9fc6";
const targetSha = "92c15bb1041ea716354a9bf4e4d78038583d9fc6";
const futureTargetSha = "1111111111111111111111111111111111111111";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 0,
  targetBranch: branchName,
  targetCommitSha: targetSha,
  baseCommitSha: baseSha,
  createdAt: "2026-06-11T00:00:00Z",
  harnessVersion: "1.1.7"
};

const fixtureContext: DbDriverAdvisoryBindingDryRunValidationContext = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 57,
  targetBranch: branchName,
  targetCommitSha: futureTargetSha,
  packageName: "pg",
  packageVersion: "8.16.0",
  sourceCategory: "github_advisory_summary",
  freshnessWindowDays: 30,
  now: "2026-06-11T00:00:00Z"
};

function record(patch: Partial<DbDriverAdvisoryBindingDryRunRecord> = {}) {
  return {
    ...createDefaultDbDriverAdvisoryBindingDryRunRecord(context),
    ...patch
  } as DbDriverAdvisoryBindingDryRunRecord;
}

function candidateBinding(driverName: "pg" | "postgres", patch: Partial<DbDriverAdvisoryCandidateBinding> = {}) {
  const candidate = createDefaultDbDriverAdvisoryBindingDryRunRecord(context).candidateBindings.find(
    (entry) => entry.driverName === driverName
  );
  if (!candidate) throw new Error(`missing default ${driverName} binding`);
  return {
    ...candidate,
    ...patch
  } as DbDriverAdvisoryCandidateBinding;
}

function validFutureFixture(patch: Partial<DbDriverAdvisoryBindingDryRunRecord> = {}, bindingPatch: Partial<DbDriverAdvisoryCandidateBinding> = {}) {
  return record({
    prNumber: fixtureContext.prNumber,
    targetBranch: fixtureContext.targetBranch,
    targetCommitSha: fixtureContext.targetCommitSha,
    bindingDryRunStatus: "pass",
    sourcePolicyStatus: "reviewed",
    advisoryEnvelopeStatus: "reviewed",
    sourceCategoryStatus: "reviewed",
    sourceBindingStatus: "reviewed",
    sourceTimestampStatus: "reviewed",
    sourceFreshnessStatus: "fresh",
    packageNameBindingStatus: "reviewed",
    packageVersionBindingStatus: "reviewed",
    targetCommitBindingStatus: "reviewed",
    prNumberBindingStatus: "reviewed",
    branchBindingStatus: "reviewed",
    safeSummaryBindingStatus: "reviewed",
    knownBlockersStatus: "reviewed",
    knownBlockers: [],
    candidateBindings: [
      candidateBinding("pg", {
        bindingStatus: "pass",
        sourceCategory: fixtureContext.sourceCategory,
        sourceName: "future safe advisory source summary",
        sourceCheckedAt: "2026-06-10T00:00:00Z",
        sourceExpiresAt: "2026-06-20T00:00:00Z",
        targetCommitSha: fixtureContext.targetCommitSha,
        prNumber: fixtureContext.prNumber,
        targetBranch: fixtureContext.targetBranch,
        packageVersion: fixtureContext.packageVersion,
        knownBlockersStatus: "reviewed",
        knownBlockers: [],
        refreshRequired: false,
        safeSummary: "pg future binding fixture uses bounded safe summary only.",
        ...bindingPatch
      }),
      candidateBinding("postgres")
    ],
    ...patch
  });
}

function committedBindingFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-advisory-binding-dry-run.json", "utf8")) as DbDriverAdvisoryBindingDryRunRecord;
}

describe("db driver advisory binding dry run", () => {
  it("creates not-reviewed binding dry-run evidence without selecting a driver", () => {
    const current = record();

    expect(current.bindingDryRunStatus).toBe("not_reviewed");
    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.sourceCategoryStatus).toBe("not_reviewed");
    expect(current.sourceBindingStatus).toBe("not_reviewed");
    expect(current.sourceTimestampStatus).toBe("not_reviewed");
    expect(current.sourceFreshnessStatus).toBe("not_reviewed");
    expect(current.packageNameBindingStatus).toBe("not_reviewed");
    expect(current.packageVersionBindingStatus).toBe("not_reviewed");
    expect(current.targetCommitBindingStatus).toBe("not_reviewed");
    expect(current.prNumberBindingStatus).toBe("not_reviewed");
    expect(current.branchBindingStatus).toBe("not_reviewed");
    expect(current.safeSummaryBindingStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(validateCurrentDbDriverAdvisoryBindingDryRunRecord(current)).toBe(current);
  });

  it("keeps pg and postgres candidate bindings not reviewed", () => {
    const current = record();

    expect(current.candidateBindings).toHaveLength(2);
    for (const candidate of current.candidateBindings) {
      expect(candidate.driverName).toBe(candidate.packageName);
      expect(candidate.bindingStatus).toBe("not_reviewed");
      expect(candidate.sourceCategory).toBeNull();
      expect(candidate.sourceName).toBeNull();
      expect(candidate.sourceCheckedAt).toBeNull();
      expect(candidate.sourceExpiresAt).toBeNull();
      expect(candidate.targetCommitSha).toBeNull();
      expect(candidate.prNumber).toBeNull();
      expect(candidate.targetBranch).toBeNull();
      expect(candidate.packageVersion).toBeNull();
      expect(candidate.rawOutputPolicyStatus).toBe("raw_output_forbidden");
      expect(candidate.knownBlockersStatus).toBe("not_reviewed");
      expect(candidate.knownBlockers).toBeNull();
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
    ["pass binding status", { bindingDryRunStatus: "pass" }],
    ["source policy pass", { sourcePolicyStatus: "pass" }],
    ["advisory envelope pass", { advisoryEnvelopeStatus: "pass" }],
    ["source category reviewed", { sourceCategoryStatus: "reviewed" }],
    ["source binding reviewed", { sourceBindingStatus: "reviewed" }],
    ["source timestamp reviewed", { sourceTimestampStatus: "reviewed" }],
    ["source freshness fresh", { sourceFreshnessStatus: "fresh" }],
    ["package name reviewed", { packageNameBindingStatus: "reviewed" }],
    ["package version reviewed", { packageVersionBindingStatus: "reviewed" }],
    ["target commit reviewed", { targetCommitBindingStatus: "reviewed" }],
    ["PR number reviewed", { prNumberBindingStatus: "reviewed" }],
    ["branch reviewed", { branchBindingStatus: "reviewed" }],
    ["safe summary reviewed", { safeSummaryBindingStatus: "reviewed" }],
    ["known blockers empty array", { knownBlockers: [] }],
    ["known blockers reviewed", { knownBlockersStatus: "reviewed" }],
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
  ])("rejects %s in committed dry-run evidence", (_label, patch) => {
    expect(() => validateCurrentDbDriverAdvisoryBindingDryRunRecord(record(patch as Partial<DbDriverAdvisoryBindingDryRunRecord>))).toThrow();
  });

  it.each([
    ["candidate pass", { bindingStatus: "pass" }],
    ["candidate source category", { sourceCategory: "github_advisory_summary" }],
    ["candidate source name", { sourceName: "safe source" }],
    ["candidate checked timestamp", { sourceCheckedAt: "2026-06-10T00:00:00Z" }],
    ["candidate expiry timestamp", { sourceExpiresAt: "2026-06-20T00:00:00Z" }],
    ["candidate package version", { packageVersion: "8.16.0" }],
    ["candidate target commit", { targetCommitSha: futureTargetSha }],
    ["candidate PR number", { prNumber: 57 }],
    ["candidate target branch", { targetBranch: branchName }],
    ["candidate knownBlockers empty array", { knownBlockers: [] }],
    ["candidate known blockers reviewed", { knownBlockersStatus: "reviewed" }],
    ["candidate refreshRequired false", { refreshRequired: false }]
  ])("rejects %s in committed candidate binding evidence", (_label, patch) => {
    expect(() =>
      validateCurrentDbDriverAdvisoryBindingDryRunRecord(
        record({ candidateBindings: [candidateBinding("pg", patch as Partial<DbDriverAdvisoryCandidateBinding>), candidateBinding("postgres")] })
      )
    ).toThrow();
  });

  it.each([
    ["raw npm audit JSON", ["npm audit --", "json"].join("")],
    ["raw GitHub advisory response", "GitHub advisory raw response"],
    ["raw OSV response", "OSV raw response"],
    ["raw Snyk response", "Snyk raw response"],
    ["raw npm registry metadata", "npm registry raw metadata"],
    ["raw dependency tree", "raw dependency tree"],
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
  ])("rejects unsafe binding evidence value: %s", (_label, unsafeValue) => {
    expect(() => validateCurrentDbDriverAdvisoryBindingDryRunRecord(record({ safeSummary: unsafeValue }))).toThrow(/unsafe|safeSummary/);
  });

  it.each([
    "rawAuditJson",
    "rawAuditOutput",
    "rawAdvisoryJson",
    "rawAdvisoryResponse",
    "rawOsvResponse",
    "rawNpmRegistryMetadata",
    "rawDependencyTree",
    "rawTerminalOutput",
    "stdout",
    "stderr",
    "stackTrace",
    "logsUrl",
    "jobsUrl",
    "advisoryApiResponse",
    "npmAuditJson",
    "githubAdvisoryResponse",
    "osvRawResponse",
    "snykRawResponse",
    "npmRegistryRawMetadata"
  ])("rejects unsafe raw binding key: %s", (key) => {
    expect(() => validateCurrentDbDriverAdvisoryBindingDryRunRecord(record({ [key]: "safe-looking" } as Partial<DbDriverAdvisoryBindingDryRunRecord>))).toThrow(/unsafe/);
  });

  it.each(["clean", "no vulnerabilities", "safe to install", "approved", "pass", "recommended", "winner", "best choice", "selected"])(
    "rejects unsafe safeSummary claim: %s",
    (summary) => {
      expect(() => validateCurrentDbDriverAdvisoryBindingDryRunRecord(record({ safeSummary: summary }))).toThrow(/safeSummary/);
    }
  );

  it("accepts a valid future reviewed binding fixture only through the future validator", () => {
    const fixture = validFutureFixture();

    expect(() => validateCurrentDbDriverAdvisoryBindingDryRunRecord(fixture)).toThrow();
    expect(validateFutureReviewedDbDriverAdvisoryBindingFixture(fixture, fixtureContext)).toBe(fixture);
  });

  it.each([
    ["future timestamp", {}, { sourceCheckedAt: "2026-07-01T00:00:00Z" }],
    ["expired timestamp", {}, { sourceExpiresAt: "2026-06-10T00:00:00Z" }],
    ["expiry before checked", {}, { sourceCheckedAt: "2026-06-10T00:00:00Z", sourceExpiresAt: "2026-06-09T00:00:00Z" }],
    ["expiry beyond window", {}, { sourceExpiresAt: "2026-08-01T00:00:00Z" }],
    ["target commit mismatch", {}, { targetCommitSha: "2222222222222222222222222222222222222222" }],
    ["PR number mismatch", {}, { prNumber: 58 }],
    ["branch mismatch", {}, { targetBranch: "feat/wrong" }],
    ["package name mismatch", {}, { packageName: "postgres" }],
    ["package version not exact semver", {}, { packageVersion: "latest" }],
    ["forbidden source category", {}, { sourceCategory: "osv_raw_response" }]
  ])("future binding fixture rejects %s", (_label, recordPatch, bindingPatch) => {
    expect(() =>
      validateFutureReviewedDbDriverAdvisoryBindingFixture(
        validFutureFixture(recordPatch as Partial<DbDriverAdvisoryBindingDryRunRecord>, bindingPatch as Partial<DbDriverAdvisoryCandidateBinding>),
        fixtureContext
      )
    ).toThrow();
  });

  it("keeps committed .codex binding dry-run evidence not reviewed", () => {
    const current = committedBindingFromDisk();

    expect(current.bindingDryRunStatus).toBe("not_reviewed");
    expect(current.sourcePolicyStatus).toBe("not_reviewed");
    expect(current.advisoryEnvelopeStatus).toBe("not_reviewed");
    expect(current.driverChoiceStatus).toBe("not_selected");
    expect(current.selectedDriver).toBeNull();
    expect(current.candidateDrivers).toEqual(["pg", "postgres"]);
    expect(current.sourceCategoryStatus).toBe("not_reviewed");
    expect(current.sourceBindingStatus).toBe("not_reviewed");
    expect(current.sourceTimestampStatus).toBe("not_reviewed");
    expect(current.sourceFreshnessStatus).toBe("not_reviewed");
    expect(current.packageNameBindingStatus).toBe("not_reviewed");
    expect(current.packageVersionBindingStatus).toBe("not_reviewed");
    expect(current.targetCommitBindingStatus).toBe("not_reviewed");
    expect(current.prNumberBindingStatus).toBe("not_reviewed");
    expect(current.branchBindingStatus).toBe("not_reviewed");
    expect(current.safeSummaryBindingStatus).toBe("not_reviewed");
    expect(current.knownBlockersStatus).toBe("not_reviewed");
    expect(current.knownBlockers).toBeNull();
    expect(current.packageJsonChangeAllowed).toBe(false);
    expect(current.pnpmLockChangeAllowed).toBe(false);
    expect(current.dbDriverDependencyAllowed).toBe(false);
    expect(current.realDbConnectionAllowed).toBe(false);
    expect(validateCurrentDbDriverAdvisoryBindingDryRunRecord(current)).toBe(current);
  });
});
