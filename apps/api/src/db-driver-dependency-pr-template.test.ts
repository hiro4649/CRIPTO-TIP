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
    selectedDriver: "pg",
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
      addedDependencies: ["pg"],
      removedDependencies: [],
      changedScripts: [],
      dependencySection: "dependencies",
      selectedDriver: "pg",
      packageName: "pg",
      versionSpec: "1.2.3",
      noLifecycleScriptsAdded: true,
      unrelatedDependencyChanges: false,
      safeSummary: "Future dependency PR package diff adds one approved DB driver only."
    },
    lockfileEvidence: {
      pnpmLockChanged: true,
      selectedDriver: "pg",
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
      safeSummary: "License metadata reviewed with no compliance assertion."
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
    ["selected driver", { selectedDriver: "pg" }, /must not select a driver/],
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
    ["unknown selected driver", { selectedDriver: "future-db-driver" }, /selected driver must be pg or postgres/],
    ["unknown future-db-driver dependency", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, addedDependencies: ["future-db-driver"] } }, /selected driver must be pg or postgres/],
    ["package name mismatch", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, packageName: "postgres" } }, /must match approval records/],
    ["added dependency mismatch", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, addedDependencies: ["postgres"] } }, /must match approval records/],
    ["multiple added dependencies", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, addedDependencies: ["pg", "postgres"] } }, /exactly one/],
    ["unrelated dependency", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, addedDependencies: ["@scope/unknown-db-driver"] } }, /selected driver must be pg or postgres/],
    ["dev dependency section", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, dependencySection: "devDependencies" } }, /under dependencies/],
    ["no dependency section", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, dependencySection: "none" } }, /under dependencies/],
    ["latest version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "latest" } }, /exact semver/],
    ["star version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "*" } }, /exact semver/],
    ["caret version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "^1.2.3" } }, /exact semver/],
    ["tilde version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "~1.2.3" } }, /exact semver/],
    ["workspace version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "workspace:*" } }, /exact semver/],
    ["file version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "file:../pg" } }, /exact semver/],
    ["git version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "git+ssh://example.invalid/pg" } }, /unsafe DB driver dependency PR template evidence rejected|exact semver/],
    ["https version spec", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, versionSpec: "https://example.invalid/pg.tgz" } }, /unsafe DB driver dependency PR template evidence rejected|exact semver/],
    ["changed scripts", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, changedScripts: ["postinstall"] } }, /must not change package scripts/],
    ["unrelated package dependency changes", { packageDiffEvidence: { ...futureCompleteFixture().packageDiffEvidence!, unrelatedDependencyChanges: true } }, /unrelated dependency changes/],
    ["unrelated lockfile changes", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, unrelatedDependencyChanges: true } }, /lockfile evidence must not include unrelated/],
    ["negative transitive count", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, transitiveDependencyCount: -1 } }, /0 through 100/],
    ["non-integer transitive count", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, transitiveDependencyCount: 1.5 } }, /0 through 100/],
    ["too large transitive count", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, transitiveDependencyCount: 101 } }, /0 through 100/],
    ["native modules not reviewed", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, nativeModulesReviewed: false } }, /native modules/],
    ["postinstall scripts not reviewed", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, postinstallScriptsReviewed: false } }, /postinstall scripts/],
    ["integrity entries not reviewed", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, integrityEntriesReviewed: false } }, /integrity entries/],
    ["optional dependencies not reviewed", { lockfileEvidence: { ...futureCompleteFixture().lockfileEvidence!, optionalDependenciesReviewed: false } }, /optional dependencies/],
    ["legal compliance claim", { licenseReviewEvidence: { ...futureCompleteFixture().licenseReviewEvidence!, legalComplianceClaim: true } }, /must not claim legal compliance/],
    ["legal compliant summary", { licenseReviewEvidence: { ...futureCompleteFixture().licenseReviewEvidence!, safeSummary: "Package is legal compliant." } }, /safeSummary must not claim/],
    ["legally approved summary", { licenseReviewEvidence: { ...futureCompleteFixture().licenseReviewEvidence!, safeSummary: "Package is legally approved." } }, /safeSummary must not claim/],
    ["approved version range", { versionPinningEvidence: { ...futureCompleteFixture().versionPinningEvidence!, versionPolicy: "approved_range" } }, /exact version policy/],
    ["non-exact approved version", { versionPinningEvidence: { ...futureCompleteFixture().versionPinningEvidence!, approvedVersion: "^1.2.3" } }, /exact semver/],
    ["raw logs in security evidence", { securityAdvisoryEvidence: { ...futureCompleteFixture().securityAdvisoryEvidence!, safeSummary: "raw GitHub logs include advisory output" } }, /unsafe DB driver dependency PR template evidence rejected/],
    ["raw connection string", { secretBoundaryEvidence: { ...futureCompleteFixture().secretBoundaryEvidence!, rawConnectionStringPresent: true } }, /secret boundary evidence/]
  ] as Array<[string, Partial<DbDriverDependencyPrTemplateRecord>, RegExp]>)("rejects future dependency evidence with %s", (_label, patch, expected) => {
    expect(() => validateFutureDbDriverDependencyPrEvidence(futureCompleteFixture(patch))).toThrow(expected);
  });

  it.each([
    ["private URL", "private URL https://example.invalid/provider"],
    ["DB connection string", "postgres://user:pass@db.local:5432/app"],
    ["wallet address", "0x1111111111111111111111111111111111111111"],
    ["token-like value", "Bearer abc.def.ghi"],
    ["raw provider response", "raw provider response: omitted"],
    ["unsafe key apiKey", { apiKey: "safe-looking" }],
    ["unsafe key connectionString", { connectionString: "safe-looking" }],
    ["unsafe key password", { password: "safe-looking" }],
    ["unsafe key clientSecret", { clientSecret: "safe-looking" }],
    ["unsafe key refreshToken", { refreshToken: "safe-looking" }],
    ["unsafe key rawProviderResponse", { rawProviderResponse: "safe-looking" }]
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

  it("accepts postgres as the alternate allowed future DB driver", () => {
    const record = futureCompleteFixture({
      selectedDriver: "postgres",
      packageDiffEvidence: {
        ...futureCompleteFixture().packageDiffEvidence!,
        selectedDriver: "postgres",
        packageName: "postgres",
        addedDependencies: ["postgres"]
      },
      lockfileEvidence: {
        ...futureCompleteFixture().lockfileEvidence!,
        selectedDriver: "postgres"
      }
    });

    expect(validateFutureDbDriverDependencyPrEvidence(record)).toBe(record);
  });

  it.each([
    ["targetCommitSha placeholder", { targetCommitSha: "current_pr_head" }, /40-character SHA/],
    ["baseCommitSha placeholder", { baseCommitSha: "current_pr_base" }, /40-character SHA/],
    ["target equals base", { targetCommitSha: context.baseCommitSha }, /must differ from baseCommitSha/]
  ])("rejects committed evidence with %s", (_label, patch, expected) => {
    expect(() => validateCurrentDbDriverDependencyPrTemplateRecord(template(patch))).toThrow(expected);
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
