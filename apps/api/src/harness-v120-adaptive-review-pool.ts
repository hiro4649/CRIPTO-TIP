export const modelTierRoutingProfiles = ["V120_TOKEN_AWARE_MODEL_TIER_ROUTING"] as const;
export const typedBlockerProfiles = ["V120_TYPED_BLOCKERS"] as const;
export const reviewPoolProfiles = ["V120_REVIEW_POOL_POLICY"] as const;
export const escalationHysteresisProfiles = ["V120_ESCALATION_HYSTERESIS"] as const;
export const highTierRepairPlanningProfiles = ["V120_HIGH_TIER_REPAIR_PLANNING"] as const;
export const forbiddenScopeProfiles = ["CRIPTO_TIP_SAFETY_CORE_V1"] as const;
export const verificationProfiles = ["PRODUCT_R3_FULL_V1"] as const;
export const evidenceProfiles = ["CANONICAL_PREVIOUS_HEAD_PLUS_CURRENT_ARTIFACT_V1"] as const;
export const mergeReadinessProfiles = ["SAME_HEAD_CLEAN_REQUIRED_V1"] as const;

export type ModelTierRoutingProfile = (typeof modelTierRoutingProfiles)[number];
export type TypedBlockerProfile = (typeof typedBlockerProfiles)[number];
export type ReviewPoolProfile = (typeof reviewPoolProfiles)[number];
export type EscalationHysteresisProfile = (typeof escalationHysteresisProfiles)[number];
export type HighTierRepairPlanningProfile = (typeof highTierRepairPlanningProfiles)[number];
export type ForbiddenScopeProfile = (typeof forbiddenScopeProfiles)[number];
export type VerificationProfile = (typeof verificationProfiles)[number];
export type EvidenceProfile = (typeof evidenceProfiles)[number];
export type MergeReadinessProfile = (typeof mergeReadinessProfiles)[number];

export interface HarnessV120AdaptiveReviewPoolRecord {
  schemaVersion: "1.0.0";
  harnessVersion: "1.2.0";
  repository: "hiro4649/CRIPTO-TIP";
  profileStatus: "profile_ready" | "not_ready";
  sourceOfRecordStatus: "aligned" | "stale" | "not_aligned";
  modelTierRoutingStatus: "policy_ready" | "not_ready";
  typedBlockerStatus: "policy_ready" | "not_ready";
  reviewPoolPolicyStatus: "policy_ready" | "not_ready";
  escalationHysteresisStatus: "policy_ready" | "not_ready";
  highTierRepairPlanningStatus: "policy_ready" | "not_ready";
  modelTierRoutingProfile: ModelTierRoutingProfile;
  typedBlockerProfile: TypedBlockerProfile;
  reviewPoolProfile: ReviewPoolProfile;
  escalationHysteresisProfile: EscalationHysteresisProfile;
  highTierRepairPlanningProfile: HighTierRepairPlanningProfile;
  forbiddenScopeProfile: ForbiddenScopeProfile;
  verificationProfile: VerificationProfile;
  evidenceProfile: EvidenceProfile;
  mergeReadinessProfile: MergeReadinessProfile;
  safetyReduction: boolean;
  qualityGateWeakening: boolean;
  mergeAuthorityCreated: boolean;
  ownerApprovalCreated: boolean;
  githubApprovalReviewCreated: boolean;
  selectedDriver: null | string;
  dbDriverDependencyAllowed: boolean;
  packageJsonChangeAllowed: boolean;
  pnpmLockChangeAllowed: boolean;
  realDbConnectionAllowed: boolean;
  runtimeReadinessClaimAllowed: boolean;
  productionReadinessClaimAllowed: boolean;
  legalComplianceClaimAllowed: boolean;
  youtubePolicyComplianceClaimAllowed: boolean;
  rawGitHubLogsAllowed?: boolean;
  rawAdvisoryOutputAllowed?: boolean;
}

export const typedBlockers = [
  "stale_evidence",
  "forbidden_scope",
  "missing_same_head_checks",
  "unsafe_output",
  "package_lock_change_forbidden",
  "runtime_readiness_claim_forbidden",
  "owner_approval_required",
  "raw_log_forbidden"
] as const;

export function createDefaultHarnessV120AdaptiveReviewPoolRecord(): HarnessV120AdaptiveReviewPoolRecord {
  return {
    schemaVersion: "1.0.0",
    harnessVersion: "1.2.0",
    repository: "hiro4649/CRIPTO-TIP",
    profileStatus: "profile_ready",
    sourceOfRecordStatus: "aligned",
    modelTierRoutingStatus: "policy_ready",
    typedBlockerStatus: "policy_ready",
    reviewPoolPolicyStatus: "policy_ready",
    escalationHysteresisStatus: "policy_ready",
    highTierRepairPlanningStatus: "policy_ready",
    modelTierRoutingProfile: "V120_TOKEN_AWARE_MODEL_TIER_ROUTING",
    typedBlockerProfile: "V120_TYPED_BLOCKERS",
    reviewPoolProfile: "V120_REVIEW_POOL_POLICY",
    escalationHysteresisProfile: "V120_ESCALATION_HYSTERESIS",
    highTierRepairPlanningProfile: "V120_HIGH_TIER_REPAIR_PLANNING",
    forbiddenScopeProfile: "CRIPTO_TIP_SAFETY_CORE_V1",
    verificationProfile: "PRODUCT_R3_FULL_V1",
    evidenceProfile: "CANONICAL_PREVIOUS_HEAD_PLUS_CURRENT_ARTIFACT_V1",
    mergeReadinessProfile: "SAME_HEAD_CLEAN_REQUIRED_V1",
    safetyReduction: false,
    qualityGateWeakening: false,
    mergeAuthorityCreated: false,
    ownerApprovalCreated: false,
    githubApprovalReviewCreated: false,
    selectedDriver: null,
    dbDriverDependencyAllowed: false,
    packageJsonChangeAllowed: false,
    pnpmLockChangeAllowed: false,
    realDbConnectionAllowed: false,
    runtimeReadinessClaimAllowed: false,
    productionReadinessClaimAllowed: false,
    legalComplianceClaimAllowed: false,
    youtubePolicyComplianceClaimAllowed: false,
    rawGitHubLogsAllowed: false,
    rawAdvisoryOutputAllowed: false
  };
}

export function validateHarnessV120AdaptiveReviewPoolRecord(
  record: HarnessV120AdaptiveReviewPoolRecord
): HarnessV120AdaptiveReviewPoolRecord {
  if (record.schemaVersion !== "1.0.0") throw new Error("schemaVersion must be 1.0.0");
  if (record.harnessVersion !== "1.2.0") throw new Error("harnessVersion must be 1.2.0");
  if (record.repository !== "hiro4649/CRIPTO-TIP") throw new Error("repository mismatch");
  if (record.profileStatus !== "profile_ready") throw new Error("profileStatus must be profile_ready");
  if (record.sourceOfRecordStatus !== "aligned") throw new Error("sourceOfRecordStatus must be aligned");
  assertPolicyReady(record.modelTierRoutingStatus, "modelTierRoutingStatus");
  assertPolicyReady(record.typedBlockerStatus, "typedBlockerStatus");
  assertPolicyReady(record.reviewPoolPolicyStatus, "reviewPoolPolicyStatus");
  assertPolicyReady(record.escalationHysteresisStatus, "escalationHysteresisStatus");
  assertPolicyReady(record.highTierRepairPlanningStatus, "highTierRepairPlanningStatus");
  assertKnown(record.modelTierRoutingProfile, modelTierRoutingProfiles, "modelTierRoutingProfile");
  assertKnown(record.typedBlockerProfile, typedBlockerProfiles, "typedBlockerProfile");
  assertKnown(record.reviewPoolProfile, reviewPoolProfiles, "reviewPoolProfile");
  assertKnown(record.escalationHysteresisProfile, escalationHysteresisProfiles, "escalationHysteresisProfile");
  assertKnown(record.highTierRepairPlanningProfile, highTierRepairPlanningProfiles, "highTierRepairPlanningProfile");
  assertKnown(record.forbiddenScopeProfile, forbiddenScopeProfiles, "forbiddenScopeProfile");
  assertKnown(record.verificationProfile, verificationProfiles, "verificationProfile");
  assertKnown(record.evidenceProfile, evidenceProfiles, "evidenceProfile");
  assertKnown(record.mergeReadinessProfile, mergeReadinessProfiles, "mergeReadinessProfile");
  assertNoForbiddenAuthorityOrScope(record);
  return record;
}

function assertPolicyReady(value: string, label: string) {
  if (value !== "policy_ready") throw new Error(`${label} must be policy_ready`);
}

function assertNoForbiddenAuthorityOrScope(record: HarnessV120AdaptiveReviewPoolRecord) {
  const forbiddenTrueFlags = [
    "safetyReduction",
    "qualityGateWeakening",
    "mergeAuthorityCreated",
    "ownerApprovalCreated",
    "githubApprovalReviewCreated",
    "packageJsonChangeAllowed",
    "pnpmLockChangeAllowed",
    "dbDriverDependencyAllowed",
    "realDbConnectionAllowed",
    "runtimeReadinessClaimAllowed",
    "productionReadinessClaimAllowed",
    "legalComplianceClaimAllowed",
    "youtubePolicyComplianceClaimAllowed",
    "rawGitHubLogsAllowed",
    "rawAdvisoryOutputAllowed"
  ] as const;
  for (const flag of forbiddenTrueFlags) {
    if (record[flag]) throw new Error(`${flag} true is forbidden`);
  }
  if (record.selectedDriver !== null) throw new Error("selected driver forbidden");
}

function assertKnown<T extends string>(value: string, allowed: readonly T[], label: string): asserts value is T {
  if (!allowed.includes(value as T)) throw new Error(`unknown ${label}`);
}
