export const dbDriverCandidateReviewPackRequiredSections = [
  "Task Contract",
  "Candidate Driver Review Matrix",
  "Driver Choice Status",
  "License Review Status",
  "Supply-Chain Review Status",
  "Security Advisory Review Status",
  "Version Policy Status",
  "Package Diff Status",
  "Lockfile Review Status",
  "Secret Boundary Status",
  "Owner Approval Status",
  "Final Approval Gate Status",
  "Testing and review",
  "Test Coverage Evidence",
  "Review Independence",
  "Security Boundaries",
  "Residual risks",
  "Human Confirmation",
  "Production Go/No-Go"
] as const;

export const allowedDbDriverCandidateDrivers = ["pg", "postgres"] as const;

export const dbDriverCandidateReviewPackBlockers = [
  "driver_choice_not_selected",
  "owner_approval_not_approved",
  "final_approval_gate_blocked",
  "license_review_not_reviewed",
  "supply_chain_review_not_reviewed",
  "security_advisory_review_not_reviewed",
  "version_policy_not_selected",
  "package_diff_missing",
  "lockfile_review_missing",
  "secret_boundary_not_reviewed"
] as const;

export type DbDriverCandidateDriverName = (typeof allowedDbDriverCandidateDrivers)[number];
export type DbDriverCandidateStatus = "candidate" | "not_selected" | "rejected";
export type DbDriverCandidateReviewPackStatus = "not_ready" | "ready_for_owner_review" | "invalid";
export type DbDriverChoiceStatus = "not_selected" | "selected";
export type DbDriverCurrentReviewStatus = "not_reviewed" | "pass" | "fail";
export type DbDriverMissingReviewStatus = "missing" | "pass" | "fail";
export type DbDriverVersionPolicyStatus = "not_selected" | "selected";
export type DbDriverFinalApprovalGateStatus = "blocked" | "approved_for_dependency_pr";

export type DbDriverCandidateReviewPackContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverCandidateReviewPackValidationContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
};

export type DbDriverCandidateReview = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  candidateStatus: DbDriverCandidateStatus;
  licenseReviewStatus: DbDriverCurrentReviewStatus;
  supplyChainReviewStatus: DbDriverCurrentReviewStatus;
  securityAdvisoryReviewStatus: DbDriverCurrentReviewStatus;
  versionPolicyStatus: DbDriverVersionPolicyStatus;
  packageDiffStatus: DbDriverMissingReviewStatus;
  lockfileReviewStatus: DbDriverMissingReviewStatus;
  secretBoundaryStatus: DbDriverCurrentReviewStatus;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: DbDriverFinalApprovalGateStatus;
  openQuestions: string[];
  blockers: string[];
  safeSummary: string;
};

export type DbDriverCandidateReviewPackRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  reviewPackStatus: DbDriverCandidateReviewPackStatus;
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  candidateReviews: DbDriverCandidateReview[];
  licenseReviewStatus: DbDriverCurrentReviewStatus;
  supplyChainReviewStatus: DbDriverCurrentReviewStatus;
  securityAdvisoryReviewStatus: DbDriverCurrentReviewStatus;
  versionPolicyStatus: DbDriverVersionPolicyStatus;
  packageDiffStatus: DbDriverMissingReviewStatus;
  lockfileReviewStatus: DbDriverMissingReviewStatus;
  secretBoundaryStatus: DbDriverCurrentReviewStatus;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: DbDriverFinalApprovalGateStatus;
  dependencyPrTemplateStatus: "template_ready" | "blocked" | "invalid";
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
  blockers: string[];
  forbiddenScopeStatus: "pass" | "fail";
  safeSummary: string;
  createdAt: string;
};

export function createDefaultDbDriverCandidateReviewPackRecord(
  context: DbDriverCandidateReviewPackContext
): DbDriverCandidateReviewPackRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    reviewPackStatus: "not_ready",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    candidateReviews: allowedDbDriverCandidateDrivers.map((driverName) => createDefaultCandidateReview(driverName)),
    licenseReviewStatus: "not_reviewed",
    supplyChainReviewStatus: "not_reviewed",
    securityAdvisoryReviewStatus: "not_reviewed",
    versionPolicyStatus: "not_selected",
    packageDiffStatus: "missing",
    lockfileReviewStatus: "missing",
    secretBoundaryStatus: "not_reviewed",
    ownerApprovalStatus: "not_approved",
    finalApprovalGateStatus: "blocked",
    dependencyPrTemplateStatus: "template_ready",
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
    requiredPrSections: [...dbDriverCandidateReviewPackRequiredSections],
    blockers: [...dbDriverCandidateReviewPackBlockers],
    forbiddenScopeStatus: "pass",
    safeSummary: "DB driver candidate review pack is not ready. Candidate packages are listed for future owner review only; no package, lockfile, runtime, or production action is authorized.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverCandidateReviewPackRecord(record: DbDriverCandidateReviewPackRecord) {
  assertNoUnsafeDbDriverCandidateReviewPackEvidence(record);
  assertBasicCandidateReviewPackRecord(record);
  if (record.reviewPackStatus !== "not_ready") throw new Error("current DB driver candidate review pack must remain not_ready");
  if (record.driverChoiceStatus !== "not_selected") throw new Error("current DB driver candidate review pack driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("current DB driver candidate review pack must not select a driver");
  assertCandidateDrivers(record.candidateDrivers);
  assertCandidateReviews(record.candidateReviews);
  assertCurrentReviewStatuses(record);
  assertPermissionFlagsFalse(record);
  assertRequiredSections(record.requiredPrSections);
  assertBlockers(record.blockers);
  if (record.dependencyPrTemplateStatus !== "template_ready") throw new Error("current DB driver candidate review pack dependencyPrTemplateStatus must remain template_ready");
  if (record.forbiddenScopeStatus !== "pass") throw new Error("current DB driver candidate review pack forbiddenScopeStatus must pass");
  assertCandidateSummaryDoesNotClaimApproval(record.safeSummary);
  return record;
}

export function validateCommittedDbDriverCandidateReviewPackEvidence(
  record: DbDriverCandidateReviewPackRecord,
  context: DbDriverCandidateReviewPackValidationContext
) {
  validateCurrentDbDriverCandidateReviewPackRecord(record);
  if (record.repository !== context.repository) throw new Error("committed DB driver candidate review pack repository must match context");
  if (record.prNumber !== context.prNumber) throw new Error("committed DB driver candidate review pack prNumber must match context");
  if (record.targetBranch !== context.targetBranch) throw new Error("committed DB driver candidate review pack targetBranch must match context");
  if (record.targetCommitSha !== context.targetCommitSha) throw new Error("committed DB driver candidate review pack targetCommitSha must match context");
  if (record.baseCommitSha !== context.baseCommitSha) throw new Error("committed DB driver candidate review pack baseCommitSha must match context");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("committed DB driver candidate review pack targetCommitSha must differ from baseCommitSha");
  return record;
}

export function assertNoUnsafeDbDriverCandidateReviewPackEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function createDefaultCandidateReview(driverName: DbDriverCandidateDriverName): DbDriverCandidateReview {
  return {
    driverName,
    packageName: driverName,
    candidateStatus: "candidate",
    licenseReviewStatus: "not_reviewed",
    supplyChainReviewStatus: "not_reviewed",
    securityAdvisoryReviewStatus: "not_reviewed",
    versionPolicyStatus: "not_selected",
    packageDiffStatus: "missing",
    lockfileReviewStatus: "missing",
    secretBoundaryStatus: "not_reviewed",
    ownerApprovalStatus: "not_approved",
    finalApprovalGateStatus: "blocked",
    openQuestions: [
      "Owner must review license evidence.",
      "Owner must review supply-chain evidence.",
      "Owner must review security advisory evidence.",
      "Owner must approve exact version policy before dependency work."
    ],
    blockers: [...dbDriverCandidateReviewPackBlockers],
    safeSummary: `${driverName} is listed as a review candidate only. No package, lockfile, runtime, or production action is authorized.`
  };
}

function assertBasicCandidateReviewPackRecord(record: DbDriverCandidateReviewPackRecord) {
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver candidate review pack repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("DB driver candidate review pack prNumber is required");
  if (!record.targetBranch) throw new Error("DB driver candidate review pack targetBranch is required");
  if (!isSha(record.targetCommitSha)) throw new Error("DB driver candidate review pack targetCommitSha must be a 40-character SHA");
  if (!isSha(record.baseCommitSha)) throw new Error("DB driver candidate review pack baseCommitSha must be a 40-character SHA");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("DB driver candidate review pack targetCommitSha must differ from baseCommitSha");
  if (!record.createdAt.endsWith("Z")) throw new Error("DB driver candidate review pack createdAt must be UTC");
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("current DB driver candidate review pack must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) throw new Error("current DB driver candidate review pack candidateDrivers must be exactly pg then postgres");
  }
}

function assertCandidateReviews(candidateReviews: DbDriverCandidateReview[]) {
  if (candidateReviews.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("current DB driver candidate review pack must include exactly one review for pg and one for postgres");
  }
  const seen = new Set<string>();
  for (const review of candidateReviews) {
    if (seen.has(review.driverName)) throw new Error(`duplicate DB driver candidate review rejected for ${review.driverName}`);
    seen.add(review.driverName);
    if (!(allowedDbDriverCandidateDrivers as readonly string[]).includes(review.driverName)) {
      throw new Error("current DB driver candidate review pack rejects extra candidate review driver");
    }
    if (review.packageName !== review.driverName) throw new Error("current DB driver candidate review packageName must match driverName");
    if (review.candidateStatus !== "candidate") {
      throw new Error("current DB driver candidate review status must remain candidate");
    }
    assertCandidateReviewStatuses(review);
    assertBlockers(review.blockers);
    assertCandidateSummaryDoesNotClaimApproval(review.safeSummary);
  }
  for (const driverName of allowedDbDriverCandidateDrivers) {
    if (!seen.has(driverName)) throw new Error(`current DB driver candidate review pack missing ${driverName} review`);
  }
}

function assertCandidateReviewStatuses(review: DbDriverCandidateReview) {
  if (review.licenseReviewStatus !== "not_reviewed") throw new Error(`${review.driverName} licenseReviewStatus must remain not_reviewed`);
  if (review.supplyChainReviewStatus !== "not_reviewed") throw new Error(`${review.driverName} supplyChainReviewStatus must remain not_reviewed`);
  if (review.securityAdvisoryReviewStatus !== "not_reviewed") throw new Error(`${review.driverName} securityAdvisoryReviewStatus must remain not_reviewed`);
  if (review.versionPolicyStatus !== "not_selected") throw new Error(`${review.driverName} versionPolicyStatus must remain not_selected`);
  if (review.packageDiffStatus !== "missing") throw new Error(`${review.driverName} packageDiffStatus must remain missing`);
  if (review.lockfileReviewStatus !== "missing") throw new Error(`${review.driverName} lockfileReviewStatus must remain missing`);
  if (review.secretBoundaryStatus !== "not_reviewed") throw new Error(`${review.driverName} secretBoundaryStatus must remain not_reviewed`);
  if (review.ownerApprovalStatus !== "not_approved") throw new Error(`${review.driverName} ownerApprovalStatus must remain not_approved`);
  if (review.finalApprovalGateStatus !== "blocked") throw new Error(`${review.driverName} finalApprovalGateStatus must remain blocked`);
}

function assertCurrentReviewStatuses(record: DbDriverCandidateReviewPackRecord) {
  if (record.licenseReviewStatus !== "not_reviewed") throw new Error("current DB driver candidate review pack licenseReviewStatus must remain not_reviewed");
  if (record.supplyChainReviewStatus !== "not_reviewed") throw new Error("current DB driver candidate review pack supplyChainReviewStatus must remain not_reviewed");
  if (record.securityAdvisoryReviewStatus !== "not_reviewed") throw new Error("current DB driver candidate review pack securityAdvisoryReviewStatus must remain not_reviewed");
  if (record.versionPolicyStatus !== "not_selected") throw new Error("current DB driver candidate review pack versionPolicyStatus must remain not_selected");
  if (record.packageDiffStatus !== "missing") throw new Error("current DB driver candidate review pack packageDiffStatus must remain missing");
  if (record.lockfileReviewStatus !== "missing") throw new Error("current DB driver candidate review pack lockfileReviewStatus must remain missing");
  if (record.secretBoundaryStatus !== "not_reviewed") throw new Error("current DB driver candidate review pack secretBoundaryStatus must remain not_reviewed");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("current DB driver candidate review pack ownerApprovalStatus must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("current DB driver candidate review pack finalApprovalGateStatus must remain blocked");
}

function assertPermissionFlagsFalse(record: DbDriverCandidateReviewPackRecord) {
  const falseKeys: Array<keyof DbDriverCandidateReviewPackRecord> = [
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
    if (record[key] !== false) throw new Error(`current DB driver candidate review pack ${String(key)} must remain false`);
  }
}

function assertRequiredSections(sections: string[]) {
  const present = new Set(sections);
  for (const section of dbDriverCandidateReviewPackRequiredSections) {
    if (!present.has(section)) throw new Error(`DB driver candidate review pack requires section ${section}`);
  }
}

function assertBlockers(blockers: string[]) {
  const allowed = new Set(dbDriverCandidateReviewPackBlockers);
  for (const blocker of blockers) {
    if (!allowed.has(blocker as (typeof dbDriverCandidateReviewPackBlockers)[number])) {
      throw new Error(`DB driver candidate review pack rejects unknown blocker ${blocker}`);
    }
  }
  for (const blocker of dbDriverCandidateReviewPackBlockers) {
    if (!blockers.includes(blocker)) throw new Error(`DB driver candidate review pack requires blocker ${blocker}`);
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

function assertCandidateSummaryDoesNotClaimApproval(value: string) {
  const unsafeApprovalPatterns = [
    /\bapproved\b/i,
    /\bselected\b/i,
    /\brecommended\b/i,
    /\bwinner\b/i,
    /\bbest\s+choice\b/i,
    /\bpreferred\b/i,
    /\bapproved\s+choice\b/i,
    /\bsafe\s+for\s+dependency\b/i,
    /\bready\s+for\s+dependency\b/i,
    /\binstall\s+now\b/i,
    /\bproduction\s+candidate\b/i,
    /\blegally\s+safe\b/i,
    /\bpolicy\s+compliant\b/i,
    /production[_ -]?ready/i,
    /runtime[_ -]?ready/i,
    /legal[_ -]?compliant/i,
    /youtube[_ -]?policy[_ -]?compliant/i,
    /ready_for_owner_review/i
  ];
  for (const pattern of unsafeApprovalPatterns) {
    if (pattern.test(value)) throw new Error("DB driver candidate review pack safeSummary must not claim approval, selection, readiness, or compliance");
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
    /gh\s+run\s+view\s+--log/i,
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
    /^raw_provider_response$/i,
    /^rawGitHubLog$/i,
    /^raw_github_log$/i,
    /^privateUrl$/i,
    /^private_url$/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver candidate review pack evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver candidate review pack evidence rejected at ${path}`);
  }
}

function isSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}
