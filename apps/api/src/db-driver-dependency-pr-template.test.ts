import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertNoUnsafeDbDriverDependencyTemplateEvidence,
  createDefaultDbDriverDependencyPrTemplateRecord,
  dbDriverDependencyRequiredSections,
  validateCurrentDbDriverDependencyPrTemplateRecord,
  validateFutureDbDriverDependencyPrEvidence,
  type DbDriverDependencyPrTemplateRecord
} from "./db-driver-dependency-pr-template.js";

const context = {
  repository: "hiro4649/CRIPTO-TIP",
  prNumber: 51,
  targetBranch: "feat/db-driver-dependency-pr-template-v117-prep",
  targetCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  baseCommitSha: "0b975a8d2093464f4e1e520742c7eac5a25e9070",
  createdAt: "2026-06-10T00:00:00.000Z",
  harnessVersion: "1.1.6"
};

function template(patch: Partial<DbDriverDependencyPrTemplateRecord> = {}) {
  return {
    ...createDefaultDbDriverDependencyPrTemplateRecord(context),
    ...patch
  } as DbDriverDependencyPrTemplateRecord;
}

function futureCompleteFixture(patch: Partial<DbDriverDependencyPrTemplateRecord> = {}) {
  return template({
    templateStatus: "template_ready",
    selectedDriver: "future-db-driver",
    ownerApprovalRecordStatus: "approved",
    finalApprovalGateStatus: "approved_for_dependency_pr",
    packageDiffEvidenceStatus: "pass",
    lockfileReviewStatus: "pass",
    licenseReviewStatus: "pass",
    supplyChainReviewStatus: "pass",
    securityAdvisoryReviewStatus: "pass",
    versionPinningStatus: "pass",
    secretBoundaryStatus: "pass",
    packageJsonChangeAllowed: true,
    pnpmLockChangeAllowed: true,
    dbDriverDependencyAllowed: true,
    packageDiffEvidence: {
      packageJsonChanged: true,
      pnpmLockChanged: true,
      addedDependencies: ["future-db-driver"],
      removedDependencies: [],
      changedScripts: [],
      dependencySection: "dependencies",
      selectedDriver: "future-db-driver",
      packageName: "future-db-driver",
      versionSpec: "1.2.3",
      noLifecycleScriptsAdded: true,
      unrelatedDependencyChanges: false,
      safeSummary: "Future dependency PR package diff adds one approved DB driver only."
    },
    lockfileEvidence: {
      pnpmLockChanged: true,
      selectedDriver: "future-db-driver",
      transitiveDependencyCount: 3,
      unrelatedDependencyChanges: false,
      integrityEntriesReviewed: true,
      optionalDependenciesReviewed: true,
      nativeModulesReviewed: true,
      postinstallScriptsReviewed: true,
      safeSummary: "Future dependency PR lockfile review is complete."
    },
    licenseReviewEvidence: {
      licenseReviewStatus: "pass",
      licenseName: "MIT",
      licenseSource: "package metadata",
      legalComplianceClaim: false,
      noLegalAdviceClaim: true,
      safeSummary: "License metadata was reviewed without legal advice assertions."
    },
    supplyChainReviewEvidence: {
      maintainerReviewed: true,
      releaseCadenceReviewed: true,
      provenanceReviewed: true,
      transitiveDependenciesReviewed: true,
      installScriptsReviewed: true,
      knownSupplyChainBlockers: [],
      safeSummary: "Supply-chain review found no known blockers."
    },
    securityAdvisoryEvidence: {
      advisoryChecked: true,
      cveChecked: true,
      auditChecked: true,
      knownBlockers: [],
      safeSummary: "Security advisory review found no known blockers."
    },
    versionPinningEvidence: {
      versionPolicy: "exact",
      approvedVersion: "1.2.3",
      noCaretUnlessOwnerApproved: true,
      noTildeUnlessOwnerApproved: true,
      updatePolicy: "Owner approval required for version changes.",
      safeSummary: "Exact version is pinned for the future dependency PR."
    },
    secretBoundaryEvidence: {
      secretManagerScopeDefined: true,
      rawConnectionStringPresent: false,
      envFileChanged: false,
      credentialStorage: "secret_manager",
      rotationPlan: "Use the existing DB secret boundary rotation runbook.",
      safeSummary: "Secret boundary uses secret manager references only."
    },
    safeSummary: "Test-only future dependency PR fixture is complete without authorizing current committed evidence.",
    ...patch
  });
}

function committedTemplateFromDisk() {
  return JSON.parse(readFileSync(".codex/db-driver-dependency-pr-template.json", "utf8")) as DbDriverDependencyPrTemplateRecord;
}

describe("db driver dependency PR template", () => {
  it("creates template_ready evidence without selecting or adding a DB driver", () => {
    const record = template();

    expect(record.templateStatus).toBe("template_ready");
    expect(record.selectedDriver).toBeNull();
    expect(record.ownerApprovalRecordStatus).toBe("not_approved");
    expect(record.finalApprovalGateStatus).toBe("blocked");
    expect(record.packageDiffEvidenceStatus).toBe("missing");
    expect(record.lockfileReviewStatus).toBe("missing");
    expect(record.licenseReviewStatus).toBe("missing");
    expect(record.supplyChainReviewStatus).toBe("missing");
    expect(record.securityAdvisoryReviewStatus).toBe("missing");
    expect(record.versionPinningStatus).toBe("missing");
    expect(record.secretBoundaryStatus).toBe("missing");
    expect(record.packageJsonChangeAllowed).toBe(false);
    expect(record.pnpmLockChangeAllowed).toBe(false);
    expect(record.dbDriverDependencyAllowed).toBe(false);
    expect(record.realDbConnectionAllowed).toBe(false);
    expect(record.actualProductionDeploymentAllowed).toBe(false);
    expect(validateCurrentDbDriverDependencyPrTemplateRecord(record)).toBe(record);
  });

  it("keeps committed machine-readable template evidence safe and unselected", () => {
    const record = committedTemplateFromDisk();

    expect(record.templateStatus).toBe("template_ready");
    expect(record.selectedDriver).toBeNull();
    expect(record.ownerApprovalRecordStatus).toBe("not_approved");
    expect(record.finalApprovalGateStatus).toBe("blocked");
    expect(record.packageDiffEvidenceStatus).toBe("missing");
    expect(record.lockfileReviewStatus).toBe("missing");
    expect(record.packageJsonChangeAllowed).toBe(false);
    expect(record.pnpmLockChangeAllowed).toBe(false);
    expect(record.dbDriverDependencyAllowed).toBe(false);
    expect(validateCurrentDbDriverDependencyPrTemplateRecord(record)).toBe(record);
  });

  it.each([
    ["selected driver", { selectedDriver: "future-db-driver" }, /must not select a driver/],
    ["DB driver dependency allowed", { dbDriverDependencyAllowed: true }, /dbDriverDependencyAllowed must remain false/],
    ["package change allowed", { packageJsonChangeAllowed: true }, /packageJsonChangeAllowed must remain false/],
    ["lockfile change allowed", { pnpmLockChangeAllowed: true }, /pnpmLockChangeAllowed must remain false/],
    ["real DB connection", { realDbConnectionAllowed: true }, /realDbConnectionAllowed must remain false/],
    ["migration execution", { migrationExecutionAllowed: true }, /migrationExecutionAllowed must remain false/],
    ["live DB integration test", { liveDbIntegrationTestAllowed: true }, /liveDbIntegrationTestAllowed must remain false/],
    ["provider SDK apply", { providerSdkApplyAllowed: true }, /providerSdkApplyAllowed must remain false/],
    ["production deployment", { actualProductionDeploymentAllowed: true }, /actualProductionDeploymentAllowed must remain false/],
    ["runtime readiness", { runtimeReadinessClaimAllowed: true }, /runtimeReadinessClaimAllowed must remain false/],
    ["production readiness", { productionReadinessClaimAllowed: true }, /productionReadinessClaimAllowed must remain false/],
    ["legal compliance", { legalComplianceClaimAllowed: true }, /legalComplianceClaimAllowed must remain false/],
    ["YouTube policy compliance", { youtubePolicyComplianceClaimAllowed: true }, /youtubePolicyComplianceClaimAllowed must remain false/]
  ] as const)("rejects current template with %s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverDependencyPrTemplateRecord(template(patch))).toThrow(expected);
  });

  it("requires every future dependency PR section", () => {
    const record = template({
      requiredPrSections: dbDriverDependencyRequiredSections.filter((section) => section !== "Secret Boundary Evidence")
    });

    expect(() => validateCurrentDbDriverDependencyPrTemplateRecord(record)).toThrow(/Secret Boundary Evidence/);
  });

  it.each([
    ["multiple added dependencies", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, addedDependencies: ["future-db-driver", "other-driver"] } }, /exactly one/],
    ["changed scripts", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, changedScripts: ["postinstall"] } }, /must not change package scripts/],
    ["unrelated package dependency changes", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, unrelatedDependencyChanges: true } }, /unrelated dependency changes/],
    ["unrelated lockfile changes", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, unrelatedDependencyChanges: true } }, /lockfile evidence must not include unrelated/],
    ["legal compliance claim", { licenseReviewEvidence: { ...futureCompleteFixture().licenseReviewEvidence!, legalComplianceClaim: true } }, /must not claim legal compliance/],
    ["raw logs in security evidence", { securityAdvisoryEvidence: { ...futureCompleteFixture().securityAdvisoryEvidence!, safeSummary: "raw GitHub logs include advisory output" } }, /unsafe DB driver dependency PR template evidence rejected/],
    ["raw connection string", { secretBoundaryEvidence: { ...futureCompleteFixture().secretBoundaryEvidence!, rawConnectionStringPresent: true } }, /secret boundary evidence/]
  ])("rejects future dependency evidence with %s", (_label, patch, expected) => {
    expect(() => validateFutureDbDriverDependencyPrEvidence(futureCompleteFixture(patch))).toThrow(expected);
  });

  it.each([
    ["private URL", "private URL https://example.invalid/provider"],
    ["DB connection string", "postgres://user:pass@db.local:5432/app"],
    ["wallet address", "0x1111111111111111111111111111111111111111"],
    ["token-like value", "Bearer abc.def.ghi"],
    ["raw provider response", "raw provider response: omitted"],
    ["unsafe key apiKey", { apiKey: "safe-looking" }],
    ["unsafe key connectionString", { connectionString: "safe-looking" }]
  ] as const)("rejects unsafe %s evidence", (_label, unsafe) => {
    if (typeof unsafe === "string") {
      expect(() => assertNoUnsafeDbDriverDependencyTemplateEvidence({ safeSummary: unsafe })).toThrow(/unsafe DB driver dependency PR template evidence rejected/);
      return;
    }
    expect(() => assertNoUnsafeDbDriverDependencyTemplateEvidence(unsafe)).toThrow(/unsafe DB driver dependency PR template evidence rejected/);
  });

  it("accepts a complete future dependency PR fixture only in tests", () => {
    const record = futureCompleteFixture();

    expect(validateFutureDbDriverDependencyPrEvidence(record)).toBe(record);
    expect(() => validateCurrentDbDriverDependencyPrTemplateRecord(record)).toThrow(/must not select a driver/);
  });

  it("does not commit the future complete fixture as machine-readable evidence", () => {
    const committed = committedTemplateFromDisk();
    const future = futureCompleteFixture();

    expect(committed).not.toEqual(future);
    expect(committed.selectedDriver).toBeNull();
    expect(committed.packageJsonChangeAllowed).toBe(false);
    expect(committed.pnpmLockChangeAllowed).toBe(false);
    expect(committed.dbDriverDependencyAllowed).toBe(false);
    expect(committed.packageDiffEvidence).toBeUndefined();
    expect(committed.lockfileEvidence).toBeUndefined();
  });
});
