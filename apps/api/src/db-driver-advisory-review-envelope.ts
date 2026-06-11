import { allowedDbDriverCandidateDrivers, type DbDriverCandidateDriverName, type DbDriverChoiceStatus } from "./db-driver-candidate-review-pack.js";

export const dbDriverAdvisoryReviewEnvelopeBlockers = [
  "advisory_review_not_reviewed",
  "cve_review_not_reviewed",
  "package_audit_review_not_reviewed",
  "known_blockers_not_reviewed",
  "raw_output_policy_required",
  "advisory_source_not_reviewed",
  "freshness_not_ready",
  "owner_approval_not_approved",
  "final_approval_gate_blocked",
  "driver_not_selected",
  "selected_driver_forbidden",
  "package_change_forbidden",
  "pnpm_lock_change_forbidden",
  "db_driver_dependency_forbidden",
  "real_db_connection_forbidden",
  "migration_execution_forbidden",
  "live_db_integration_forbidden",
  "provider_sdk_apply_forbidden",
  "production_deployment_forbidden",
  "runtime_readiness_claim_forbidden",
  "production_readiness_claim_forbidden",
  "legal_compliance_claim_forbidden",
  "youtube_policy_compliance_claim_forbidden",
  "unsafe_evidence_rejected",
  "raw_log_reference_rejected",
  "raw_advisory_output_rejected",
  "raw_audit_output_rejected",
  "raw_dependency_tree_rejected"
] as const;

export type DbDriverAdvisoryEnvelopeStatus = "not_reviewed" | "review_ready" | "invalid";
export type DbDriverAdvisoryReviewStatus = "not_reviewed" | "pass" | "fail";
export type DbDriverKnownBlockersStatus = "not_reviewed" | "reviewed";
export type DbDriverRawOutputPolicyStatus = "safe_summary_only" | "invalid";
export type DbDriverAdvisorySourcePolicyStatus = "not_reviewed" | "reviewed";
export type DbDriverAdvisoryFreshnessStatus = "not_ready" | "fresh" | "stale" | "invalid";

export type DbDriverCandidateAdvisoryReview = {
  driverName: DbDriverCandidateDriverName;
  packageName: DbDriverCandidateDriverName;
  advisoryReviewStatus: DbDriverAdvisoryReviewStatus;
  cveReviewStatus: DbDriverAdvisoryReviewStatus;
  packageAuditReviewStatus: DbDriverAdvisoryReviewStatus;
  knownBlockersStatus: DbDriverKnownBlockersStatus;
  knownBlockers: string[] | null;
  rawOutputPolicyStatus: DbDriverRawOutputPolicyStatus;
  lastReviewedAt: string | null;
  expiresAt: string | null;
  refreshRequired: boolean;
  safeSummary: string;
};

export type DbDriverAdvisoryReviewEnvelopeContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
};

export type DbDriverAdvisoryReviewEnvelopeValidationContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
};

export type DbDriverAdvisoryReviewEnvelopeRecord = {
  schemaVersion: string;
  harnessVersion: string;
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  advisoryEnvelopeStatus: DbDriverAdvisoryEnvelopeStatus;
  driverChoiceStatus: DbDriverChoiceStatus;
  selectedDriver: DbDriverCandidateDriverName | null;
  candidateDrivers: DbDriverCandidateDriverName[];
  candidateAdvisoryReviews: DbDriverCandidateAdvisoryReview[];
  cveReviewStatus: DbDriverAdvisoryReviewStatus;
  securityAdvisoryReviewStatus: DbDriverAdvisoryReviewStatus;
  packageAuditReviewStatus: DbDriverAdvisoryReviewStatus;
  knownBlockersStatus: DbDriverKnownBlockersStatus;
  knownBlockers: string[] | null;
  rawOutputPolicyStatus: DbDriverRawOutputPolicyStatus;
  advisorySourcePolicyStatus: DbDriverAdvisorySourcePolicyStatus;
  freshnessStatus: DbDriverAdvisoryFreshnessStatus;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: "blocked" | "approved_for_dependency_pr";
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
  forbiddenScopeStatus: "pass" | "fail";
  safeSummary: string;
  createdAt: string;
};

type ValidationOptions = {
  allowFutureReviewedFixture?: boolean;
};

export function createDefaultDbDriverAdvisoryReviewEnvelopeRecord(
  context: DbDriverAdvisoryReviewEnvelopeContext
): DbDriverAdvisoryReviewEnvelopeRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: context.harnessVersion ?? "1.1.7",
    repository: context.repository,
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    advisoryEnvelopeStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...allowedDbDriverCandidateDrivers],
    candidateAdvisoryReviews: allowedDbDriverCandidateDrivers.map((driverName) => createDefaultCandidateAdvisoryReview(driverName)),
    cveReviewStatus: "not_reviewed",
    securityAdvisoryReviewStatus: "not_reviewed",
    packageAuditReviewStatus: "not_reviewed",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
    rawOutputPolicyStatus: "safe_summary_only",
    advisorySourcePolicyStatus: "not_reviewed",
    freshnessStatus: "not_ready",
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
    forbiddenScopeStatus: "pass",
    safeSummary:
      "DB driver advisory review envelope is not reviewed. It defines safe advisory evidence shape only; no driver, package, audit conclusion, runtime, production, legal, or YouTube policy action is authorized.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record: DbDriverAdvisoryReviewEnvelopeRecord) {
  validateDbDriverAdvisoryReviewEnvelopeRecord(record);
  return record;
}

export function validateFutureReviewedDbDriverAdvisoryReviewEnvelopeFixture(record: DbDriverAdvisoryReviewEnvelopeRecord) {
  validateDbDriverAdvisoryReviewEnvelopeRecord(record, { allowFutureReviewedFixture: true });
  return record;
}

export function validateCommittedDbDriverAdvisoryReviewEnvelopeEvidence(
  record: DbDriverAdvisoryReviewEnvelopeRecord,
  context: DbDriverAdvisoryReviewEnvelopeValidationContext
) {
  validateCurrentDbDriverAdvisoryReviewEnvelopeRecord(record);
  if (record.repository !== context.repository) throw new Error("committed DB driver advisory envelope repository must match context");
  if (record.prNumber !== context.prNumber) throw new Error("committed DB driver advisory envelope prNumber must match context");
  if (record.targetBranch !== context.targetBranch) throw new Error("committed DB driver advisory envelope targetBranch must match context");
  if (record.targetCommitSha !== context.targetCommitSha) throw new Error("committed DB driver advisory envelope targetCommitSha must match context");
  if (record.baseCommitSha !== context.baseCommitSha) throw new Error("committed DB driver advisory envelope baseCommitSha must match context");
  if (record.targetCommitSha === record.baseCommitSha) throw new Error("committed DB driver advisory envelope targetCommitSha must differ from baseCommitSha");
  return record;
}

export function assertNoUnsafeDbDriverAdvisoryReviewEnvelopeEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function createDefaultCandidateAdvisoryReview(driverName: DbDriverCandidateDriverName): DbDriverCandidateAdvisoryReview {
  return {
    driverName,
    packageName: driverName,
    advisoryReviewStatus: "not_reviewed",
    cveReviewStatus: "not_reviewed",
    packageAuditReviewStatus: "not_reviewed",
    knownBlockersStatus: "not_reviewed",
    knownBlockers: null,
    rawOutputPolicyStatus: "safe_summary_only",
    lastReviewedAt: null,
    expiresAt: null,
    refreshRequired: true,
    safeSummary: `${driverName} advisory review envelope is not reviewed. Future advisory review must use safe summaries only.`
  };
}

function validateDbDriverAdvisoryReviewEnvelopeRecord(
  record: DbDriverAdvisoryReviewEnvelopeRecord,
  options: ValidationOptions = {}
) {
  assertNoUnsafeDbDriverAdvisoryReviewEnvelopeEvidence(record);
  assertCandidateDrivers(record.candidateDrivers);
  assertCandidateAdvisoryReviews(record.candidateAdvisoryReviews, options);
  assertPermissionFlagsFalse(record);
  if (record.driverChoiceStatus !== "not_selected") throw new Error("DB driver advisory envelope driverChoiceStatus must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("DB driver advisory envelope must not select a driver");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("DB driver advisory envelope ownerApprovalStatus must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("DB driver advisory envelope finalApprovalGateStatus must remain blocked");
  if (record.dependencyPrTemplateStatus !== "template_ready") throw new Error("DB driver advisory envelope dependencyPrTemplateStatus must remain template_ready");
  if (record.forbiddenScopeStatus !== "pass") throw new Error("DB driver advisory envelope forbiddenScopeStatus must pass");
  assertCurrentStatuses(record, options);
  assertSafeSummaryDoesNotClaimReview(record.safeSummary);
}

function assertCandidateDrivers(candidateDrivers: string[]) {
  if (!Array.isArray(candidateDrivers) || candidateDrivers.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory envelope must list exactly pg and postgres");
  }
  for (const [index, driverName] of allowedDbDriverCandidateDrivers.entries()) {
    if (candidateDrivers[index] !== driverName) throw new Error("DB driver advisory envelope candidateDrivers must be exactly pg then postgres");
  }
}

function assertCandidateAdvisoryReviews(
  reviews: DbDriverCandidateAdvisoryReview[],
  options: ValidationOptions
) {
  if (!Array.isArray(reviews) || reviews.length !== allowedDbDriverCandidateDrivers.length) {
    throw new Error("DB driver advisory envelope must include pg and postgres advisory reviews");
  }
  const seen = new Set<string>();
  for (const review of reviews) {
    if (!allowedDbDriverCandidateDrivers.includes(review.driverName)) throw new Error("DB driver advisory envelope candidate review driver is invalid");
    if (seen.has(review.driverName)) throw new Error("DB driver advisory envelope candidate reviews must not duplicate drivers");
    seen.add(review.driverName);
    if (review.packageName !== review.driverName) throw new Error("DB driver advisory envelope packageName must match driverName");
    assertSafeSummaryDoesNotClaimReview(review.safeSummary);
    if (!options.allowFutureReviewedFixture) {
      if (review.advisoryReviewStatus !== "not_reviewed") throw new Error("candidate advisory review must remain not_reviewed");
      if (review.cveReviewStatus !== "not_reviewed") throw new Error("candidate CVE review must remain not_reviewed");
      if (review.packageAuditReviewStatus !== "not_reviewed") throw new Error("candidate package audit review must remain not_reviewed");
      if (review.knownBlockersStatus !== "not_reviewed") throw new Error("candidate known blockers status must remain not_reviewed");
      if (review.knownBlockers !== null) throw new Error("candidate known blockers must remain null until reviewed");
      if (review.lastReviewedAt !== null) throw new Error("candidate advisory lastReviewedAt must remain null");
      if (review.expiresAt !== null) throw new Error("candidate advisory expiresAt must remain null");
      if (review.refreshRequired !== true) throw new Error("candidate advisory refreshRequired must remain true");
    }
    if (review.rawOutputPolicyStatus !== "safe_summary_only") throw new Error("candidate advisory raw output policy must remain safe_summary_only");
  }
  assertCandidateDrivers([...seen]);
}

function assertCurrentStatuses(record: DbDriverAdvisoryReviewEnvelopeRecord, options: ValidationOptions) {
  if (record.rawOutputPolicyStatus !== "safe_summary_only") throw new Error("DB driver advisory raw output policy must be safe_summary_only");
  if (!options.allowFutureReviewedFixture) {
    if (record.advisoryEnvelopeStatus !== "not_reviewed") throw new Error("DB driver advisory envelope status must remain not_reviewed");
    if (record.cveReviewStatus !== "not_reviewed") throw new Error("DB driver advisory CVE review must remain not_reviewed");
    if (record.securityAdvisoryReviewStatus !== "not_reviewed") throw new Error("DB driver advisory security review must remain not_reviewed");
    if (record.packageAuditReviewStatus !== "not_reviewed") throw new Error("DB driver advisory package audit review must remain not_reviewed");
    if (record.knownBlockersStatus !== "not_reviewed") throw new Error("DB driver advisory known blockers status must remain not_reviewed");
    if (record.knownBlockers !== null) throw new Error("DB driver advisory known blockers must remain null until reviewed");
    if (record.advisorySourcePolicyStatus !== "not_reviewed") throw new Error("DB driver advisory source policy must remain not_reviewed");
    if (record.freshnessStatus !== "not_ready") throw new Error("DB driver advisory freshness must remain not_ready");
  }
}

function assertPermissionFlagsFalse(record: DbDriverAdvisoryReviewEnvelopeRecord) {
  const falseKeys: Array<keyof DbDriverAdvisoryReviewEnvelopeRecord> = [
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
    if (record[key] !== false) throw new Error(`DB driver advisory envelope ${String(key)} must remain false`);
  }
}

function scanUnsafeEvidence(value: unknown, path = "advisory") {
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

function assertSafeSummaryDoesNotClaimReview(value: string) {
  const forbiddenSummaryPatterns = [
    /\bpass\b/i,
    /\bno\s+blockers\b/i,
    /\bno\s+cves?\b/i,
    /\bno\s+vulnerabilities\b/i,
    /\baudit\s+clean\b/i,
    /\bclean\s+advisory\b/i,
    /\bapproved\s+advisory\b/i,
    /\bsecurity\s+approved\b/i,
    /\bsecurity\s+clean\b/i,
    /\bsafe\s+to\s+install\b/i,
    /\bsafe\s+dependency\b/i,
    /\bdependency\s+approved\b/i,
    /\bbest\s+choice\b/i,
    /\bwinner\b/i,
    /\bpreferred\b/i,
    /\bCVE\s+clean\b/i,
    /\bapproved\b/i,
    /\bselec[t]ed\b/i,
    /\brecommended\b/i,
    /\binstall\s+now\b/i,
    /\bproduction\s+ready\b/i,
    /\blegally\s+safe\b/i,
    /\bpolicy\s+compliant\b/i,
    /runtime[_ -]?ready/i,
    /legal[_ -]?compliant/i,
    /youtube[_ -]?policy[_ -]?compliant/i
  ];
  for (const pattern of forbiddenSummaryPatterns) {
    if (pattern.test(value)) throw new Error("DB driver advisory envelope safeSummary must not claim review pass, selection, approval, readiness, or compliance");
  }
}

function assertSafeString(value: string, path: string) {
  const unsafePatterns = [
    /Bearer\s+/i,
    /https?:\/\//i,
    /postgres(?:ql)?:\/\//i,
    /DATABASE_URL|POSTGRES_URL/i,
    /connection[_ -]?string/i,
    /databaseUrl|postgresUrl/i,
    /ghp_[a-z0-9_]+/i,
    /sk-[a-z0-9_-]+/i,
    /xoxb-[a-z0-9-]+/i,
    /AKIA[0-9A-Z]+/i,
    /0x[0-9a-fA-F]{40}/,
    /BEGIN .*PRIVATE/i,
    /\bstdout\b|\bstderr\b|stack[_ -]?trace/i,
    /\bstack\s+trace\b/i,
    /raw[_ -]?logs?/i,
    /gh run view --log/i,
    /logs_url|jobs_url|file_contents/i,
    /dependency[_ -]?tree|raw dependency tree/i,
    /npm audit --json/i,
    /auditReportVersion/i,
    /\bvulnerabilities\b/i,
    /raw[_ -]?audit/i,
    /raw[_ -]?advisory/i,
    /raw[_ -]?terminal/i,
    /GitHub Advisory Database raw/i,
    /GHSA-/i,
    /CVE-20\d{2}-/i,
    /github advisory api response/i,
    /github advisory raw response/i,
    /advisory raw response/i,
    /provider[_ -]?response/i,
    /secret\s*[:=]/i,
    /token\s*[:=]/i,
    /api[_-]?key\s*[:=]/i
  ];
  const unsafeKeyPatterns = [
    /password/i,
    /clientSecret/i,
    /client_secret/i,
    /secret[_-]?(value|token|key)/i,
    /secret(value|token|key)/i,
    /refreshToken|accessToken/i,
    /apiKey|api_key|api-key/i,
    /database[_-]?url/i,
    /postgres[_-]?url/i,
    /^rawAuditJson$/i,
    /^rawAuditOutput$/i,
    /^rawAdvisoryJson$/i,
    /^rawAdvisoryResponse$/i,
    /^rawDependencyTree$/i,
    /^rawTerminalOutput$/i,
    /^stdout$/i,
    /^stderr$/i,
    /^stackTrace$/i,
    /^logsUrl$/i,
    /^jobsUrl$/i,
    /^advisoryApiResponse$/i,
    /^npmAuditJson$/i,
    /^githubAdvisoryResponse$/i
  ];
  if (path.endsWith(".key")) {
    for (const pattern of unsafeKeyPatterns) {
      if (pattern.test(value)) throw new Error(`unsafe DB driver advisory evidence rejected at ${path}`);
    }
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) throw new Error(`unsafe DB driver advisory evidence rejected at ${path}`);
  }
}
