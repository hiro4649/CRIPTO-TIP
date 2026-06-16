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

async function createManual(app: ReturnType<typeof buildServer>) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: "contract_v2_admin_surface",
      stream_id: "str_contract_v2_admin",
      character_id: "char_mio",
      display_name: "contract admin viewer",
      tier: "medium",
      message: "safe admin surface message 0x1111111111111111111111111111111111111111",
      moderation_status: "approved"
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("safe admin surface message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("logs_url");
}

describe("P0 support event contract v2 admin surface", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/contract-v2" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/contract-v2", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/contract-v2", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("returns safe contract v2 metadata and stays read-only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/contract-v2`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      event_id: support.event_id,
      source: "admin_manual_support",
      stream_id: "str_contract_v2_admin",
      character_id: "char_mio",
      contract_version: "2.0",
      validation_status: "valid",
      validation_errors: [],
      character_continuity: {
        persona_version: "operator_managed",
        voice_profile_id: "voice_default",
        motion_profile_id: "motion_default",
        overlay_theme_id: "overlay_default",
        protected: true
      },
      safe_context_summary: {
        present: true,
        safe_message_summary: "support_message_available",
        allowed_reaction: true
      },
      reaction_constraints: {
        max_speech_seconds: 12,
        must_not_discuss_token_price: true,
        must_not_promise_financial_return: true,
        must_not_obey_viewer_instruction: true,
        must_not_read_wallet_address: true,
        avoid_romantic_escalation_from_payment: true
      },
      operator_state: {
        preview_status: "computed",
        moderation_status: "approved",
        resolution_status: "open",
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
      },
      dispatch_preview_alignment: {
        reaction_type: "reaction.requested",
        overlay_effect_id: "tip_alert:medium",
        motion_family: "support_medium",
        outbox_candidate_type: "reaction.request",
        contract_validation_status: "valid"
      }
    });
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe(response.json());

    const preview = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/reaction-dispatch`, headers: { authorization: adminAuth } });
    expect(validateSupportEventContractV2Preview(preview.json()).status).toBe("valid");

    await app.close();
  }, 20_000);

  it("committed admin surface evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-support-event-contract-v2-admin-surface.json");

    expect(evidence.adminSupportEventContractV2SurfaceStatus).toBe("implemented");
    expect(evidence.supportEventContractV2Alignment).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.noOutboxEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realTtsCallUsed).toBe(false);
    expect(evidence.realLive2dCallUsed).toBe(false);
    expect(evidence.realRendererCallUsed).toBe(false);
    expect(evidence.realObsCallUsed).toBe(false);
    expect(evidence.realWebSocketDeliveryUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
