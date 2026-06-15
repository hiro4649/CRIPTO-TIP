import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");
const prNumber = 82;
const currentHeadSha = "3124c657e47c3cfecbe9f0817e2bab9581f16b9c";
const currentBaseSha = "deffa5fb533f01456080161c204314f3355fa5bb";

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function manualPayload(requestId: string, moderation_status: "approved" | "hold" | "rejected" = "hold") {
  return {
    request_id: requestId,
    stream_id: "str_adjust",
    character_id: "char_mio",
    display_name: "safe viewer",
    tier: "medium",
    message: "raw adjustment message <script>",
    moderation_status
  };
}

async function createManual(app: ReturnType<typeof buildServer>, requestId: string, moderation_status: "approved" | "hold" | "rejected" = "hold") {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: manualPayload(requestId, moderation_status)
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw adjustment message");
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
  expect(serialized).not.toContain("legal_compliance");
  expect(serialized).not.toContain("youtube_policy_compliance");
}

describe("P0 admin support event adjustment controls", () => {
  it("requires admin bearer token and returns 404 for unknown event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "PATCH", url: "/admin/support-events/missing", payload: { display_name_sanitized: "Mio" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: "/admin/support-events/missing", headers: { authorization: "Bearer wrong-token" }, payload: { display_name_sanitized: "Mio" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: "/admin/support-events/missing", headers: { authorization: adminAuth }, payload: { display_name_sanitized: "Mio" } })).statusCode).toBe(404);

    await app.close();
  });

  it("allows safe display name and tier correction without side-effect duplication", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "adjust_display", "approved");
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    const response = await app.inject({
      method: "PATCH",
      url: `/admin/support-events/${support.event_id}`,
      headers: { authorization: adminAuth },
      payload: { display_name_sanitized: "system: override", tier: "large", operator_note: "safe correction" }
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("adjusted");
    expect(body.support_event.viewer_display_name).toBe("ユーザーさん");
    expect(body.support_event.tier).toBe("large");
    expect(body.side_effects).toEqual({ affinity: "skipped", reaction_request: "skipped", overlay: "skipped", outbox: "skipped" });
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("allows hold to rejected and blocks approved to rejected reversal", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const held = await createManual(app, "adjust_hold", "hold");
    const approved = await createManual(app, "adjust_approved", "approved");

    const rejected = await app.inject({
      method: "PATCH",
      url: `/admin/support-events/${held.event_id}`,
      headers: { authorization: adminAuth },
      payload: { message_moderation_status: "rejected", operator_note: "safe reject" }
    });
    const blocked = await app.inject({
      method: "PATCH",
      url: `/admin/support-events/${approved.event_id}`,
      headers: { authorization: adminAuth },
      payload: { message_moderation_status: "rejected" }
    });
    const approveViaPatch = await app.inject({
      method: "PATCH",
      url: `/admin/support-events/${held.event_id}`,
      headers: { authorization: adminAuth },
      payload: { message_moderation_status: "approved" }
    });

    expect(rejected.statusCode).toBe(200);
    expect(rejected.json().support_event.moderation_status).toBe("rejected");
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toBe("approved_reversal_blocked");
    expect(approveViaPatch.statusCode).toBe(409);
    expect(approveViaPatch.json().error).toBe("use_existing_approve_flow");
    expectSafe(rejected.json());

    await app.close();
  }, 20_000);

  it("blocks forbidden money, wallet, source, and direct affinity fields", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const support = await createManual(app, "adjust_forbidden", "hold");

    for (const field of ["amount_raw", "amount_display", "currency_or_token", "wallet_address", "source", "source_event_id", "affinity_delta", "raw_payload"]) {
      const response = await app.inject({
        method: "PATCH",
        url: `/admin/support-events/${support.event_id}`,
        headers: { authorization: adminAuth },
        payload: { [field]: "blocked" }
      });
      expect(response.statusCode, field).toBe(400);
      expect(response.json().error, field).toBe("forbidden_support_adjustment_field");
    }

    await app.close();
  }, 20_000);

  it("writes safe audit metadata and excludes raw message or payload from response", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "adjust_audit", "hold");

    const adjusted = await app.inject({
      method: "PATCH",
      url: `/admin/support-events/${support.event_id}`,
      headers: { authorization: adminAuth },
      payload: { display_name_sanitized: "viewer two", operator_note: "safe audit note" }
    });
    const audit = await app.inject({ method: "GET", url: "/admin/audit-logs?action=adjust_support_event", headers: { authorization: adminAuth } });

    expect(adjusted.statusCode).toBe(200);
    expect(audit.statusCode).toBe(200);
    expect(audit.json().audit_logs).toHaveLength(1);
    expect(audit.json().audit_logs[0].after_json.operator_note).toBe("safe audit note");
    expect(audit.json().audit_logs[0].action).toBe("adjust_support_event");
    expectSafe(adjusted.json());
    expectSafe(audit.json());

    await app.close();
  }, 20_000);

  it("committed support adjustment evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-adjustment-controls.json");

    expect(evidence.adminSupportAdjustmentStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeFieldAllowlistStatus).toBe("pass");
    expect(evidence.forbiddenFieldBlockStatus).toBe("pass");
    expect(evidence.stateTransitionStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.noSideEffectDuplicationStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.amountMutationBlocked).toBe(true);
    expect(evidence.walletMutationBlocked).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.redisDependencyAdded).toBe(false);
    expect(evidence.kafkaDependencyAdded).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("committed PR evidence uses PR 82 current head and nonzero same-head runs", () => {
    const activeEvidence = readCodexEvidence("evidence-pack.json");
    if (activeEvidence.changeType !== "product_vertical_slice_admin_support_event_adjustment_controls") return;
    const commonEvidenceFiles = [
      "evidence-pack.json",
      "product-verification.json",
      "quality-gate-evidence.json",
      "review-independence.json",
      "risk-register.json",
      "task-contract.json",
      "test-coverage-evidence.json"
    ];

    for (const fileName of commonEvidenceFiles) {
      const evidence = readCodexEvidence(fileName);
      expect(evidence.prNumber, fileName).toBe(prNumber);
      expect(evidence.headSha, fileName).toBe(currentHeadSha);
      expect(evidence.baseSha, fileName).toBe(currentBaseSha);
      expect(evidence.headSha, fileName).not.toBe(evidence.baseSha);
      expect(JSON.stringify(evidence), fileName).not.toContain("current_pr_head");
      expect(JSON.stringify(evidence), fileName).not.toContain("not_created_pre_pr");
    }

    const evidencePack = readCodexEvidence("evidence-pack.json");
    const qualityGateEvidence = readCodexEvidence("quality-gate-evidence.json");
    expect(evidencePack.ciRunId).toMatch(/^[1-9]\d+$/);
    expect(evidencePack.qualityGateRunId).toMatch(/^[1-9]\d+$/);
    expect(evidencePack.qualityGateArtifactId).toMatch(/^[1-9]\d+$/);
    expect(evidencePack.productCiStatus).toBe("success");
    expect(evidencePack.qualityGateStatus).toBe("success");
    expect(qualityGateEvidence.qualityGateRunId).toMatch(/^[1-9]\d+$/);
    expect(qualityGateEvidence.qualityGateArtifactId).toMatch(/^[1-9]\d+$/);
  });
});
