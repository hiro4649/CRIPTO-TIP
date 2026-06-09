import { createHash } from "node:crypto";

export const dbDriverOwnerApprovalStatuses = ["absent", "not_approved", "approved", "rejected", "expired"] as const;

export type DbDriverOwnerApprovalStatus = typeof dbDriverOwnerApprovalStatuses[number];

export const dbDriverOwnerRoles = ["project-owner"] as const;

export type DbDriverOwnerRole = typeof dbDriverOwnerRoles[number];

export const allowedDbDriverApprovalScopes = [
  "db_driver_dependency_introduction",
  "package_change_for_db_driver",
  "pnpm_lock_change_for_db_driver",
  "live_db_integration_test_plan",
  "migration_apply_plan",
  "db_secret_manager_scope"
] as const;

export type DbDriverApprovalScope = typeof allowedDbDriverApprovalScopes[number];

export type DbDriverOwnerApprovalRecord = {
  schema_version: string;
  harness_version: string;
  repository: string;
  pr_number: number;
  target_branch: string;
  target_commit_sha: string;
  base_commit_sha: string;
  approval_id: string;
  approval_status: DbDriverOwnerApprovalStatus;
  approval_scope: string[];
  approved_by_role?: DbDriverOwnerRole | string | undefined;
  approved_by_actor?: string | undefined;
  approved_at?: string | undefined;
  expires_at?: string | undefined;
  driver_package?: string | undefined;
  driver_version_policy: string;
  package_change_allowed: boolean;
  pnpm_lock_change_allowed: boolean;
  real_db_connection_allowed: boolean;
  live_db_integration_tests_allowed: boolean;
  migration_apply_allowed: boolean;
  secret_manager_scope_required: boolean;
  db_credentials_storage_required: "secret_manager" | "not_allowed" | "not_selected";
  provider_sdk_apply_allowed: boolean;
  actual_production_deployment_allowed: boolean;
  runtime_readiness_claim_allowed: boolean;
  production_readiness_claim_allowed: boolean;
  legal_compliance_claim_allowed: boolean;
  youtube_policy_compliance_claim_allowed: boolean;
  approval_fingerprint?: string | undefined;
  created_at: string;
};

export type DbDriverOwnerApprovalContext = {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha?: string | undefined;
  now?: string | Date | undefined;
};

export function createDefaultDbDriverOwnerApprovalRecord(input: {
  repository: string;
  prNumber: number;
  targetBranch: string;
  targetCommitSha: string;
  baseCommitSha: string;
  createdAt: string;
  harnessVersion?: string | undefined;
}): DbDriverOwnerApprovalRecord {
  return {
    schema_version: "1.0.0",
    harness_version: input.harnessVersion ?? "1.1.5",
    repository: input.repository,
    pr_number: input.prNumber,
    target_branch: input.targetBranch,
    target_commit_sha: input.targetCommitSha,
    base_commit_sha: input.baseCommitSha,
    approval_id: "not_approved",
    approval_status: "not_approved",
    approval_scope: [],
    approved_by_role: undefined,
    approved_by_actor: undefined,
    approved_at: undefined,
    expires_at: undefined,
    driver_package: undefined,
    driver_version_policy: "not_selected",
    package_change_allowed: false,
    pnpm_lock_change_allowed: false,
    real_db_connection_allowed: false,
    live_db_integration_tests_allowed: false,
    migration_apply_allowed: false,
    secret_manager_scope_required: false,
    db_credentials_storage_required: "not_allowed",
    provider_sdk_apply_allowed: false,
    actual_production_deployment_allowed: false,
    runtime_readiness_claim_allowed: false,
    production_readiness_claim_allowed: false,
    legal_compliance_claim_allowed: false,
    youtube_policy_compliance_claim_allowed: false,
    approval_fingerprint: undefined,
    created_at: input.createdAt
  };
}

export function validateDbDriverOwnerApprovalRecord(record: DbDriverOwnerApprovalRecord, context?: DbDriverOwnerApprovalContext) {
  assertNoUnsafeDbDriverOwnerApprovalEvidence(record);
  if (!dbDriverOwnerApprovalStatuses.includes(record.approval_status)) throw new Error("DB driver owner approval_status is invalid");
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("DB driver approval repository must be hiro4649/CRIPTO-TIP");
  if (!Number.isInteger(record.pr_number) || record.pr_number <= 0) throw new Error("DB driver approval pr_number is required");
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("DB driver approval target_commit_sha must be a 40-character SHA");
  if (!/^[0-9a-f]{40}$/i.test(record.base_commit_sha)) throw new Error("DB driver approval base_commit_sha must be a 40-character SHA");
  if (!record.target_branch) throw new Error("DB driver approval target_branch is required");
  if (!record.approval_id) throw new Error("DB driver approval_id is required");
  if (!Array.isArray(record.approval_scope)) throw new Error("DB driver approval_scope must be an array");
  assertIsoUtc(record.created_at, "created_at");
  assertAllowedApprovalScopes(record.approval_scope);
  assertContextBinding(record, context);
  assertForbiddenCapabilitiesRemainFalse(record);

  if (record.driver_package && !record.package_change_allowed) throw new Error("driver_package requires package_change_allowed");
  if (record.package_change_allowed && !record.driver_package) throw new Error("package change approval requires driver_package");
  if (record.driver_package && record.driver_version_policy === "not_selected") throw new Error("driver package requires explicit driver_version_policy");
  if (record.pnpm_lock_change_allowed && !record.package_change_allowed) throw new Error("pnpm lock change requires package change approval");
  if (record.real_db_connection_allowed && !record.secret_manager_scope_required) throw new Error("real DB connection requires secret manager scope");
  if (record.real_db_connection_allowed && record.db_credentials_storage_required !== "secret_manager") throw new Error("real DB connection requires secret_manager credential storage");
  if (record.live_db_integration_tests_allowed && !record.real_db_connection_allowed) throw new Error("live DB integration requires real DB connection approval");
  if (record.migration_apply_allowed && !record.approval_scope.includes("migration_apply_plan")) throw new Error("migration apply requires rollback plan approval scope");

  if (record.approval_status === "approved") {
    assertApprovedRecord(record, context);
  }

  if (record.approval_status === "expired") {
    if (!record.expires_at) throw new Error("expired DB driver approval requires expires_at");
    assertIsoUtc(record.expires_at, "expires_at");
  }

  return record;
}

export function computeDbDriverOwnerApprovalFingerprint(record: DbDriverOwnerApprovalRecord) {
  const canonical = canonicalizeApprovalRecord(record);
  return createHash("sha256").update(canonical).digest("hex");
}

export function canonicalizeApprovalRecord(record: DbDriverOwnerApprovalRecord) {
  const withoutFingerprint = Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "approval_fingerprint")
  );
  return stableStringify(withoutFingerprint);
}

function assertApprovedRecord(record: DbDriverOwnerApprovalRecord, context?: DbDriverOwnerApprovalContext) {
  if (record.approved_by_role !== "project-owner") throw new Error("approved DB driver approval requires project-owner role");
  if (!record.approved_by_actor) throw new Error("approved DB driver approval requires approved_by_actor");
  if (unsafeApproverActorPattern().test(record.approved_by_actor)) throw new Error("AI, bot, assistant, codex, github-actions, or unknown actor cannot approve DB driver scope");
  if (!record.approved_at) throw new Error("approved DB driver approval requires approved_at");
  if (!record.expires_at) throw new Error("approved DB driver approval requires expires_at");
  assertIsoUtc(record.approved_at, "approved_at");
  assertIsoUtc(record.expires_at, "expires_at");
  const approvedAt = new Date(record.approved_at);
  const expiresAt = new Date(record.expires_at);
  if (expiresAt.getTime() <= approvedAt.getTime()) throw new Error("expires_at must be after approved_at");
  if (expiresAt.getTime() - approvedAt.getTime() > 72 * 60 * 60 * 1000) throw new Error("DB driver owner approval expires_at must be within 72 hours");
  const now = context?.now ? new Date(context.now) : new Date();
  if (expiresAt.getTime() <= now.getTime()) throw new Error("DB driver owner approval is expired");
  if (!record.approval_scope.length) throw new Error("approved DB driver approval requires approval_scope");
  if (!record.approval_fingerprint) throw new Error("approved DB driver approval requires approval_fingerprint");
  const expected = computeDbDriverOwnerApprovalFingerprint({ ...record, approval_fingerprint: undefined });
  if (record.approval_fingerprint !== expected) throw new Error("DB driver owner approval fingerprint mismatch");
}

function assertContextBinding(record: DbDriverOwnerApprovalRecord, context?: DbDriverOwnerApprovalContext) {
  if (!context) return;
  if (record.repository !== context.repository) throw new Error("DB driver approval repository binding mismatch");
  if (record.pr_number !== context.prNumber) throw new Error("DB driver approval PR number binding mismatch");
  if (record.target_branch !== context.targetBranch) throw new Error("DB driver approval branch binding mismatch");
  if (record.target_commit_sha !== context.targetCommitSha) throw new Error("DB driver approval target commit binding mismatch");
  if (context.baseCommitSha && record.base_commit_sha !== context.baseCommitSha) throw new Error("DB driver approval base commit binding mismatch");
}

function assertAllowedApprovalScopes(scopes: string[]) {
  for (const scope of scopes) {
    if (typeof scope !== "string" || !scope) throw new Error("DB driver approval_scope values must be non-empty strings");
    if (allowedDbDriverApprovalScopes.includes(scope as DbDriverApprovalScope)) continue;
    if (unsafeApprovalScopePattern().test(scope)) throw new Error(`DB driver approval_scope contains forbidden or unsafe value: ${scope}`);
    throw new Error(`DB driver approval_scope is not allowed: ${scope}`);
  }
}

function assertForbiddenCapabilitiesRemainFalse(record: DbDriverOwnerApprovalRecord) {
  if (record.provider_sdk_apply_allowed) throw new Error("provider SDK apply remains forbidden");
  if (record.actual_production_deployment_allowed) throw new Error("actual production deployment remains forbidden");
  if (record.runtime_readiness_claim_allowed) throw new Error("runtime readiness claim remains forbidden");
  if (record.production_readiness_claim_allowed) throw new Error("production readiness claim remains forbidden");
  if (record.legal_compliance_claim_allowed) throw new Error("legal compliance claim remains forbidden");
  if (record.youtube_policy_compliance_claim_allowed) throw new Error("YouTube policy compliance claim remains forbidden");
}

export function assertNoUnsafeDbDriverOwnerApprovalEvidence(value: unknown) {
  scanUnsafeEvidence(value);
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
        throw new Error(`DB driver owner approval evidence contains unsafe key: ${path.concat(key).join(".")}`);
      }
      scanUnsafeEvidence(nestedValue, path.concat(key));
    }
    return;
  }
  if (typeof value === "string" && unsafeEvidenceValuePattern().test(value)) {
    throw new Error("DB driver owner approval evidence contains unsafe secret, raw data, private URL, wallet, or raw log reference");
  }
}

function assertIsoUtc(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(`${label} must be ISO UTC`);
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${label} must be parseable`);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

function unsafeApproverActorPattern() {
  return /^(ai|ai-reviewer|assistant|codex|bot|github-actions|unknown)$|bot$|github-actions/i;
}

function forbiddenUnsafeEvidenceKeyPattern() {
  return /^(secretValue|apiKey|apiKeyValue|refreshToken|refreshTokenValue|accessToken|accessTokenValue|connectionString|databaseUrl|postgresUrl|dbPassword|password|clientSecret|rawProviderResponse|rawDbConnectionString|githubRawLogs)$/i;
}

function unsafeApprovalScopePattern() {
  return /\s|Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|api[_-]?key|oauth|token|secret|private[_ -]?url|raw[_ -]?provider|raw[_ -]?db|raw logs?|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree|real_provider_sdk_apply|actual_production_deployment|runtime_readiness_claim|production_readiness_claim|legal_compliance_claim|youtube_policy_compliance_claim|token_sale|token_exchange|cash_out|custody|internal_balance|investment_wording|youtube_scraping|wallet_rpc_deploy_change|youtube_connector_change|chain_listener_change/i;
}

function unsafeEvidenceValuePattern() {
  return /Bearer\s+|https?:\/\/|postgres(?:ql)?:\/\/|DATABASE_URL|POSTGRES_URL|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|gh run view --log|logs_url|stdout|stderr|stack[_ -]?trace|file_contents|dependency_tree|raw[_ -]?provider[_ -]?response/i;
}
