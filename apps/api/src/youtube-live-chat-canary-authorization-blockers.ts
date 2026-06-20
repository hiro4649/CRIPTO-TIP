import { z } from "zod";

export const YOUTUBE_CANARY_AUTHORIZATION_BLOCKER_CODES = [
  "bundle_status_incomplete",
  "network_authorization_absent",
  "credential_provider_unselected",
  "client_id_ref_absent",
  "client_secret_ref_absent",
  "refresh_token_ref_absent",
  "redirect_uri_unconfirmed",
  "test_channel_unselected",
  "test_live_stream_unselected",
  "quota_budget_unconfirmed",
  "privacy_review_incomplete",
  "data_deletion_review_incomplete",
  "revocation_runbook_missing",
  "kill_switch_blocked",
  "transport_contract_invalid",
  "first_canary_limit_invalid",
  "side_effect_contract_invalid",
  "execution_flag_must_remain_false",
  "unsafe_authorization_value_forbidden",
  "authorization_bundle_schema_invalid"
] as const;

export const YouTubeCanaryAuthorizationBlockerCodeSchema = z.enum(YOUTUBE_CANARY_AUTHORIZATION_BLOCKER_CODES);

export type YouTubeCanaryAuthorizationBlockerCode = z.infer<typeof YouTubeCanaryAuthorizationBlockerCodeSchema>;

const canonicalBlockerOrder = new Map(
  YOUTUBE_CANARY_AUTHORIZATION_BLOCKER_CODES.map((code, index) => [code, index])
);

export function canonicalizeYouTubeCanaryAuthorizationBlockers(
  blockerCodes: YouTubeCanaryAuthorizationBlockerCode[]
): YouTubeCanaryAuthorizationBlockerCode[] {
  return [...new Set(blockerCodes)].sort((left, right) => {
    return (canonicalBlockerOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (canonicalBlockerOrder.get(right) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function hasCanonicalYouTubeCanaryAuthorizationBlockerOrder(
  blockerCodes: YouTubeCanaryAuthorizationBlockerCode[]
): boolean {
  return blockerCodes.every((code, index) => code === canonicalizeYouTubeCanaryAuthorizationBlockers(blockerCodes)[index]);
}
