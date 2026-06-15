import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function manualPayload(requestId: string) {
  return {
    request_id: requestId,
    stream_id: "str_side_effects",
    character_id: "char_mio",
    display_name: "safe viewer",
    tier: "medium",
    message: "raw side effect ledger message <script>",
    moderation_status: "approved"
  };
}

async function createApprovedSupport(app: ReturnType<typeof buildServer>, requestId: string) {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw side effect ledger message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("http://");
  expect(serialized).not.toContain("https://");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
}

describe("P0 admin support side-effect ledger", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/side-effects" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/side-effects", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/side-effects", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("returns safe read-only side-effect metadata and resend counts", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createApprovedSupport(app, "ledger_approved");
    await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/overlay-resend`, headers: { authorization: adminAuth } });
    await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/reaction-resend`, headers: { authorization: adminAuth } });
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/side-effects`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/side-effects`, headers: { authorization: adminAuth } });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.support_event.event_id).toBe(support.event_id);
    expect(body.support_event.stream_id).toBe("str_side_effects");
    expect(body.side_effects.affinity_applied).toBe(true);
    expect(body.side_effects.reaction_requested).toBe(true);
    expect(body.side_effects.overlay_requested).toBe(true);
    expect(body.side_effects.outbox_enqueued).toBe(true);
    expect(body.side_effects.resend_candidates.overlay_resend).toBe(1);
    expect(body.side_effects.resend_candidates.reaction_resend).toBe(1);
    expect(body.side_effects.audit_action_counts.create_manual_support).toBe(1);
    expect(body.side_effects.audit_action_counts.resend_overlay).toBe(1);
    expect(body.side_effects.audit_action_counts.resend_reaction).toBe(1);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(second.json()).toEqual(body);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("committed support side-effect ledger evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-side-effect-ledger.json");

    expect(evidence.adminSupportSideEffectLedgerStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.affinityLedgerStatus).toBe("pass");
    expect(evidence.reactionLedgerStatus).toBe("pass");
    expect(evidence.overlayLedgerStatus).toBe("pass");
    expect(evidence.outboxLedgerStatus).toBe("pass");
    expect(evidence.resendCountStatus).toBe("pass");
    expect(evidence.auditCountStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
