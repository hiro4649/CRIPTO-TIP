export const dbDriverDependencyRequiredSections = [
  "Task Contract",
  "Owner Approval Record",
  "Final Approval Gate",
  "Selected Driver",
  "Package Diff Evidence",
  "Lockfile Review Evidence",
  "License Review Evidence",
  "Supply-Chain Review Evidence",
  "Security Advisory Evidence",
  "Version Pinning Evidence",
  "Secret Boundary Evidence",
  "Testing and review",
  "Test Coverage Evidence",
  "Review Independence",
  "Best of N Evidence",
  "Security Boundaries",
  "Residual risks",
  "Human Confirmation",
  "Production Go/No-Go"
] as const;

export type DbDriverDependencyPrTemplateStatus = "template_ready" | "blocked" | "invalid";
export type DbDriverDependencyReviewStatus = "missing" | "pass" | "fail";
export const allowedFutureDbDrivers = ["pg", "postgres"] as const;

type AllowedFutureDbDriver = (typeof allowedFutureDbDrivers)[number];

export type DbDriverDependencyPrTemplateContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverPackageDiffEvidence = {
  packageJsonChanged: boolean;
  pnpmLockChanged: boolean;
  addedDependencies: string[];
  removedDependencies: string[];
  changedScripts: string[];
  dependencySection: "dependencies" | "devDependencies" | "none";
  selectedDriver: string | null;
  packageName: string | null;
  versionSpec: string | null;
  noLifecycleScriptsAdded: boolean;
  unrelatedDependencyChanges: boolean;
  safeSummary: string;
};

export type DbDriverLockfileEvidence = {
  pnpmLockChanged: boolean;
  selectedDriver: string | null;
  transitiveDependencyCount: number;
  unrelatedDependencyChanges: boolean;
  integrityEntriesReviewed: boolean;
  optionalDependenciesReviewed: boolean;
  nativeModulesReviewed: boolean;
  postinstallScriptsReviewed: boolean;
  safeSummary: string;
};

export type DbDriverLicenseReviewEvidence = {
  licenseReviewStatus: DbDriverDependencyReviewStatus;
  licenseName: string | null;
  licenseSource: string | null;
  legalComplianceClaim: boolean;
  noLegalAdviceClaim: boolean;
  safeSummary: string;
};

export type DbDriverSupplyChainReviewEvidence = {
  maintainerReviewed: boolean;
  releaseCadenceReviewed: boolean;
  provenanceReviewed: boolean;
  transitiveDependenciesReviewed: boolean;
  installScriptsReviewed: boolean;
  knownSupplyChainBlockers: string[];
  safeSummary: string;
};

export type DbDriverSecurityAdvisoryEvidence = {
  advisoryChecked: boolean;
  cveChecked: boolean;
  auditChecked: boolean;
  knownBlockers: string[];
  safeSummary: string;
};

export type DbDriverVersionPinningEvidence = {
  versionPolicy: "exact" | "approved_range";
  approvedVersion: string | null;
  noCaretUnlessOwnerApproved: boolean;
  noTildeUnlessOwnerApproved: boolean;
  updatePolicy: string | null;
  safeSummary: string;
};

export type DbDriverSecretBoundaryEvidence = {
  secretManagerScopeDefined: boolean;
  rawConnectionStringPresent: boolean;
  envFileChanged: boolean;
  credentialStorage: "secret_manager" | "not_applicable";
  rotationPlan: string | null;
  safeSummary: string;
};

export type DbDriverDependencyPrTemplateRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  templateStatus: DbDriverDependencyPrTemplateStatus;
  selectedDriver: string | null;
  ownerApprovalRecordRequired: boolean;
  ownerApprovalRecordStatus: "not_approved" | "approved";
  finalApprovalGateRequired: boolean;
  finalApprovalGateStatus: "blocked" | "approved_for_dependency_pr";
  packageDiffEvidenceRequired: boolean;
  packageDiffEvidenceStatus: DbDriverDependencyReviewStatus;
  lockfileReviewRequired: boolean;
  lockfileReviewStatus: DbDriverDependencyReviewStatus;
  licenseReviewRequired: boolean;
  licenseReviewStatus: DbDriverDependencyReviewStatus;
  supplyChainReviewRequired: boolean;
  supplyChainReviewStatus: DbDriverDependencyReviewStatus;
  securityAdvisoryReviewRequired: boolean;
  securityAdvisoryReviewStatus: DbDriverDependencyReviewStatus;
  versionPinningRequired: boolean;
  versionPinningStatus: DbDriverDependencyReviewStatus;
  secretBoundaryRequired: boolean;
  secretBoundaryStatus: DbDriverDependencyReviewStatus;
  packageJsonChangeAllowed: boolean;
  pnpmLockChangeAllowed: boolean;
  dbDriverDependencyAllowed: boolean;
  realDbConnectionAllowed: boolean;
  migrationExecutionAllowed: boolean;
  liveDbIntegrationTestAllowed: boolean;
  providerSdkApplyAllowed: boolean;
  actualProductionDeploymentAllowed: boolean;
  runtimeReadinessClaimAllowed: boolean;
  productionReadinessClaimAllowed: boolean;
  legalComplianceClaimAllowed: boolean;
  youtubePolicyComplianceClaimAllowed: boolean;
  requiredPrSections: string[];
  forbiddenScopeStatus: "pass" | "fail";
  safeSummary: string;
  createdAt: string;
  packageDiffEvidence?: DbDriverPackageDiffEvidence | undefined;
  lockfileEvidence?: DbDriverLockfileEvidence | undefined;
  licenseReviewEvidence?: DbDriverLicenseReviewEvidence | undefined;
  supplyChainReviewEvidence?: DbDriverSupplyChainReviewEvidence | undefined;
  securityAdvisoryEvidence?: DbDriverSecurityAdvisoryEvidence | undefined;
  versionPinningEvidence?: DbDriverVersionPinningEvidence | undefined;
  secretBoundaryEvidence?: DbDriverSecretBoundaryEvidence | undefined;
};

export function createDefaultDbDriverDependencyPrTemplateRecord(
  context: DbDriverDependencyPrTemplateContext
): DbDriverDependencyPrTemplateRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.6",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    templateStatus: "template_ready",
    selectedDriver: null,
    ownerApprovalRecordRequired: true,
    ownerApprovalRecordStatus: "not_approved",
    finalApprovalGateRequired: true,
    finalApprovalGateStatus: "blocked",
    packageDiffEvidenceRequired: true,
    packageDiffEvidenceStatus: "missing",
    lockfileReviewRequired: true,
    lockfileReviewStatus: "missing",
    licenseReviewRequired: true,
    licenseReviewStatus: "missing",
    supplyChainReviewRequired: true,
    supplyChainReviewStatus: "missing",
    securityAdvisoryReviewRequired: true,
    securityAdvisoryReviewStatus: "missing",
    versionPinningRequired: true,
    versionPinningStatus: "missing",
    secretBoundaryRequired: true,
    secretBoundaryStatus: "missing",
    packageJsonChangeAllowed: false,
    pnpmLockChangeAllowed: false,
    dbDriverDependencyAllowed: false,
    realDbConnectionAllowed: false,
    migrationExecutionAllowed: false,
    liveDbIntegrationTestAllowed: false,
    providerSdkApplyAllowed: false,
    actualProductionDeploymentAllowed: false,
    runtimeReadinessClaimAllowed: false,
    productionReadinessClaimAllowed: false,
    legalComplianceClaimAllowed: false,
    youtubePolicyComplianceClaimAllowed: false,
    requiredPrSections: [...dbDriverDependencyRequiredSections],
    forbiddenScopeStatus: "pass",
    safeSummary: "DB driver dependency PR template is ready. No driver is selected, no dependency is added, no package or lockfile change is authorized, and no runtime readiness is claimed.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverDependencyPrTemplateRecord(record: DbDriverDependencyPrTemplateRecord) {
  assertNoUnsafeDbDriverDependencyTemplateEvidence(record);
  assertBasicTemplateRecord(record);
  if (record.templateStatus !== "template_ready") throw new Error("current DB driver dependency template must be template_ready");
  if (record.selectedDriver !== null) throw new Error("current DB driver dependency template must not select a driver");
  if (record.ownerApprovalRecordStatus !== "not_approved") throw new Error("current DB driver dependency template owner approval must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("current DB driver dependency template final gate must remain blocked");
  assertMissingCurrentReviews(record);
  assertCurrentFlagsFalse(record);
  assertRequiredSections(record.requiredPrSections);
  if (record.forbiddenScopeStatus !== "pass") throw new Error("current DB driver dependency template forbiddenScopeStatus must pass");
  if (record.packageDiffEvidence || record.lockfileEvidence) throw new Error("current DB driver dependency template must not include package or lockfile evidence");
  return record;
}

export function validateFutureDbDriverDependencyPrEvidence(record: DbDriverDependencyPrTemplateRecord) {
  assertNoUnsafeDbDriverDependencyTemplateEvidence(record);
  assertBasicTemplateRecord(record);
  assertRequiredSections(record.requiredPrSections);
  if (!record.selectedDriver) throw new Error("future DB driver dependency evidence requires selectedDriver");
  assertAllowedFutureDbDriver(record.selectedDriver);
  if (record.ownerApprovalRecordStatus !== "approved") throw new Error("future DB driver dependency evidence requires owner approval");
  if (record.finalApprovalGateStatus !== "approved_for_dependency_pr") throw new Error("future DB driver dependency evidence requires approved final gate");
  if (!record.packageJsonChangeAllowed || !record.pnpmLockChangeAllowed || !record.dbDriverDependencyAllowed) {
    throw new Error("future DB driver dependency evidence requires explicit package, lockfile, and dependency approval");
  }
  assertForbiddenFutureFlagsFalse(record);
  assertPackageDiffEvidence(record.packageDiffEvidence, record.selectedDriver);
  assertLockfileEvidence(record.lockfileEvidence, record.selectedDriver);
  assertLicenseReviewEvidence(record.licenseReviewEvidence);
  assertSupplyChainReviewEvidence(record.supplyChainReviewEvidence);
  assertSecurityAdvisoryEvidence(record.securityAdvisoryEvidence);
  assertVersionPinningEvidence(record.versionPinningEvidence);
  assertSecretBoundaryEvidence(record.secretBoundaryEvidence);
  return record;
}

export function assertNoUnsafeDbDriverDependencyTemplateEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function assertBasicTemplateRecord(record: DbDriverDependencyPrTemplateRecord) {
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver dependency template repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("DB driver dependency template prNumber is required");
  if (!record.targetBranch) throw new Error("DB driver dependency template targetBranch is required");
  if (!isSha(record.targetCommitSha)) throw new Error("DB driver dependency template targetCommitSha must be a 40-character SHA");
  if (!isSha(record.baseCommitSha)) throw new Error("DB driver dependency template baseCommitSha must be a 40-character SHA");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("DB driver dependency template targetCommitSha must differ from baseCommitSha");
  if (!record.createdAt.endsWith("Z")) throw new Error("DB driver dependency template createdAt must be UTC");
}

function isSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function assertMissingCurrentReviews(record: DbDriverDependencyPrTemplateRecord) {
  const missingKeys: Array<keyof DbDriverDependencyPrTemplateRecord> = [
    "packageDiffEvidenceStatus",
    "lockfileReviewStatus",
    "licenseReviewStatus",
    "supplyChainReviewStatus",
    "securityAdvisoryReviewStatus",
    "versionPinningStatus",
    "secretBoundaryStatus"
  ];
  for (const key of missingKeys) {
    if (record[key] !== "missing") throw new Error(`current DB driver dependency template ${String(key)} must remain missing`);
  }
}

function assertCurrentFlagsFalse(record: DbDriverDependencyPrTemplateRecord) {
  const falseKeys: Array<keyof DbDriverDependencyPrTemplateRecord> = [
    "packageJsonChangeAllowed",
    "pnpmLockChangeAllowed",
    "dbDriverDependencyAllowed",
    "realDbConnectionAllowed",
    "migrationExecutionAllowed",
    "liveDbIntegrationTestAllowed",
    "providerSdkApplyAllowed",
    "actualProductionDeploymentAllowed",
    "runtimeReadinessClaimAllowed",
    "productionReadinessClaimAllowed",
    "legalComplianceClaimAllowed",
    "youtubePolicyComplianceClaimAllowed"
  ];
  for (const key of falseKeys) {
    if (record[key] !== false) throw new Error(`current DB driver dependency template ${String(key)} must remain false`);
  }
}

function assertForbiddenFutureFlagsFalse(record: DbDriverDependencyPrTemplateRecord) {
  const falseKeys: Array<keyof DbDriverDependencyPrTemplateRecord> = [
    "realDbConnectionAllowed",
    "migrationExecutionAllowed",
    "liveDbIntegrationTestAllowed",
    "providerSdkApplyAllowed",
    "actualProductionDeploymentAllowed",
    "runtimeReadinessClaimAllowed",
    "productionReadinessClaimAllowed",
    "legalComplianceClaimAllowed",
    "youtubePolicyComplianceClaimAllowed"
  ];
  for (const key of falseKeys) {
    if (record[key] !== false) throw new Error(`future DB driver dependency evidence ${String(key)} must remain false`);
  }
}

function assertRequiredSections(sections: string[]) {
  const present = new Set(sections);
  for (const section of dbDriverDependencyRequiredSections) {
    if (!present.has(section)) throw new Error(`DB driver dependency PR template requires section ${section}`);
  }
}

function assertPackageDiffEvidence(evidence: DbDriverPackageDiffEvidence | undefined, selectedDriver: string) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires package diff evidence");
  assertAllowedFutureDbDriver(selectedDriver);
  if (!evidence.packageJsonChanged || !evidence.pnpmLockChanged) throw new Error("package diff evidence requires package and lockfile changes in the future dependency PR");
  if (evidence.addedDependencies.length !== 1) throw new Error("package diff evidence must add exactly one approved DB driver dependency");
  const addedDependency = evidence.addedDependencies[0];
  if (!addedDependency) throw new Error("package diff evidence must add exactly one approved DB driver dependency");
  assertAllowedFutureDbDriver(addedDependency);
  if (evidence.dependencySection !== "dependencies") throw new Error("package diff evidence must add the DB driver under dependencies");
  if (addedDependency !== selectedDriver || evidence.packageName !== selectedDriver || evidence.selectedDriver !== selectedDriver) {
    throw new Error("package diff evidence selected driver must match approval records");
  }
  assertAllowedFutureDbDriver(evidence.packageName);
  assertAllowedFutureDbDriver(evidence.selectedDriver);
  if (evidence.removedDependencies.length > 0) throw new Error("package diff evidence must not remove dependencies without a separate justification");
  if (evidence.changedScripts.length > 0) throw new Error("package diff evidence must not change package scripts");
  if (evidence.unrelatedDependencyChanges) throw new Error("package diff evidence must not include unrelated dependency changes");
  if (!evidence.noLifecycleScriptsAdded) throw new Error("package diff evidence must confirm no lifecycle scripts were added");
  if (!evidence.versionSpec) throw new Error("package diff evidence requires a version spec");
  assertExactSemver(evidence.versionSpec, "package diff evidence versionSpec");
}

function assertLockfileEvidence(evidence: DbDriverLockfileEvidence | undefined, selectedDriver: string) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires lockfile evidence");
  if (!evidence.pnpmLockChanged || evidence.selectedDriver !== selectedDriver) throw new Error("lockfile evidence must bind to the selected driver");
  if (!Number.isInteger(evidence.transitiveDependencyCount) || evidence.transitiveDependencyCount < 0 || evidence.transitiveDependencyCount > 100) {
    throw new Error("lockfile evidence transitive dependency count must be an integer from 0 through 100");
  }
  if (evidence.unrelatedDependencyChanges) throw new Error("lockfile evidence must not include unrelated dependency changes");
  if (!evidence.integrityEntriesReviewed) throw new Error("lockfile evidence must review integrity entries");
  if (!evidence.optionalDependenciesReviewed) throw new Error("lockfile evidence must review optional dependencies");
  if (!evidence.nativeModulesReviewed) throw new Error("lockfile evidence must review native modules");
  if (!evidence.postinstallScriptsReviewed) throw new Error("lockfile evidence must review postinstall scripts");
}

function assertLicenseReviewEvidence(evidence: DbDriverLicenseReviewEvidence | undefined) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires license review evidence");
  if (evidence.licenseReviewStatus !== "pass") throw new Error("license review evidence must pass");
  if (!evidence.licenseName || !evidence.licenseSource) throw new Error("license review evidence requires license name and source");
  if (evidence.legalComplianceClaim || !evidence.noLegalAdviceClaim) throw new Error("license review evidence must not claim legal compliance or legal advice");
  if (/\blegal(?:ly)?\s+(?:compliant|approved)\b|\blegal\s+compliance\b|\blegal\s+advice\b/i.test(evidence.safeSummary)) {
    throw new Error("license review evidence safeSummary must not claim legal compliance or legal advice");
  }
}

function assertSupplyChainReviewEvidence(evidence: DbDriverSupplyChainReviewEvidence | undefined) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires supply-chain review evidence");
  if (!evidence.maintainerReviewed || !evidence.releaseCadenceReviewed || !evidence.provenanceReviewed || !evidence.transitiveDependenciesReviewed || !evidence.installScriptsReviewed) {
    throw new Error("supply-chain review evidence must cover maintainers, cadence, provenance, transitive dependencies, and install scripts");
  }
  if (evidence.knownSupplyChainBlockers.length > 0) throw new Error("supply-chain review evidence must have no known blockers");
}

function assertSecurityAdvisoryEvidence(evidence: DbDriverSecurityAdvisoryEvidence | undefined) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires security advisory evidence");
  if (!evidence.advisoryChecked || !evidence.cveChecked || !evidence.auditChecked) throw new Error("security advisory evidence must check advisories, CVEs, and audit output");
  if (evidence.knownBlockers.length > 0) throw new Error("security advisory evidence must have no known blockers");
}

function assertVersionPinningEvidence(evidence: DbDriverVersionPinningEvidence | undefined) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires version pinning evidence");
  if (!evidence.approvedVersion || !evidence.updatePolicy) throw new Error("version pinning evidence requires approved version and update policy");
  if (evidence.versionPolicy !== "exact") throw new Error("version pinning evidence requires exact version policy");
  assertExactSemver(evidence.approvedVersion, "version pinning evidence approvedVersion");
  if (!evidence.noCaretUnlessOwnerApproved || !evidence.noTildeUnlessOwnerApproved) throw new Error("version pinning evidence must reject caret and tilde ranges unless owner approved");
}

function assertSecretBoundaryEvidence(evidence: DbDriverSecretBoundaryEvidence | undefined) {
  if (!evidence) throw new Error("future DB driver dependency evidence requires secret boundary evidence");
  if (!evidence.secretManagerScopeDefined || evidence.rawConnectionStringPresent || evidence.envFileChanged || evidence.credentialStorage !== "secret_manager" || !evidence.rotationPlan) {
    throw new Error("secret boundary evidence must use secret manager references without raw connection strings or env file changes");
  }
}

function scanUnsafeEvidence(value: unknown, path = "evidence") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    assertSafeString(value, path);
    return;
  }
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeEvidence(item, `${path}[${index}]`));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    assertSafeString(key, `${path}.key`);
    scanUnsafeEvidence(item, `${path}.${key}`);
  }
}

function assertSafeString(value: string, path: string) {
  const unsafePatterns = [
    /postgres(?:ql)?:\/\//i,
    /(?:^|[^a-z])0x[0-9a-f]{40}(?:$|[^a-z])/i,
    /ghp_[a-z0-9_]+/i,
    /sk-[a-z0-9_-]+/i,
    /xoxb-[a-z0-9_-]+/i,
    /AKIA[0-9A-Z]{16}/,
    /Bearer\s+[a-z0-9._-]+/i,
    /https?:\/\//i,
    /private[_ -]?url/i,
    /raw\s+github\s+logs?/i,
    /raw\s+provider\s+response/i,
    /stdout|stderr|stack_trace/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i,
    /oauth\s*token/i,
    /legal\s+compliance\s+claim/i,
    /youtube\s+policy\s+compliance\s+claim/i
  ];
  const unsafeKeyPatterns = [
    /^password$/i,
    /^clientSecret$/i,
    /^client_secret$/i,
    /^apiKey$/i,
    /^api_key$/i,
    /^refreshToken$/i,
    /^refresh_token$/i,
    /^connectionString$/i,
    /^connection_string$/i,
    /^rawProviderResponse$/i,
    /^raw_provider_response$/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver dependency PR template evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver dependency PR template evidence rejected at ${path}`);
  }
}

function assertAllowedFutureDbDriver(value: string | null) {
  if (!value || !(allowedFutureDbDrivers as readonly string[]).includes(value)) {
    throw new Error("future DB driver dependency evidence selected driver must be pg or postgres");
  }
}

function assertExactSemver(value: string, label: string) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`${label} must be an exact semver version`);
  }
}
