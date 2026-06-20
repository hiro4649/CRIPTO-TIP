import { createHash } from "node:crypto";
import { z } from "zod";

const SideEffectContractSchema = z.object({
  affinity: z.literal(false),
  reaction: z.literal(false),
  overlay: z.literal(false),
  externalOutbox: z.literal(false),
  irisCore: z.literal(false),
  voxweave: z.literal(false),
  tts: z.literal(false),
  live2d: z.literal(false),
  obs: z.literal(false),
  wallet: z.literal(false),
  chain: z.literal(false),
  productionData: z.literal(false)
}).strict();

const FirstCanaryLimitsSchema = z.object({
  testChannels: z.literal(1),
  testLiveStreams: z.literal(1),
  mode: z.literal("list_only"),
  maxResults: z.number().int().positive().max(200),
  maximumApiCalls: z.number().int().positive().max(3),
  maximumDurationSeconds: z.number().int().positive().max(60),
  automaticFallback: z.literal(false),
  automaticRetry: z.literal(false),
  safeParsePreviewOnly: z.literal(true),
  supportSideEffects: z.literal(false),
  sideEffects: SideEffectContractSchema
}).strict();

export const YouTubeCanaryAuthorizationBundleSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  bundleStatus: z.enum(["awaiting_owner_authorization", "owner_inputs_recorded"]),
  transport: z.literal("direct_rest_fetch"),
  initialMode: z.literal("list_only"),
  streamList: z.literal("disabled_for_first_canary"),
  networkAuthorization: z.enum(["absent", "owner_authorization_recorded"]),
  credentialProvider: z.enum(["unselected", "opaque_interface_ready"]),
  clientIdRef: z.enum(["absent", "opaque_ref_recorded"]),
  clientSecretRef: z.enum(["absent", "opaque_ref_recorded"]),
  refreshTokenRef: z.enum(["absent", "opaque_ref_recorded"]),
  redirectUri: z.enum(["unconfirmed", "confirmed"]),
  testChannel: z.enum(["unselected", "selected_test_only"]),
  testLiveStream: z.enum(["unselected", "selected_test_only"]),
  quotaBudget: z.enum(["unconfirmed", "confirmed_within_first_canary_limits"]),
  privacyReview: z.enum(["incomplete", "pass"]),
  dataDeletionReview: z.enum(["incomplete", "pass"]),
  revocationRunbook: z.enum(["missing", "documented"]),
  killSwitch: z.enum(["blocked", "armed_for_controlled_canary"]),
  firstCanaryLimits: FirstCanaryLimitsSchema,
  networkExecution: z.literal(false),
  oauthExecution: z.literal(false),
  secretAccess: z.literal(false),
  realYouTubeApiUsed: z.literal(false)
}).strict();

export const YouTubeCanaryAuthorizationEvidenceSchema = z.object({
  schemaVersion: z.literal("1.1.0"),
  harnessVersion: z.literal("1.2.7"),
  repository: z.literal("hiro4649/CRIPTO-TIP"),
  phase: z.literal("p1-youtube-controlled-canary-authorization-bundle"),
  bundle: YouTubeCanaryAuthorizationBundleSchema,
  productRuntimeChanged: z.literal(true),
  readOnlyAdminSurfaceAdded: z.literal(true),
  externalExecutionEnabled: z.literal(false),
  packageJsonChanged: z.literal(false),
  pnpmLockChanged: z.literal(false),
  workflowChanged: z.literal(false),
  runtimeReadinessClaimed: z.literal(false),
  productionReadinessClaimed: z.literal(false),
  legalComplianceClaimed: z.literal(false),
  youtubePolicyComplianceClaimed: z.literal(false),
  ownerApprovalCreated: z.literal(false),
  githubApprovalReviewCreated: z.literal(false),
  mergeAuthorityCreated: z.literal(false)
}).strict();

export type YouTubeCanaryAuthorizationBundle = z.infer<typeof YouTubeCanaryAuthorizationBundleSchema>;
export type YouTubeCanaryAuthorizationEvidence = z.infer<typeof YouTubeCanaryAuthorizationEvidenceSchema>;

export type YouTubeCanaryAuthorizationBlockerCode =
  | "network_authorization_absent"
  | "credential_provider_unselected"
  | "client_id_ref_absent"
  | "client_secret_ref_absent"
  | "refresh_token_ref_absent"
  | "redirect_uri_unconfirmed"
  | "test_channel_unselected"
  | "test_live_stream_unselected"
  | "quota_budget_unconfirmed"
  | "privacy_review_incomplete"
  | "data_deletion_review_incomplete"
  | "revocation_runbook_missing"
  | "kill_switch_blocked"
  | "bundle_status_incomplete"
  | "transport_contract_invalid"
  | "first_canary_limit_invalid"
  | "side_effect_contract_invalid"
  | "execution_flag_must_remain_false"
  | "unsafe_authorization_value_forbidden"
  | "authorization_bundle_schema_invalid";

export type YouTubeCanaryAuthorizationInputTrust = "committed_safe_bundle" | "untrusted_preview";

export type YouTubeCanaryAuthorizationEvaluationOptions = {
  inputTrust?: YouTubeCanaryAuthorizationInputTrust;
  now?: Date;
};

export type YouTubeCanaryAuthorizationEvaluation = {
  authorization_status: "awaiting_owner_authorization" | "authorization_fields_complete" | "invalid_authorization_bundle";
  preflight_status: "blocked" | "authorization_fields_complete_network_disabled";
  execution_status: "forbidden";
  input_trust: YouTubeCanaryAuthorizationInputTrust;
  preview_only: boolean;
  state_persisted: false;
  blocker_codes: YouTubeCanaryAuthorizationBlockerCode[];
  completed_fields: string[];
  pending_fields: string[];
  first_canary_limits: YouTubeCanaryAuthorizationBundle["firstCanaryLimits"];
  safe_bundle_hash: string;
  evaluated_at: string;
  network_enabled: false;
  oauth_configured: false;
  secret_accessed: false;
  real_api_execution: false;
  owner_approval_created: false;
  github_approval_review_created: false;
  merge_authority_created: false;
};

const secretWord = ["client", "secret"].join("[_-]?");
const refreshWord = ["refresh", "token"].join("[_-]?");
const accessWord = ["access", "token"].join("[_-]?");
const liveChatWord = ["live", "chat", "id"].join("[_-]?");
const UNSAFE_VALUE_PATTERN = new RegExp(
  [
    "Bearer",
    `${secretWord}\\s*[:=]`,
    `${refreshWord}\\s*[:=]`,
    `${accessWord}\\s*[:=]`,
    "secretref:",
    "https?:\\/\\/",
    "127\\.0\\.0\\.1",
    "localhost",
    "wallet\\s*[:=]",
    "postgres:\\/\\/",
    "mysql:\\/\\/",
    "mongodb:\\/\\/",
    `${liveChatWord}\\s*[:=]`
  ].join("|"),
  "iu"
);

export function defaultYouTubeCanaryAuthorizationBundle(): YouTubeCanaryAuthorizationBundle {
  return {
    schemaVersion: "1.0.0",
    bundleStatus: "awaiting_owner_authorization",
    transport: "direct_rest_fetch",
    initialMode: "list_only",
    streamList: "disabled_for_first_canary",
    networkAuthorization: "absent",
    credentialProvider: "unselected",
    clientIdRef: "absent",
    clientSecretRef: "absent",
    refreshTokenRef: "absent",
    redirectUri: "unconfirmed",
    testChannel: "unselected",
    testLiveStream: "unselected",
    quotaBudget: "unconfirmed",
    privacyReview: "incomplete",
    dataDeletionReview: "incomplete",
    revocationRunbook: "documented",
    killSwitch: "blocked",
    firstCanaryLimits: {
      testChannels: 1,
      testLiveStreams: 1,
      mode: "list_only",
      maxResults: 200,
      maximumApiCalls: 3,
      maximumDurationSeconds: 60,
      automaticFallback: false,
      automaticRetry: false,
      safeParsePreviewOnly: true,
      supportSideEffects: false,
      sideEffects: {
        affinity: false,
        reaction: false,
        overlay: false,
        externalOutbox: false,
        irisCore: false,
        voxweave: false,
        tts: false,
        live2d: false,
        obs: false,
        wallet: false,
        chain: false,
        productionData: false
      }
    },
    networkExecution: false,
    oauthExecution: false,
    secretAccess: false,
    realYouTubeApiUsed: false
  };
}

export function defaultYouTubeCanaryAuthorizationEvidence(): YouTubeCanaryAuthorizationEvidence {
  return {
    schemaVersion: "1.1.0",
    harnessVersion: "1.2.7",
    repository: "hiro4649/CRIPTO-TIP",
    phase: "p1-youtube-controlled-canary-authorization-bundle",
    bundle: defaultYouTubeCanaryAuthorizationBundle(),
    productRuntimeChanged: true,
    readOnlyAdminSurfaceAdded: true,
    externalExecutionEnabled: false,
    packageJsonChanged: false,
    pnpmLockChanged: false,
    workflowChanged: false,
    runtimeReadinessClaimed: false,
    productionReadinessClaimed: false,
    legalComplianceClaimed: false,
    youtubePolicyComplianceClaimed: false,
    ownerApprovalCreated: false,
    githubApprovalReviewCreated: false,
    mergeAuthorityCreated: false
  };
}

export function evaluateYouTubeCanaryAuthorization(input: unknown, options: YouTubeCanaryAuthorizationEvaluationOptions = {}): YouTubeCanaryAuthorizationEvaluation {
  const now = options.now ?? new Date("2026-06-20T00:00:00.000Z");
  const inputTrust = options.inputTrust ?? "untrusted_preview";
  const unsafe = hasUnsafeAuthorizationValue(input);
  const parsed = YouTubeCanaryAuthorizationBundleSchema.safeParse(input);
  if (!parsed.success) {
    const blockerCodes = stableUnique([
      ...typedInvalidBlockers(parsed.error),
      ...(unsafe ? ["unsafe_authorization_value_forbidden" as const] : [])
    ]);
    return buildEvaluation({
      bundle: defaultYouTubeCanaryAuthorizationBundle(),
      blockerCodes,
      completedFields: [],
      pendingFields: ["authorization_bundle_schema"],
      authorizationStatus: "invalid_authorization_bundle",
      inputTrust,
      now
    });
  }

  const bundle = parsed.data;
  const checks: Array<[boolean, YouTubeCanaryAuthorizationBlockerCode, string]> = [
    [bundle.bundleStatus === "owner_inputs_recorded", "bundle_status_incomplete", "bundleStatus"],
    [bundle.networkAuthorization === "owner_authorization_recorded", "network_authorization_absent", "networkAuthorization"],
    [bundle.credentialProvider === "opaque_interface_ready", "credential_provider_unselected", "credentialProvider"],
    [bundle.clientIdRef === "opaque_ref_recorded", "client_id_ref_absent", "clientIdRef"],
    [bundle.clientSecretRef === "opaque_ref_recorded", "client_secret_ref_absent", "clientSecretRef"],
    [bundle.refreshTokenRef === "opaque_ref_recorded", "refresh_token_ref_absent", "refreshTokenRef"],
    [bundle.redirectUri === "confirmed", "redirect_uri_unconfirmed", "redirectUri"],
    [bundle.testChannel === "selected_test_only", "test_channel_unselected", "testChannel"],
    [bundle.testLiveStream === "selected_test_only", "test_live_stream_unselected", "testLiveStream"],
    [bundle.quotaBudget === "confirmed_within_first_canary_limits", "quota_budget_unconfirmed", "quotaBudget"],
    [bundle.privacyReview === "pass", "privacy_review_incomplete", "privacyReview"],
    [bundle.dataDeletionReview === "pass", "data_deletion_review_incomplete", "dataDeletionReview"],
    [bundle.revocationRunbook === "documented", "revocation_runbook_missing", "revocationRunbook"],
    [bundle.killSwitch === "armed_for_controlled_canary", "kill_switch_blocked", "killSwitch"]
  ];
  const blockerCodes = stableUnique(checks.filter(([ok]) => !ok).map(([, code]) => code));
  const completedFields = checks.filter(([ok]) => ok).map(([, , field]) => field);
  const pendingFields = checks.filter(([ok]) => !ok).map(([, , field]) => field);

  return buildEvaluation({
    bundle,
    blockerCodes,
    completedFields,
    pendingFields,
    authorizationStatus: blockerCodes.length === 0 ? "authorization_fields_complete" : "awaiting_owner_authorization",
    inputTrust,
    now
  });
}

export function safeCanonicalAuthorizationHash(input: YouTubeCanaryAuthorizationBundle): string {
  return `safe_hash_${createHash("sha256").update(stableStringify(input)).digest("hex").slice(0, 16)}`;
}

export function projectAuthorizationToLegacyPreflight(bundle: YouTubeCanaryAuthorizationBundle) {
  const complete = evaluateYouTubeCanaryAuthorization(bundle, { inputTrust: "committed_safe_bundle" }).authorization_status === "authorization_fields_complete";
  return {
    config_status: complete ? "controlled_canary_candidate" : "planning_valid",
    oauth_contract_status: "pass",
    credential_provider_status: bundle.credentialProvider === "opaque_interface_ready" ? "opaque_interface_ready" : "missing",
    kill_switch_status: bundle.killSwitch,
    quota_planner_status: "pass",
    direct_rest_transport_status: "pass",
    list_connector_service_status: "pass",
    stream_contract_status: "pass",
    privacy_review_status: bundle.privacyReview === "pass" ? "pass" : "required",
    data_deletion_review_status: bundle.dataDeletionReview === "pass" ? "pass" : "required",
    revocation_runbook_status: bundle.revocationRunbook,
    network_authorization_status: bundle.networkAuthorization === "owner_authorization_recorded" ? "present" : "absent"
  } as const;
}

export function projectAuthorizationToRealConnectorReadiness(bundle: YouTubeCanaryAuthorizationBundle) {
  return {
    config_status: evaluateYouTubeCanaryAuthorization(bundle, { inputTrust: "committed_safe_bundle" }).authorization_status === "authorization_fields_complete" ? "controlled_canary_candidate" : "planning_valid",
    oauth_contract_status: "pass",
    planner_status: bundle.quotaBudget === "confirmed_within_first_canary_limits" ? "pass" : "blocked",
    envelope_status: "pass",
    secret_provider_status: bundle.credentialProvider === "opaque_interface_ready" && bundle.clientIdRef === "opaque_ref_recorded" && bundle.clientSecretRef === "opaque_ref_recorded" && bundle.refreshTokenRef === "opaque_ref_recorded" ? "opaque_interface_ready" : "unselected",
    privacy_review_status: bundle.privacyReview === "pass" ? "pass" : "required",
    data_deletion_status: bundle.dataDeletionReview === "pass" ? "pass" : "required",
    revocation_runbook_status: bundle.revocationRunbook,
    kill_switch_status: bundle.killSwitch,
    network_authorization_status: bundle.networkAuthorization === "owner_authorization_recorded" ? "present" : "absent"
  } as const;
}

function typedInvalidBlockers(error: z.ZodError): YouTubeCanaryAuthorizationBlockerCode[] {
  const blockers = error.issues.map((issue) => {
    const [first, second] = issue.path;
    if (first === "transport" || first === "initialMode" || first === "streamList") return "transport_contract_invalid";
    if (first === "firstCanaryLimits" && second === "sideEffects") return "side_effect_contract_invalid";
    if (first === "firstCanaryLimits") return "first_canary_limit_invalid";
    if (first === "networkExecution" || first === "oauthExecution" || first === "secretAccess" || first === "realYouTubeApiUsed") return "execution_flag_must_remain_false";
    return "authorization_bundle_schema_invalid";
  });
  return stableUnique(blockers);
}

function buildEvaluation(args: {
  bundle: YouTubeCanaryAuthorizationBundle;
  blockerCodes: YouTubeCanaryAuthorizationBlockerCode[];
  completedFields: string[];
  pendingFields: string[];
  authorizationStatus: YouTubeCanaryAuthorizationEvaluation["authorization_status"];
  inputTrust: YouTubeCanaryAuthorizationInputTrust;
  now: Date;
}): YouTubeCanaryAuthorizationEvaluation {
  return {
    authorization_status: args.authorizationStatus,
    preflight_status: args.authorizationStatus === "authorization_fields_complete" ? "authorization_fields_complete_network_disabled" : "blocked",
    execution_status: "forbidden",
    input_trust: args.inputTrust,
    preview_only: args.inputTrust === "untrusted_preview",
    state_persisted: false,
    blocker_codes: stableUnique(args.blockerCodes),
    completed_fields: args.completedFields,
    pending_fields: args.pendingFields,
    first_canary_limits: args.bundle.firstCanaryLimits,
    safe_bundle_hash: safeCanonicalAuthorizationHash(args.bundle),
    evaluated_at: args.now.toISOString(),
    network_enabled: false,
    oauth_configured: false,
    secret_accessed: false,
    real_api_execution: false,
    owner_approval_created: false,
    github_approval_review_created: false,
    merge_authority_created: false
  };
}

function hasUnsafeAuthorizationValue(input: unknown): boolean {
  if (typeof input === "string") return UNSAFE_VALUE_PATTERN.test(input);
  if (Array.isArray(input)) return input.some(hasUnsafeAuthorizationValue);
  if (!input || typeof input !== "object") return false;
  return Object.values(input as Record<string, unknown>).some(hasUnsafeAuthorizationValue);
}

function stableUnique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
