export const dbIntegrationApprovalStatuses = ["not_approved", "approved", "rejected"] as const;

export type DbIntegrationApprovalStatus = typeof dbIntegrationApprovalStatuses[number];

export const dbIntegrationOwnerRoles = ["project-owner"] as const;

export type DbIntegrationOwnerRole = typeof dbIntegrationOwnerRoles[number];

export const allowedDbIntegrationRequestedScopes = [
  "db_integration_scope_gate",
  "owner_approval_record_schema",
  "db_driver_introduction_checklist",
  "live_db_integration_test_plan",
  "db_secret_boundary",
  "migration_apply_rollback_plan",
  "tests",
  "docs",
  "codex_evidence"
] as const;

export type DbIntegrationRequestedScope = typeof allowedDbIntegrationRequestedScopes[number];

export type DbIntegrationScopeGateRecord = {
  schema_version: string;
  harness_version: string;
  repository: string;
  target_branch: string;
  target_commit_sha: string;
  requested_scope: string[];
  approval_status: DbIntegrationApprovalStatus;
  owner_approval_required: boolean;
  owner_approved_by?: DbIntegrationOwnerRole | string | undefined;
  owner_approved_at?: string | undefined;
  owner_decided_by?: DbIntegrationOwnerRole | string | undefined;
  owner_decided_at?: string | undefined;
  db_driver_package?: string | undefined;
  db_driver_version_policy: string;
  package_change_allowed: boolean;
  pnpm_lock_change_allowed: boolean;
  real_db_connection_allowed: boolean;
  live_db_integration_tests_allowed: boolean;
  migration_apply_allowed: boolean;
  migration_rollback_plan_required: boolean;
  secret_manager_scope_required: boolean;
  db_credentials_storage_required: "secret_manager" | "not_allowed" | "not_selected";
  production_data_access_allowed: boolean;
  provider_sdk_apply_allowed: boolean;
  actual_production_deployment_allowed: boolean;
  runtime_readiness_claim_allowed: boolean;
  production_readiness_claim_allowed: boolean;
  legal_compliance_claim_allowed: boolean;
  youtube_policy_compliance_claim_allowed: boolean;
  created_at: string;
};

export function createDefaultDbIntegrationScopeGateRecord(input: {
  repository: string;
  targetBranch: string;
  targetCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
  requestedScope?: string[] | undefined;
}): DbIntegrationScopeGateRecord {
  return {
    schema_version: "1.0.0",
    harness_version: input.harnessVersion ?? "1.1.5",
    repository: input.repository,
    target_branch: input.targetBranch,
    target_commit_sha: input.targetCommitSha,
    requested_scope: input.requestedScope ?? ["db_integration_scope_gate"],
    approval_status: "not_approved",
    owner_approval_required: true,
    owner_approved_by: undefined,
    owner_approved_at: undefined,
    owner_decided_by: undefined,
    owner_decided_at: undefined,
    db_driver_package: undefined,
    db_driver_version_policy: "not_selected",
    package_change_allowed: false,
    pnpm_lock_change_allowed: false,
    real_db_connection_allowed: false,
    live_db_integration_tests_allowed: false,
    migration_apply_allowed: false,
    migration_rollback_plan_required: true,
    secret_manager_scope_required: false,
    db_credentials_storage_required: "not_allowed",
    production_data_access_allowed: false,
    provider_sdk_apply_allowed: false,
    actual_production_deployment_allowed: false,
    runtime_readiness_claim_allowed: false,
    production_readiness_claim_allowed: false,
    legal_compliance_claim_allowed: false,
    youtube_policy_compliance_claim_allowed: false,
    created_at: input.createdAt
  };
}

export function validateDbIntegrationScopeGateRecord(record: DbIntegrationScopeGateRecord) {
  if (!dbIntegrationApprovalStatuses.includes(record.approval_status)) throw new Error("DB integration approval_status is invalid");
  if (!record.owner_approval_required) throw new Error("DB integration owner approval must be required");
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("DB integration target_commit_sha must be a 40-character SHA");
  if (!record.repository) throw new Error("DB integration repository is required");
  if (!record.target_branch) throw new Error("DB integration target_branch is required");
  if (!Array.isArray(record.requested_scope) || record.requested_scope.length === 0) throw new Error("DB integration requested_scope is required");
  assertAllowedRequestedScopes(record.requested_scope);
  assertNoUnsafeDbIntegrationScopeGateEvidence(record);
  assertIsoUtc(record.created_at, "created_at");

  if (record.approval_status === "approved") {
    if (!record.owner_approved_by) throw new Error("approved DB integration scope requires owner_approved_by");
    if (!record.owner_approved_at) throw new Error("approved DB integration scope requires owner_approved_at");
    if (!dbIntegrationOwnerRoles.includes(record.owner_approved_by as DbIntegrationOwnerRole)) throw new Error("approved DB integration scope requires project-owner approval");
    assertIsoUtc(record.owner_approved_at, "owner_approved_at");
  }

  if (record.approval_status === "rejected") {
    if (!record.owner_decided_by) throw new Error("rejected DB integration scope requires owner_decided_by");
    if (!record.owner_decided_at) throw new Error("rejected DB integration scope requires owner_decided_at");
    if (!dbIntegrationOwnerRoles.includes(record.owner_decided_by as DbIntegrationOwnerRole)) throw new Error("rejected DB integration scope requires project-owner decision");
    assertIsoUtc(record.owner_decided_at, "owner_decided_at");
  }

  if (record.package_change_allowed && !record.db_driver_package) throw new Error("package change approval requires db_driver_package");
  if (record.pnpm_lock_change_allowed && !record.package_change_allowed) throw new Error("pnpm lock change requires package change approval");
  if (record.real_db_connection_allowed && !record.secret_manager_scope_required) throw new Error("real DB connection requires secret manager scope");
  if (record.live_db_integration_tests_allowed && !record.real_db_connection_allowed) throw new Error("live DB integration tests require real DB connection approval");
  if (record.migration_apply_allowed && !record.migration_rollback_plan_required) throw new Error("migration apply requires rollback plan");

  if (record.provider_sdk_apply_allowed) throw new Error("provider SDK apply is forbidden in this DB integration scope gate PR");
  if (record.actual_production_deployment_allowed) throw new Error("actual production deployment is forbidden in this DB integration scope gate PR");
  if (record.production_data_access_allowed) throw new Error("production data access is forbidden in this DB integration scope gate PR");
  if (record.runtime_readiness_claim_allowed) throw new Error("runtime readiness claim is forbidden in this DB integration scope gate PR");
  if (record.production_readiness_claim_allowed) throw new Error("production readiness claim is forbidden in this DB integration scope gate PR");
  if (record.legal_compliance_claim_allowed) throw new Error("legal compliance claim is forbidden in this DB integration scope gate PR");
  if (record.youtube_policy_compliance_claim_allowed) throw new Error("YouTube policy compliance claim is forbidden in this DB integration scope gate PR");
  return record;
}

export function assertNoUnsafeDbIntegrationScopeGateEvidence(value: unknown) {
  scanUnsafeEvidence(value);
}

function assertAllowedRequestedScopes(scopes: string[]) {
  for (const scope of scopes) {
    if (typeof scope !== "string" || !scope) throw new Error("DB integration requested_scope values must be non-empty strings");
    if (allowedDbIntegrationRequestedScopes.includes(scope as DbIntegrationRequestedScope)) continue;
    if (unsafeScopeValuePattern().test(scope)) throw new Error(`DB integration requested_scope contains unsafe value: ${scope}`);
    throw new Error(`DB integration requested_scope is not allowed: ${scope}`);
  }
}

function assertIsoUtc(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(`${label} must be an ISO UTC timestamp`);
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${label} must be parseable`);
}

function scanUnsafeEvidence(value: unknown, path: string[] = []) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeEvidence(item, path.concat(String(index))));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (forbiddenUnsafeEvidenceKeyPattern().test(key)) {
        throw new Error(`DB integration scope gate evidence contains unsafe key: ${path.concat(key).join(".")}`);
      }
      scanUnsafeEvidence(nestedValue, path.concat(key));
    }
    return;
  }
  if (typeof value === "string" && unsafeEvidenceValuePattern().test(value)) {
    throw new Error("DB integration scope gate evidence contains unsafe secret, raw data, private URL, wallet, or raw log reference");
  }
}

function forbiddenUnsafeEvidenceKeyPattern() {
  return /^(secretValue|apiKey|apiKeyValue|refreshToken|refreshTokenValue|accessToken|accessTokenValue|connectionString|databaseUrl|postgresUrl|dbPassword|password|clientSecret|rawProviderResponse|rawDbConnectionString|githubRawLogs)$/i;
}

function unsafeScopeValuePattern() {
  return /\s|Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|api[_-]?key|oauth|token|secret|private[_ -]?url|raw[_ -]?provider|raw[_ -]?db|raw logs?|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree/i;
}

function unsafeEvidenceValuePattern() {
  return /Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree/i;
}
