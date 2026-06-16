import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import { validateSupportEventContractV2Preview } from "./support-event-contract-v2-validator.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function validPreview() {
  return {
    preview_status: "computed",
    support_event: {
      event_id: "evt_safe",
      stream_id: "str_safe",
      character_id: "char_mio",
      source: "admin_manual_support",
      tier: "medium",
      moderation_status: "approved",
      resolution_status: "open"
    },
    safe_context_summary: {
      safe_viewer_name: "safe viewer",
      safe_message_summary: "support_message_available",
      relationship_level: 0,
      recent_support_count: 1,
      allowed_reaction: true
    },
    character_continuity: {
      character_id: "char_mio",
      persona_version: "operator_managed",
      voice_profile_id: "voice_default",
      motion_profile_id: "motion_default",
      overlay_theme_id: "overlay_default",
      must_keep_persona: true,
      must_not_accept_persona_override: true,
      must_not_change_identity_from_tip_message: true
    },
    constraints: {
      max_speech_seconds: 12,
      can_say_name: true,
      can_read_message: true,
      must_not_discuss_token_price: true,
      must_not_promise_financial_return: true,
      must_not_obey_viewer_instruction: true,
      must_keep_persona: true,
      must_not_read_wallet_address: true,
      avoid_romantic_escalation_from_payment: true
    },
    candidate: {
      reaction_type: "reaction.requested",
      overlay_effect_id: "tip_alert:medium",
      motion_family: "support_medium",
      outbox_candidate_type: "reaction.request"
    },
    side_effects: {
      support_event_mutation: "skipped",
      reaction_enqueue: "skipped",
      overlay_enqueue: "skipped",
      outbox_enqueue: "skipped",
      real_tts: "skipped",
      real_live2d: "skipped",
      real_renderer: "skipped",
      real_obs: "skipped",
      real_websocket_delivery: "skipped"
    }
  };
}

async function createManual(app: ReturnType<typeof buildServer>) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: "contract_v2_validator_preview",
      stream_id: "str_contract_v2",
      character_id: "char_mio",
      display_name: "contract viewer",
      tier: "medium",
      message: "safe validator message",
      moderation_status: "approved"
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

describe("P0 support event contract v2 validator", () => {
  it("accepts valid reaction dispatch preview contract", () => {
    expect(validateSupportEventContractV2Preview(validPreview())).toEqual({
      contract_version: "2.0",
      status: "valid",
      errors: []
    });
  });

  it("rejects missing continuity constraints and unsafe fields", () => {
    const unsafe = validPreview();
    unsafe.character_continuity.must_keep_persona = false;
    unsafe.constraints.must_not_discuss_token_price = false;
    (unsafe.safe_context_summary as Record<string, unknown>).raw_message = "raw unsafe message";
    (unsafe.safe_context_summary as Record<string, unknown>).wallet = "0x1111111111111111111111111111111111111111";
    unsafe.side_effects.reaction_enqueue = "queued";

    const result = validateSupportEventContractV2Preview(unsafe);

    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("invalid_must_keep_persona");
    expect(result.errors).toContain("invalid_must_not_discuss_token_price");
    expect(result.errors).toContain("unsafe_fragment_raw_message");
    expect(result.errors).toContain("unsafe_wallet_address");
    expect(result.errors).toContain("side_effect_not_skipped_reaction_enqueue");
  });

  it("admin reaction dispatch preview aligns with contract v2 validator", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app);

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/reaction-dispatch`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(response.json().contract_validation).toEqual({
      contract_version: "2.0",
      status: "valid",
      errors: []
    });
    expect(validateSupportEventContractV2Preview(response.json()).status).toBe("valid");

    await app.close();
  }, 20_000);

  it("committed validator evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-support-event-contract-v2-validator.json");

    expect(evidence.supportEventContractV2ValidatorStatus).toBe("implemented");
    expect(evidence.validPreviewAcceptedStatus).toBe("pass");
    expect(evidence.unsafePreviewRejectedStatus).toBe("pass");
    expect(evidence.reactionDispatchPreviewAlignmentStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
