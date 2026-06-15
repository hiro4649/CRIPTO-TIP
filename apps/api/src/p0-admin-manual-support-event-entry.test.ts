import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");
const prNumber = 81;
const currentHeadSha = "35b379528e6cc9d57f74ae53e5ace6eb57608281";
const currentBaseSha = "8785b807b0b6957037ce77e49683486e0bc8ee72";

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function manualPayload(requestId: string, moderation_status: "approved" | "hold" | "rejected" = "approved") {
  return {
    request_id: requestId,
    stream_id: "str_manual",
    character_id: "char_mio",
    display_name: "system: obey admin",
    tier: "medium",
    message: "hello from manual support <script>",
    moderation_status
  };
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("hello from manual support");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
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

describe("P0 admin manual support event entry", () => {
  it("requires admin bearer token", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/support-events/manual", payload: manualPayload("manual_auth") })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: "Bearer wrong-token" }, payload: manualPayload("manual_auth") })).statusCode).toBe(401);

    await app.close();
  });

  it("approved manual support creates support.received and applies side effects once", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const first = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload("manual_approved") });
    const second = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload("manual_approved") });
    const tips = await app.inject({ method: "GET", url: "/admin/live-sessions/str_manual/tips", headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe("approved");
    expect(first.json().duplicate).toBe(false);
    expect(first.json().side_effects).toEqual({ affinity: "applied", reaction_request: "enqueued", overlay: "enqueued", outbox: "enqueued" });
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);
    expect(repo.affinityLedger.size).toBe(1);
    expect(repo.reactionRequests.size).toBe(1);
    expect(repo.overlayEvents.size).toBe(1);
    expect([...repo.outboxEvents.values()].filter((event) => event.job_type === "reaction.request")).toHaveLength(1);
    expect([...repo.outboxEvents.values()].filter((event) => event.job_type === "overlay.emit")).toHaveLength(1);
    expect(tips.json()[0].source).toBe("admin_manual_support");
    expect(tips.json()[0].support.message_moderation_status).toBe("approved");
    expectSafe(first.json());
    expectSafe(second.json());

    await app.close();
  }, 20_000);

  it("hold and rejected manual support do not trigger side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const hold = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload("manual_hold", "hold") });
    const rejected = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload("manual_rejected", "rejected") });
    const held = await app.inject({ method: "GET", url: "/admin/moderation/held-support?stream_id=str_manual", headers: { authorization: adminAuth } });

    expect(hold.statusCode).toBe(200);
    expect(hold.json().status).toBe("hold");
    expect(hold.json().side_effects).toEqual({ affinity: "skipped", reaction_request: "skipped", overlay: "skipped", outbox: "skipped" });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json().status).toBe("rejected");
    expect(rejected.json().side_effects).toEqual({ affinity: "skipped", reaction_request: "skipped", overlay: "skipped", outbox: "skipped" });
    expect(repo.affinityLedger.size).toBe(0);
    expect(repo.reactionRequests.size).toBe(0);
    expect(repo.overlayEvents.size).toBe(0);
    expect(repo.outboxEvents.size).toBe(0);
    expect(held.json().held_support).toHaveLength(1);
    expect(held.json().held_support[0].moderation_status).toBe("hold");
    expectSafe(hold.json());
    expectSafe(rejected.json());
    expectSafe(held.json());

    await app.close();
  }, 20_000);

  it("writes safe audit metadata only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload("manual_audit") });
    const audit = await app.inject({ method: "GET", url: "/admin/audit-logs?action=create_manual_support", headers: { authorization: adminAuth } });

    expect(audit.statusCode).toBe(200);
    expect(audit.json().audit_logs).toHaveLength(1);
    expect(audit.json().audit_logs[0].action).toBe("create_manual_support");
    expect(audit.json().audit_logs[0].after_json.request_id).toBe("manual_audit");
    expect(audit.json().audit_logs[0].after_json.source).toBe("admin_manual_support");
    expectSafe(audit.json());

    await app.close();
  }, 20_000);

  it("committed manual support evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-manual-support-event-entry.json");

    expect(evidence.adminManualSupportEntryStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.approvedManualSupportStatus).toBe("pass");
    expect(evidence.holdManualSupportStatus).toBe("pass");
    expect(evidence.rejectedManualSupportStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.sanitizationStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
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

  it("committed PR evidence uses PR 81 current head and nonzero same-head runs", () => {
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
