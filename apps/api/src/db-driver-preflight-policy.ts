export const dbDriverChoiceStatuses = ["not_selected", "selected"] as const;

export type DbDriverChoiceStatus = typeof dbDriverChoiceStatuses[number];

export const allowedDbDriverCandidates = ["pg", "postgres"] as const;

export type DbDriverCandidate = typeof allowedDbDriverCandidates[number];

export const dbDriverRecommendedStatuses = [
  "candidate",
  "rejected_future_review",
  "needs_owner_review",
  "not_selected"
] as const;

export type DbDriverRecommendedStatus = typeof dbDriverRecommendedStatuses[number];

export type DbDriverCandidateEvaluation = {
  driver_name: string;
  npm_package_name: string;
  license: string;
  maintenance_status: string;
  security_advisory_status: string;
  transitive_dependency_count: number | "not_reviewed";
  typescript_support: string;
  pooling_support: string;
  transaction_support: string;
  parameterized_query_support: string;
  ssl_support: string;
  timeout_support: string;
  cancellation_support: string;
  observability_support: string;
  supply_chain_risk: string;
  license_risk: string;
  operational_risk: string;
  recommended_status: DbDriverRecommendedStatus;
};

export type DbDriverPreflightPolicyRecord = {
  schema_version: string;
  harness_version: string;
  repository: string;
  target_branch: string;
  target_commit_sha: string;
  base_commit_sha: string;
  pr_number: number;
  driver_choice_status: DbDriverChoiceStatus;
  candidate_drivers: string[];
  selected_driver: string | null;
  owner_approval_record_required: boolean;
  owner_approval_record_status: "not_approved" | "approved" | "absent" | "rejected" | "expired";
  package_change_allowed: boolean;
  pnpm_lock_change_allowed: boolean;
  real_db_connection_allowed: boolean;
  live_db_integration_tests_allowed: boolean;
  migration_apply_allowed: boolean;
  provider_sdk_apply_allowed: boolean;
  actual_production_deployment_allowed: boolean;
  runtime_readiness_claim_allowed: boolean;
  production_readiness_claim_allowed: boolean;
  license_review_required: boolean;
  supply_chain_review_required: boolean;
  security_advisory_review_required: boolean;
  version_pinning_required: boolean;
  lockfile_review_required: boolean;
  package_diff_review_required: boolean;
  secret_manager_review_required: boolean;
  created_at: string;
  candidate_evaluations?: DbDriverCandidateEvaluation[] | undefined;
};

export type DbDriverPreflightPolicyContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha?: string | undefined;
};

export function createDefaultDbDriverPreflightPolicyRecord(input: {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
}): DbDriverPreflightPolicyRecord {
  return {
    schema_version: "1.0.0",
    harness_version: input.harnessVersion ?? "1.1.5",
    repository: input.repository,
    target_branch: input.targetBranch,
    target_commit_sha: input.targetCommitSha,
    base_commit_sha: input.baseCommitSha,
    pr_number: input.prNumber,
    driver_choice_status: "not_selected",
    candidate_drivers: [...allowedDbDriverCandidates],
    selected_driver: null,
    owner_approval_record_required: true,
    owner_approval_record_status: "not_approved",
    package_change_allowed: false,
    pnpm_lock_change_allowed: false,
    real_db_connection_allowed: false,
    live_db_integration_tests_allowed: false,
    migration_apply_allowed: false,
    provider_sdk_apply_allowed: false,
    actual_production_deployment_allowed: false,
    runtime_readiness_claim_allowed: false,
    production_readiness_claim_allowed: false,
    license_review_required: true,
    supply_chain_review_required: true,
    security_advisory_review_required: true,
    version_pinning_required: true,
    lockfile_review_required: true,
    package_diff_review_required: true,
    secret_manager_review_required: true,
    created_at: input.createdAt,
    candidate_evaluations: [
      createCandidateEvaluation("pg"),
      createCandidateEvaluation("postgres")
    ]
  };
}

export function validateDbDriverPreflightPolicyRecord(
  record: DbDriverPreflightPolicyRecord,
  context?: DbDriverPreflightPolicyContext
) {
  assertNoUnsafeDbDriverPreflightEvidence(record);
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver preflight repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.pr_number) || record.pr_number <= 0) throw new Error("DB driver preflight pr_number is required");
  if (!record.target_branch) throw new Error("DB driver preflight target_branch is required");
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("DB driver preflight target_commit_sha must be a 40-character SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.base_commit_sha)) throw new Error("DB driver preflight base_commit_sha must be a 40-character SHA");
  assertIsoUtc(record.created_at, "created_at");
  assertContextBinding(record, context);
  if (!dbDriverChoiceStatuses.includes(record.driver_choice_status)) throw new Error("DB driver choice status is invalid");
  assertAllowedCandidateDrivers(record.candidate_drivers);
  assertCandidateEvaluations(record);

  if (record.selected_driver !== null && record.driver_choice_status !== "selected") {
    throw new Error("selected_driver requires driver_choice_status selected");
  }
  if (record.driver_choice_status === "selected" && record.owner_approval_record_status !== "approved") {
    throw new Error("driver_choice_status selected requires approved owner approval record");
  }
  if (record.selected_driver && !record.candidate_drivers.includes(record.selected_driver)) {
    throw new Error("selected_driver must be listed in candidate_drivers");
  }
  if (!record.owner_approval_record_required) throw new Error("DB driver preflight requires owner approval record");
  assertReviewRequirements(record);
  assertForbiddenPreflightCapabilitiesRemainFalse(record);
  return record;
}

export function createCandidateEvaluation(candidate: DbDriverCandidate): DbDriverCandidateEvaluation {
  return {
    driver_name: candidate,
    npm_package_name: candidate,
    license: "future_review_required",
    maintenance_status: "future_review_required",
    security_advisory_status: "future_review_required",
    transitive_dependency_count: "not_reviewed",
    typescript_support: "future_review_required",
    pooling_support: "future_review_required",
    transaction_support: "future_review_required",
    parameterized_query_support: "future_review_required",
    ssl_support: "future_review_required",
    timeout_support: "future_review_required",
    cancellation_support: "future_review_required",
    observability_support: "future_review_required",
    supply_chain_risk: "future_review_required",
    license_risk: "future_review_required",
    operational_risk: "future_review_required",
    recommended_status: "needs_owner_review"
  };
}

export function assertNoUnsafeDbDriverPreflightEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function assertAllowedCandidateDrivers(candidates: string[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error("candidate_drivers must include allowed candidates");
  const unique = new Set<string>();
  for (const candidate of candidates) {
    if (!allowedDbDriverCandidates.includes(candidate as DbDriverCandidate)) throw new Error(`unknown DB driver candidate: ${candidate}`);
    unique.add(candidate);
  }
  if (unique.size !== candidates.length) throw new Error("candidate_drivers must not contain duplicates");
}

function assertCandidateEvaluations(record: DbDriverPreflightPolicyRecord) {
  if (!record.candidate_evaluations) return;
  for (const evaluation of record.candidate_evaluations) {
    if (!allowedDbDriverCandidates.includes(evaluation.driver_name as DbDriverCandidate)) throw new Error(`unknown DB driver evaluation candidate: ${evaluation.driver_name}`);
    if (evaluation.driver_name !== evaluation.npm_package_name) throw new Error("candidate evaluation package must match allowed driver name");
    if (!dbDriverRecommendedStatuses.includes(evaluation.recommended_status)) throw new Error("candidate evaluation recommended_status is invalid");
    if (evaluation.recommended_status === "candidate") throw new Error("this PR cannot mark a driver as a final candidate");
  }
}

function assertReviewRequirements(record: DbDriverPreflightPolicyRecord) {
  if (!record.license_review_required) throw new Error("license review is required before DB driver introduction");
  if (!record.supply_chain_review_required) throw new Error("supply-chain review is required before DB driver introduction");
  if (!record.security_advisory_review_required) throw new Error("security advisory review is required before DB driver introduction");
  if (!record.version_pinning_required) throw new Error("version pinning review is required before DB driver introduction");
  if (!record.lockfile_review_required) throw new Error("lockfile review is required before DB driver introduction");
  if (!record.package_diff_review_required) throw new Error("package diff review is required before DB driver introduction");
  if (!record.secret_manager_review_required) throw new Error("secret manager review is required before real DB connection");
}

function assertForbiddenPreflightCapabilitiesRemainFalse(record: DbDriverPreflightPolicyRecord) {
  if (record.package_change_allowed) throw new Error("package changes remain forbidden in DB driver preflight PR");
  if (record.pnpm_lock_change_allowed) throw new Error("pnpm-lock changes remain forbidden in DB driver preflight PR");
  if (record.real_db_connection_allowed) throw new Error("real DB connections remain forbidden in DB driver preflight PR");
  if (record.live_db_integration_tests_allowed) throw new Error("live DB integration tests remain forbidden in DB driver preflight PR");
  if (record.migration_apply_allowed) throw new Error("migration apply remains forbidden in DB driver preflight PR");
  if (record.provider_sdk_apply_allowed) throw new Error("provider SDK apply remains forbidden");
  if (record.actual_production_deployment_allowed) throw new Error("actual production deployment remains forbidden");
  if (record.runtime_readiness_claim_allowed) throw new Error("runtime readiness claim remains forbidden");
  if (record.production_readiness_claim_allowed) throw new Error("production readiness claim remains forbidden");
}

function assertContextBinding(record: DbDriverPreflightPolicyRecord, context?: DbDriverPreflightPolicyContext) {
  if (!context) return;
  if (record.repository !== context.repository) throw new Error("DB driver preflight repository binding mismatch");
  if (record.pr_number !== context.prNumber) throw new Error("DB driver preflight PR number binding mismatch");
  if (record.target_branch !== context.targetBranch) throw new Error("DB driver preflight branch binding mismatch");
  if (record.target_commit_sha !== context.targetCommitSha) throw new Error("DB driver preflight target commit binding mismatch");
  if (context.baseCommitSha && record.base_commit_sha !== context.baseCommitSha) throw new Error("DB driver preflight base commit binding mismatch");
}

function scanUnsafeEvidence(value: unknown, path: string[] = []) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeEvidence(item, path.concat(String(index))));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (unsafeEvidenceKeyPattern().test(key)) throw new Error(`DB driver preflight evidence contains unsafe key: ${path.concat(key).join(".")}`);
      scanUnsafeEvidence(nestedValue, path.concat(key));
    }
    return;
  }
  if (typeof value === "string" && unsafeEvidenceValuePattern().test(value)) {
    throw new Error("DB driver preflight evidence contains unsafe secret, raw data, private URL, wallet, DB connection, or raw log reference");
  }
}

function assertIsoUtc(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(`${label} must be ISO UTC`);
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${label} must be parseable`);
}

function unsafeEvidenceKeyPattern() {
  return /^(password|dbPassword|clientSecret|client_secret|apiKey|api_key|api-key|refreshToken|refresh_token|accessToken|access_token|secretValue|secret_value|connectionString|connection_string|databaseUrl|database_url|postgresUrl|postgres_url|rawProviderResponse|githubRawLogs)$/i;
}

function unsafeEvidenceValuePattern() {
  return /Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|PRIVATE KEY|BEGIN PRIVATE KEY|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree|raw[_ -]?provider[_ -]?response/i;
}
