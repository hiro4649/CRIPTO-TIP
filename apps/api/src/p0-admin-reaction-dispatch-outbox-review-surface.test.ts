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

async function createInternalOutbox(app: ReturnType<typeof buildServer>, requestId = "outbox_review") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "outbox review viewer",
      tier: "medium",
      message: "outbox review raw message 0x1111111111111111111111111111111111111111",
      moderation_status: "approved"
    }
  });
  expect(supportResponse.statusCode).toBe(200);
  const support = supportResponse.json().support_event;
  const candidateResponse = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
  expect(candidateResponse.statusCode).toBe(200);
  const candidate = candidateResponse.json().candidate;
  const approvalResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approve`, headers: { authorization: adminAuth } });
  expect(approvalResponse.statusCode).toBe(200);
  const boundaryResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
  expect(boundaryResponse.statusCode).toBe(200);
  const outboxResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundaryResponse.json().boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
  expect(outboxResponse.statusCode).toBe(200);
  return { support, candidate, boundary: boundaryResponse.json().boundary, outbox: outboxResponse.json().outbox };
}

function expectReviewSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("outbox review raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
}

describe("P0 admin reaction dispatch outbox review surface", () => {
  it("requires admin auth and returns 404 for unknown review detail", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox-review" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox-review/missing" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox-review", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox-review/missing", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("lists and details internal outbox review entries without side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, boundary, outbox } = await createInternalOutbox(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      internalOutbox: (await repo.listReactionDispatchInternalOutbox()).length,
      audit: repo.auditLogs.length
    };

    const list = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox-review?stream_id=${support.stream_id}&outbox_status=queued_internal`, headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox-review/${outbox.outbox_id}`, headers: { authorization: adminAuth } });

    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(list.json().review_entries).toEqual([detail.json().review_entry]);
    expect(list.json().review_summary).toEqual({ ready_for_operator_review: 1, blocked_for_operator_review: 0 });
    expect(detail.json().review_entry).toMatchObject({
      outbox_id: outbox.outbox_id,
      boundary_id: boundary.boundary_id,
      candidate_id: candidate.candidate_id,
      support_event_id: support.event_id,
      stream_id: support.stream_id,
      character_id: support.character_id,
      source: "admin_manual_support",
      outbox_status: "queued_internal",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0,
      review_status: "ready_for_operator_review",
      review_blockers: []
    });
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(await repo.listReactionDispatchInternalOutbox()).toHaveLength(before.internalOutbox);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectReviewSafe(list.json());
    expectReviewSafe(detail.json());

    await app.close();
  }, 20_000);

  it("committed outbox review evidence preserves read-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-outbox-review-surface.json");

    expect(evidence.adminReactionDispatchOutboxReviewSurfaceStatus).toBe("implemented");
    expect(evidence.readOnlyReviewStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
