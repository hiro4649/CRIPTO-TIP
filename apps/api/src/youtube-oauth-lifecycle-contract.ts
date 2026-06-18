import { createHash, randomBytes } from "node:crypto";

export type YouTubeOAuthLifecycleStatus =
  | "state_issued"
  | "callback_validated"
  | "exchange_blocked"
  | "refresh_blocked"
  | "revocation_planned"
  | "invalid";

export type YouTubeOAuthStateRecord = {
  state_hash: string;
  created_at: string;
  expires_at: string;
  redirect_binding_hash: string;
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

const stateByteLength = 24;
const stateTtlMs = 10 * 60 * 1000;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isTokenLike(value: string) {
  return /bearer\s+/i.test(value)
    || /\bya29\.[a-z0-9._-]+/i.test(value)
    || /\bsk-[a-z0-9_-]+/i.test(value)
    || /[A-Za-z0-9_-]{40,}/.test(value);
}

export function issueYouTubeOAuthState(input: { redirect_uri: string; now?: Date }): YouTubeOAuthIssuedState {
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
  authorization_code_present: boolean;
  now?: Date;
}): YouTubeOAuthLifecycleDecision {
  const now = input.now ?? new Date();
  const reasons: string[] = [];

  if (hash(input.raw_state) !== input.record.state_hash) reasons.push("state_hash_mismatch");
  if (hash(input.redirect_uri) !== input.record.redirect_binding_hash) reasons.push("redirect_binding_mismatch");
  if (now.toISOString() > input.record.expires_at) reasons.push("state_expired");
  if (!input.authorization_code_present) reasons.push("authorization_code_missing");
  if (input.record.raw_state_stored || input.record.authorization_code_stored || input.record.access_token_stored || input.record.refresh_token_stored) reasons.push("raw_oauth_material_stored");
  if (isTokenLike(input.raw_state)) reasons.push("raw_state_token_like_forbidden");

  return {
    lifecycle_status: reasons.length === 0 ? "callback_validated" : "invalid",
    network_call_allowed: false,
    token_exchange_allowed: false,
    refresh_allowed: false,
    revocation_executed: false,
    safe_reason_codes: reasons.length === 0 ? ["callback_safe_to_plan_exchange"] : reasons
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
