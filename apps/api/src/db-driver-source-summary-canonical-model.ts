export const dbDriverSourceSummaryCanonicalCandidateDrivers = ["pg", "postgres"] as const;
export type DbDriverSourceSummaryCanonicalCandidateDriver =
  (typeof dbDriverSourceSummaryCanonicalCandidateDrivers)[number];

export const dbDriverSourceSummaryVerificationProfile = "db_driver_source_summary_v1" as const;
export const dbDriverSourceSummaryCanonicalPrNumber = 62 as const;
export const dbDriverSourceSummaryRejectedSyntheticHeadSha =
  "1111111111111111111111111111111111111111" as const;
export const dbDriverSourceSummaryCurrentCiRunId = "27384710953" as const;
export const dbDriverSourceSummaryCurrentQualityGateRunId = "27384898010" as const;
export const dbDriverSourceSummaryCurrentQualityGateArtifactId = "7579705811" as const;

export const dbDriverSourceSummaryCanonicalBlockers = [
  "canonical_model_not_ready",
  "invalid_evidence_mode",
  "missing_current_head_pr_body",
  "missing_current_head_checks",
  "missing_current_head_quality_gate",
  "missing_current_head_safe_artifact",
  "self_referential_sha_unhandled",
  "artifact_loop_policy_missing",
  "fake_artifact_detected",
  "pending_placeholder_detected",
  "not_applicable_marker_detected",
  "stale_pr_number_detected",
  "stale_head_without_artifact_detected",
  "current_pr_head_placeholder_detected",
  "current_pr_base_placeholder_detected",
  "unsafe_evidence_rejected",
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
  "youtube_policy_compliance_claim_forbidden"
] as const;

type CanonicalModelStatus = "model_ready" | "not_ready" | "invalid";
type EvidenceMode = "previous_head_committed_plus_current_head_artifact" | "current_head_committed_required" | "invalid";

export interface DbDriverSourceSummaryCurrentHeadEvidence {
  prBodyStatus: "current_head_recorded" | "missing" | "placeholder";
  githubChecksStatus: "same_head_pass" | "missing" | "failed" | "stale";
  qualityGateArtifactStatus: "same_head_artifact_present" | "missing" | "fake" | "stale";
  prNumber: number | null;
  headSha: string | null;
  baseSha: string | null;
  ciRunId: string | null;
  qualityGateRunId: string | null;
  qualityGateArtifactId: string | null;
  evidenceSource: "pr_body_github_checks_safe_artifact" | "missing" | "placeholder";
}

export interface DbDriverSourceSummaryCanonicalModelRecord {
  schemaVersion: "1.0.0";
  harnessVersion: "1.1.8";
  repository: "hiro4649/CRIPTO-TIP";
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  committedEvidenceHeadSha: string;
  committedEvidenceBaseSha: string;
  canonicalModelStatus: CanonicalModelStatus;
  evidenceMode: EvidenceMode;
  committedEvidenceRole: "previous_head_safe_evidence" | "current_head_committed_evidence";
  currentHeadEvidenceRole: "pr_body_github_checks_safe_artifact";
  selfReferentialShaPolicy: "exception_allowed_with_current_head_artifact" | "not_handled";
  artifactLoopStopPolicy: "stop_after_same_head_pass" | "not_defined";
  safeSummaryVerificationProfile: typeof dbDriverSourceSummaryVerificationProfile;
  sourceEvidenceStatus: "not_reviewed" | "reviewed" | "fresh";
  driverChoiceStatus: "not_selected" | "selected";
  selectedDriver: DbDriverSourceSummaryCanonicalCandidateDriver | null;
  candidateDrivers: DbDriverSourceSummaryCanonicalCandidateDriver[];
  currentHeadEvidence: DbDriverSourceSummaryCurrentHeadEvidence;
  committedEvidenceStatus: "previous_head_allowed" | "current_head_required" | "invalid";
  previousHeadCommittedEvidenceAllowed: boolean;
  previousHeadConditions: string[];
  staleEvidencePolicy: string[];
  placeholderPolicy: string[];
  fakeArtifactPolicy: string[];
  prBodyEditLoopPolicy: string;
  qualityGateChurnPolicy: string;
  ownerApprovalStatus: "not_approved" | "approved";
  finalApprovalGateStatus: "blocked" | "approved";
  dependencyPrTemplateStatus: "template_ready" | "not_ready";
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
}

export interface DbDriverSourceSummaryCanonicalContext {
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
}

export function createDefaultDbDriverSourceSummaryCanonicalModelRecord(
  context: DbDriverSourceSummaryCanonicalContext
): DbDriverSourceSummaryCanonicalModelRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: "1.1.8",
    repository: "hiro4649/CRIPTO-TIP",
    prNumber: context.prNumber,
    targetBranch: context.targetBranch,
    targetCommitSha: context.targetCommitSha,
    baseCommitSha: context.baseCommitSha,
    canonicalModelStatus: "model_ready",
    evidenceMode: "previous_head_committed_plus_current_head_artifact",
    committedEvidenceRole: "previous_head_safe_evidence",
    currentHeadEvidenceRole: "pr_body_github_checks_safe_artifact",
    selfReferentialShaPolicy: "exception_allowed_with_current_head_artifact",
    artifactLoopStopPolicy: "stop_after_same_head_pass",
    safeSummaryVerificationProfile: dbDriverSourceSummaryVerificationProfile,
    sourceEvidenceStatus: "not_reviewed",
    driverChoiceStatus: "not_selected",
    selectedDriver: null,
    candidateDrivers: [...dbDriverSourceSummaryCanonicalCandidateDrivers],
    currentHeadEvidence: {
      prBodyStatus: "current_head_recorded",
      githubChecksStatus: "same_head_pass",
      qualityGateArtifactStatus: "same_head_artifact_present",
      prNumber: context.prNumber,
      headSha: context.targetCommitSha,
      baseSha: context.baseCommitSha,
      ciRunId: null,
      qualityGateRunId: null,
      qualityGateArtifactId: null,
      evidenceSource: "pr_body_github_checks_safe_artifact"
    },
    committedEvidenceHeadSha: context.targetCommitSha,
    committedEvidenceBaseSha: context.baseCommitSha,
    committedEvidenceStatus: "previous_head_allowed",
    previousHeadCommittedEvidenceAllowed: true,
    previousHeadConditions: [
      "pr_body_has_current_head_sha",
      "required_checks_pass_on_current_head",
      "quality_gate_pass_on_current_head",
      "safe_artifact_exists_on_current_head",
      "no_fake_artifact_id",
      "no_pending_placeholder",
      "no_forbidden_scope_expansion"
    ],
    staleEvidencePolicy: [
      "reject_pr_number_zero",
      "reject_stale_pr_number_without_previous_head_mode",
      "reject_stale_head_without_artifact",
      "reject_local_pre_push_evidence_as_merge_evidence"
    ],
    placeholderPolicy: [
      "reject_current_pr_head",
      "reject_current_pr_base",
      "reject_HEAD_SHA_PLACEHOLDER",
      "reject_BASE_SHA_PLACEHOLDER",
      "reject_not_applicable_before_pr_creation",
      "reject_pending_until_github_actions"
    ],
    fakeArtifactPolicy: ["reject_7500000000", "reject_missing_artifact", "reject_artifact_not_same_head"],
    prBodyEditLoopPolicy: "After one current-head PR body update, later same-head body-check pass is final report evidence and must not trigger edit churn.",
    qualityGateChurnPolicy: "Do not chase endless quality-gate runs created only by PR body edits.",
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
      "Canonical source-summary evidence model is ready, but source evidence remains not reviewed and no DB driver is selected.",
    createdAt: context.createdAt
  };
}

export function validateCurrentDbDriverSourceSummaryCanonicalModelRecord(
  record: DbDriverSourceSummaryCanonicalModelRecord
): DbDriverSourceSummaryCanonicalModelRecord {
  assertCanonicalBasics(record);
  assertNoUnsafeCanonicalValues(record);
  assertCanonicalNoDriverNoRuntime(record);
  if (record.evidenceMode !== "previous_head_committed_plus_current_head_artifact") {
    throw new Error("invalid evidence mode");
  }
  if (record.committedEvidenceRole !== "previous_head_safe_evidence") throw new Error("invalid committed evidence role");
  if (record.currentHeadEvidenceRole !== "pr_body_github_checks_safe_artifact") {
    throw new Error("missing current-head artifact evidence role");
  }
  if (record.selfReferentialShaPolicy !== "exception_allowed_with_current_head_artifact") {
    throw new Error("self-referential SHA policy missing");
  }
  if (record.artifactLoopStopPolicy !== "stop_after_same_head_pass") throw new Error("artifact loop stop policy missing");
  if (record.safeSummaryVerificationProfile !== dbDriverSourceSummaryVerificationProfile) {
    throw new Error("verification profile mismatch");
  }
  if (!record.previousHeadCommittedEvidenceAllowed) throw new Error("previous-head mode must be explicitly allowed");
  if (record.targetCommitSha !== record.currentHeadEvidence.headSha) {
    throw new Error("targetCommitSha must match current-head evidence SHA");
  }
  assertCurrentHeadEvidence(record);
  return record;
}

export function validateCurrentHeadCommittedRequiredFixture(
  record: DbDriverSourceSummaryCanonicalModelRecord
): DbDriverSourceSummaryCanonicalModelRecord {
  assertCanonicalBasics(record);
  assertNoUnsafeCanonicalValues(record);
  assertCanonicalNoDriverNoRuntime(record);
  if (record.evidenceMode !== "current_head_committed_required") throw new Error("fixture must use current-head mode");
  if (record.targetCommitSha === record.baseCommitSha) {
    throw new Error("current-head fixture targetCommitSha must differ from baseCommitSha");
  }
  if (record.committedEvidenceRole !== "current_head_committed_evidence") {
    throw new Error("fixture must use committed current-head evidence role");
  }
  if (record.committedEvidenceStatus !== "current_head_required") throw new Error("fixture must require committed current head");
  return record;
}

function assertCanonicalBasics(record: DbDriverSourceSummaryCanonicalModelRecord) {
  if (record.schemaVersion !== "1.0.0") throw new Error("schemaVersion must be 1.0.0");
  if (record.harnessVersion !== "1.1.8") throw new Error("harnessVersion must be 1.1.8");
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("repository mismatch");
  if (!Number.isInteger(record.prNumber) || record.prNumber <= 0) throw new Error("prNumber must be positive");
  if (!/^[0-9a-f]{40}$/i.test(record.targetCommitSha)) throw new Error("targetCommitSha must be 40-char SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.baseCommitSha)) throw new Error("baseCommitSha must be 40-char SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.committedEvidenceHeadSha)) {
    throw new Error("committedEvidenceHeadSha must be 40-char SHA");
  }
  if (!/^[0-9a-f]{40}$/i.test(record.committedEvidenceBaseSha)) {
    throw new Error("committedEvidenceBaseSha must be 40-char SHA");
  }
  if (record.targetCommitSha === record.baseCommitSha) {
    throw new Error("targetCommitSha must differ from baseCommitSha");
  }
  if (record.targetCommitSha === dbDriverSourceSummaryRejectedSyntheticHeadSha) {
    throw new Error("synthetic head SHA is forbidden in canonical evidence");
  }
  if (record.canonicalModelStatus !== "model_ready") throw new Error("canonical model not ready");
  assertExactSet(record.candidateDrivers, dbDriverSourceSummaryCanonicalCandidateDrivers, "candidateDrivers");
}

function assertCurrentHeadEvidence(record: DbDriverSourceSummaryCanonicalModelRecord) {
  const evidence = record.currentHeadEvidence;
  if (evidence.evidenceSource !== "pr_body_github_checks_safe_artifact") {
    throw new Error("current-head evidence source missing");
  }
  if (evidence.prNumber !== record.prNumber) throw new Error("current-head PR number mismatch");
  if (evidence.prNumber !== dbDriverSourceSummaryCanonicalPrNumber) {
    throw new Error("stale PR number detected");
  }
  if (evidence.prBodyStatus !== "current_head_recorded") throw new Error("missing current-head PR body");
  if (evidence.githubChecksStatus !== "same_head_pass") throw new Error("missing current-head checks");
  if (evidence.qualityGateArtifactStatus !== "same_head_artifact_present") {
    throw new Error("missing current-head quality-gate artifact");
  }
  if (!evidence.headSha || !/^[0-9a-f]{40}$/i.test(evidence.headSha)) throw new Error("current-head SHA missing");
  if (evidence.headSha === dbDriverSourceSummaryRejectedSyntheticHeadSha) {
    throw new Error("synthetic head SHA is forbidden in current-head evidence");
  }
  if (evidence.headSha === record.baseCommitSha) throw new Error("current-head SHA must differ from base commit");
  if (!evidence.baseSha || !/^[0-9a-f]{40}$/i.test(evidence.baseSha)) throw new Error("current-head base SHA missing");
  if (evidence.baseSha !== record.baseCommitSha) throw new Error("current-head base SHA mismatch");
  if (!evidence.ciRunId) throw new Error("current-head CI run missing");
  if (!evidence.qualityGateRunId) throw new Error("current-head quality-gate run missing");
  if (!evidence.qualityGateArtifactId) throw new Error("current-head quality-gate artifact missing");
  if (evidence.qualityGateArtifactId === "7500000000") throw new Error("fake artifact detected");
  if (evidence.ciRunId !== dbDriverSourceSummaryCurrentCiRunId) throw new Error("stale current-head CI run");
  if (evidence.qualityGateRunId !== dbDriverSourceSummaryCurrentQualityGateRunId) {
    throw new Error("stale current-head quality-gate run");
  }
  if (evidence.qualityGateArtifactId !== dbDriverSourceSummaryCurrentQualityGateArtifactId) {
    throw new Error("stale current-head quality-gate artifact");
  }
}

function assertCanonicalNoDriverNoRuntime(record: DbDriverSourceSummaryCanonicalModelRecord) {
  if (record.sourceEvidenceStatus !== "not_reviewed") throw new Error("source evidence must remain not_reviewed");
  if (record.driverChoiceStatus !== "not_selected") throw new Error("driver choice must remain not_selected");
  if (record.selectedDriver !== null) throw new Error("selected driver forbidden");
  if (record.ownerApprovalStatus !== "not_approved") throw new Error("owner approval must remain not_approved");
  if (record.finalApprovalGateStatus !== "blocked") throw new Error("final approval gate must remain blocked");
  const flags = [
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
  ] as const;
  for (const flag of flags) {
    if (record[flag]) throw new Error(`${flag} true is forbidden`);
  }
  if (record.forbiddenScopeStatus !== "pass") throw new Error("forbidden scope must pass");
}

function assertNoUnsafeCanonicalValues(value: unknown, path = "record") {
  if (typeof value === "string") {
    const unsafePatterns = [
      /current_pr_head|current_pr_base|HEAD_SHA_PLACEHOLDER|BASE_SHA_PLACEHOLDER/i,
      /branch_head_sha_in_pr_metadata|main_head_sha_in_pr_metadata|github_actions_required_on_pushed_head/i,
      /not_applicable_before_pr_creation|pending_after|pending until GitHub Actions run|artifact pending/i,
      /local evidence collected before push|recorded in GitHub PR body after push/i,
      /raw advisory|raw audit|OSV raw|npm registry raw|npm audit --json|auditReportVersion/i,
      /dependency tree|stdout|stderr|stack trace|logs_url|jobs_url/i,
      /https?:\/\/\S+|postgres(?:ql)?:\/\/\S+|DATABASE_URL|POSTGRES_URL/i,
      /ghp_[a-z0-9_]+|sk-[a-z0-9_-]+|xoxb-[a-z0-9-]+|AKIA[0-9A-Z]+/i,
      /0x[0-9a-fA-F]{40}|PRIVATE KEY/i
    ];
    if (unsafePatterns.some((pattern) => pattern.test(value))) throw new Error(`unsafe evidence rejected at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeCanonicalValues(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const safePolicyKeys = new Set([
    "previousHeadConditions",
    "staleEvidencePolicy",
    "placeholderPolicy",
    "fakeArtifactPolicy"
  ]);
  for (const [key, child] of Object.entries(value)) {
    if (safePolicyKeys.has(key)) continue;
    if (/raw|secret|token|private|databaseUrl|connectionString|apiKey|clientSecret|accessToken|refreshToken/i.test(key)) {
      throw new Error(`unsafe key rejected at ${path}.${key}`);
    }
    assertNoUnsafeCanonicalValues(child, `${path}.${key}`);
  }
}

function assertExactSet(actual: readonly string[], expected: readonly string[], name: string) {
  if (actual.length !== expected.length) throw new Error(`${name} size mismatch`);
  for (const item of expected) {
    if (!actual.includes(item)) throw new Error(`${name} missing ${item}`);
  }
}
