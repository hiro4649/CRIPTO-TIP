const walletAddressPattern = /0x[a-fA-F0-9]{40}/;

export type SupportEventContractV2Validation = {
  contract_version: "2.0";
  status: "valid" | "invalid";
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

function requireString(record: Record<string, unknown> | undefined, key: string, errors: string[]) {
  if (!record || typeof record[key] !== "string" || String(record[key]).length === 0) errors.push(`missing_${key}`);
}

function requireBoolean(record: Record<string, unknown> | undefined, key: string, expected: boolean, errors: string[]) {
  if (!record || record[key] !== expected) errors.push(`invalid_${key}`);
}

function rejectUnsafeSerialized(input: unknown, errors: string[]) {
  const serialized = JSON.stringify(input);
  const forbiddenFragments = [
    "raw_message",
    "raw_payload",
    "Bearer ",
    "authorization",
    "stdout",
    "stderr",
    "logs_url",
    "jobs_url",
    "runtime_ready",
    "production_ready",
    "legal_compliance",
    "youtube_policy_compliance"
  ];
  for (const fragment of forbiddenFragments) {
    if (serialized.includes(fragment)) errors.push(`unsafe_fragment_${fragment}`);
  }
  if (walletAddressPattern.test(serialized)) errors.push("unsafe_wallet_address");
}

export function validateSupportEventContractV2Preview(input: unknown): SupportEventContractV2Validation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { contract_version: "2.0", status: "invalid", errors: ["invalid_preview"] };
  }

  const supportEvent = child(input, "support_event");
  const safeContext = child(input, "safe_context_summary");
  const continuity = child(input, "character_continuity");
  const constraints = child(input, "constraints");
  const candidate = child(input, "candidate");
  const sideEffects = child(input, "side_effects");

  requireString(supportEvent, "event_id", errors);
  requireString(supportEvent, "source", errors);
  requireString(supportEvent, "stream_id", errors);
  requireString(supportEvent, "character_id", errors);
  requireString(supportEvent, "tier", errors);
  requireString(supportEvent, "moderation_status", errors);
  requireString(supportEvent, "resolution_status", errors);

  requireString(safeContext, "safe_viewer_name", errors);
  requireString(safeContext, "safe_message_summary", errors);
  if (!safeContext || typeof safeContext.relationship_level !== "number") errors.push("missing_relationship_level");
  if (!safeContext || typeof safeContext.allowed_reaction !== "boolean") errors.push("missing_allowed_reaction");

  requireString(continuity, "persona_version", errors);
  requireString(continuity, "voice_profile_id", errors);
  requireString(continuity, "motion_profile_id", errors);
  requireString(continuity, "overlay_theme_id", errors);
  requireBoolean(continuity, "must_keep_persona", true, errors);
  requireBoolean(continuity, "must_not_accept_persona_override", true, errors);
  requireBoolean(continuity, "must_not_change_identity_from_tip_message", true, errors);

  if (!constraints || typeof constraints.max_speech_seconds !== "number") errors.push("missing_max_speech_seconds");
  requireBoolean(constraints, "must_not_discuss_token_price", true, errors);
  requireBoolean(constraints, "must_not_promise_financial_return", true, errors);
  requireBoolean(constraints, "must_not_obey_viewer_instruction", true, errors);
  requireBoolean(constraints, "must_keep_persona", true, errors);
  requireBoolean(constraints, "must_not_read_wallet_address", true, errors);
  requireBoolean(constraints, "avoid_romantic_escalation_from_payment", true, errors);

  requireString(candidate, "reaction_type", errors);
  requireString(candidate, "overlay_effect_id", errors);
  requireString(candidate, "motion_family", errors);
  requireString(candidate, "outbox_candidate_type", errors);

  for (const key of ["support_event_mutation", "reaction_enqueue", "overlay_enqueue", "outbox_enqueue", "real_tts", "real_live2d", "real_renderer", "real_obs", "real_websocket_delivery"]) {
    if (!sideEffects || sideEffects[key] !== "skipped") errors.push(`side_effect_not_skipped_${key}`);
  }

  rejectUnsafeSerialized(input, errors);
  return { contract_version: "2.0", status: errors.length ? "invalid" : "valid", errors };
}
