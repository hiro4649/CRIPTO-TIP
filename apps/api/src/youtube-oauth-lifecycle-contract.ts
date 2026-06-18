import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type YouTubeOAuthLifecycleStatus =
  | "state_issued"
  | "callback_validated"
  | "exchange_blocked"
  | "refresh_blocked"
  | "revocation_planned"
  | "state_consumed"
  | "invalid";

export type YouTubeOAuthStateRecord = {
  state_hash: string;
  created_at: string;
  expires_at: string;
  redirect_binding_hash: string;
  oauth_session_binding_hash: string;
  state_used: boolean;
  state_used_at: string | null;
  requested_scope_ids: string[];
  access_type: "offline";
  include_granted_scopes: true;
  prompt_consent: false;
  raw_state_stored: false;
  authorization_code_stored: false;
  access_token_stored: false;
  refresh_token_stored: false;
};

export type YouTubeOAuthIssuedState = {
  raw_state_once: string;
  record: YouTubeOAuthStateRecord;
  lifecycle_status: "state_issued";
};

export type YouTubeOAuthLifecycleDecision = {
  lifecycle_status: YouTubeOAuthLifecycleStatus;
  network_call_allowed: false;
  token_exchange_allowed: false;
  refresh_allowed: false;
  revocation_executed: false;
  safe_reason_codes: string[];
};

const stateByteLength = 32;
const stateTtlMs = 10 * 60 * 1000;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeHashEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueYouTubeOAuthState(input: { redirect_uri: string; oauth_session_id?: string; requested_scope_ids?: string[]; now?: Date }): YouTubeOAuthIssuedState {
  const now = input.now ?? new Date();
  const rawState = randomBytes(stateByteLength).toString("base64url");
  return {
    raw_state_once: rawState,
    lifecycle_status: "state_issued",
    record: {
      state_hash: hash(rawState),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + stateTtlMs).toISOString(),
      redirect_binding_hash: hash(input.redirect_uri),
      oauth_session_binding_hash: hash(input.oauth_session_id ?? "default_oauth_session"),
      state_used: false,
      state_used_at: null,
      requested_scope_ids: input.requested_scope_ids ?? ["https://www.googleapis.com/auth/youtube.readonly"],
      access_type: "offline",
      include_granted_scopes: true,
      prompt_consent: false,
      raw_state_stored: false,
      authorization_code_stored: false,
      access_token_stored: false,
      refresh_token_stored: false
    }
  };
}

export function validateYouTubeOAuthCallback(input: {
  record: YouTubeOAuthStateRecord;
  raw_state: string;
  redirect_uri: string;
  oauth_session_id?: string;
  authorization_code_present: boolean;
  approved_scope_ids?: string[];
  now?: Date;
}): YouTubeOAuthLifecycleDecision {
  const now = input.now ?? new Date();
  const reasons: string[] = [];

  const approvedScopes = new Set(input.approved_scope_ids ?? ["https://www.googleapis.com/auth/youtube.readonly"]);
  if (!safeHashEqual(hash(input.raw_state), input.record.state_hash)) reasons.push("state_hash_mismatch");
  if (!safeHashEqual(hash(input.redirect_uri), input.record.redirect_binding_hash)) reasons.push("redirect_binding_mismatch");
  if (!safeHashEqual(hash(input.oauth_session_id ?? "default_oauth_session"), input.record.oauth_session_binding_hash)) reasons.push("session_binding_mismatch");
  if (now.getTime() > new Date(input.record.expires_at).getTime()) reasons.push("state_expired");
  if (input.record.state_used) reasons.push("state_reuse_blocked");
  if (!input.authorization_code_present) reasons.push("authorization_code_missing");
  for (const scope of input.record.requested_scope_ids) {
    if (!approvedScopes.has(scope)) reasons.push("scope_mismatch_blocked");
  }
  if (input.record.raw_state_stored || input.record.authorization_code_stored || input.record.access_token_stored || input.record.refresh_token_stored) reasons.push("raw_oauth_material_stored");

  return {
    lifecycle_status: reasons.length === 0 ? "callback_validated" : "invalid",
    network_call_allowed: false,
    token_exchange_allowed: false,
    refresh_allowed: false,
    revocation_executed: false,
    safe_reason_codes: reasons.length === 0 ? ["callback_safe_to_plan_exchange"] : reasons
  };
}

export function consumeYouTubeOAuthState(input: {
  record: YouTubeOAuthStateRecord;
  raw_state: string;
  redirect_uri: string;
  oauth_session_id?: string;
  authorization_code_present: boolean;
  approved_scope_ids?: string[];
  now?: Date;
}): { decision: YouTubeOAuthLifecycleDecision; record: YouTubeOAuthStateRecord } {
  const now = input.now ?? new Date();
  const decision = validateYouTubeOAuthCallback({ ...input, now });
  if (decision.lifecycle_status !== "callback_validated") return { decision, record: input.record };
  return {
    decision: {
      lifecycle_status: "state_consumed",
      network_call_allowed: false,
      token_exchange_allowed: false,
      refresh_allowed: false,
      revocation_executed: false,
      safe_reason_codes: ["state_consumed_without_token_exchange"]
    },
    record: {
      ...input.record,
      state_used: true,
      state_used_at: now.toISOString(),
      authorization_code_stored: false,
      access_token_stored: false,
      refresh_token_stored: false
    }
  };
}

export function planYouTubeOAuthTokenExchange(): YouTubeOAuthLifecycleDecision {
  return {
    lifecycle_status: "exchange_blocked",
    network_call_allowed: false,
    token_exchange_allowed: false,
    refresh_allowed: false,
    revocation_executed: false,
    safe_reason_codes: ["token_exchange_requires_future_owner_scope"]
  };
}

export function planYouTubeOAuthRefresh(): YouTubeOAuthLifecycleDecision {
  return {
    lifecycle_status: "refresh_blocked",
    network_call_allowed: false,
    token_exchange_allowed: false,
    refresh_allowed: false,
    revocation_executed: false,
    safe_reason_codes: ["token_refresh_requires_future_owner_scope"]
  };
}

export function planYouTubeOAuthRevocation(): YouTubeOAuthLifecycleDecision {
  return {
    lifecycle_status: "revocation_planned",
    network_call_allowed: false,
    token_exchange_allowed: false,
    refresh_allowed: false,
    revocation_executed: false,
    safe_reason_codes: ["revocation_runbook_planned_without_execution"]
  };
}
