export type YouTubeConnectorKillSwitchStatus =
  | "blocked"
  | "armed_for_fake_transport"
  | "armed_for_controlled_network_canary";

export type YouTubeConnectorKillSwitch = {
  status: YouTubeConnectorKillSwitchStatus;
  reason_codes: string[];
  changed_at: string;
  changed_by_actor_type: "system" | "operator";
  expires_at: string;
  head_binding: string;
  config_hash_binding: string;
  raw_identity_exposed: false;
  secret_exposed: false;
};

export type YouTubeConnectorKillSwitchEvaluation = {
  allowed: boolean;
  execution_allowed: false;
  safe_reason_codes: string[];
};

export function defaultYouTubeConnectorKillSwitch(input?: { now?: Date; head_binding?: string; config_hash_binding?: string }): YouTubeConnectorKillSwitch {
  const now = input?.now ?? new Date();
  return {
    status: "blocked",
    reason_codes: ["default_blocked"],
    changed_at: now.toISOString(),
    changed_by_actor_type: "system",
    expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    head_binding: input?.head_binding ?? "unbound",
    config_hash_binding: input?.config_hash_binding ?? "unbound",
    raw_identity_exposed: false,
    secret_exposed: false
  };
}

export function armYouTubeConnectorKillSwitchForFakeTransport(input: { now?: Date; expires_at: string; head_binding: string; config_hash_binding: string }): YouTubeConnectorKillSwitch {
  const now = input.now ?? new Date();
  return {
    status: "armed_for_fake_transport",
    reason_codes: ["fake_transport_only"],
    changed_at: now.toISOString(),
    changed_by_actor_type: "operator",
    expires_at: input.expires_at,
    head_binding: input.head_binding,
    config_hash_binding: input.config_hash_binding,
    raw_identity_exposed: false,
    secret_exposed: false
  };
}

export function evaluateYouTubeConnectorKillSwitch(input: {
  kill_switch: YouTubeConnectorKillSwitch;
  expected_head_binding: string;
  expected_config_hash_binding: string;
  now?: Date;
}): YouTubeConnectorKillSwitchEvaluation {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  if (input.kill_switch.status === "blocked") reasons.push("kill_switch_blocked");
  if (input.kill_switch.status === "armed_for_controlled_network_canary") reasons.push("controlled_network_canary_not_allowed_in_this_scope");
  if (input.kill_switch.head_binding !== input.expected_head_binding) reasons.push("head_binding_mismatch");
  if (input.kill_switch.config_hash_binding !== input.expected_config_hash_binding) reasons.push("config_hash_binding_mismatch");
  if (now.getTime() > new Date(input.kill_switch.expires_at).getTime()) reasons.push("kill_switch_expired");
  return {
    allowed: reasons.length === 0 && input.kill_switch.status === "armed_for_fake_transport",
    execution_allowed: false,
    safe_reason_codes: reasons.length === 0 ? ["fake_transport_armed"] : reasons
  };
}
