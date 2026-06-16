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

async function createInternalOutbox(app: ReturnType<typeof buildServer>, requestId = "outbox_cancel") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "outbox cancel viewer",
      tier: "medium",
      message: "outbox cancel raw message 0x1111111111111111111111111111111111111111",
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
  return { support, candidate, outbox: outboxResponse.json().outbox };
}

function expectCancelSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("outbox cancel raw message");
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
}

describe("P0 reaction dispatch internal outbox cancel", () => {
  it("requires admin auth and returns 404 for unknown outbox", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/cancel" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/cancel-status" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/cancel", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/cancel", headers: { authorization: adminAuth } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/cancel-status", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("cancels queued internal outbox idempotently without runtime dispatch", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, outbox } = await createInternalOutbox(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const first = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/cancel`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/cancel`, headers: { authorization: adminAuth } });
    const status = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/cancel-status`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(status.statusCode).toBe(200);
    expect(first.json().cancel_status).toMatchObject({
      outbox_id: outbox.outbox_id,
      candidate_id: candidate.candidate_id,
      boundary_id: outbox.boundary_id,
      support_event_id: support.event_id,
      outbox_status: "cancelled_internal",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      cancelled_by_actor_type: "admin",
      safe_reason_codes: ["cancelled_by_admin", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    });
    expect(first.json().cancel_status.cancelled_at).toEqual(expect.any(String));
    expect(second.json().cancel_status).toEqual(first.json().cancel_status);
    expect(second.json().idempotent).toBe(true);
    expect(status.json().cancel_status).toEqual(first.json().cancel_status);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_internal_outbox_cancelled",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id
    });
    expectCancelSafe(first.json());
    expectCancelSafe(second.json());
    expectCancelSafe(status.json());
    expectCancelSafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("blocks non-cancellable records with safe metadata only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox } = await createInternalOutbox(app, "outbox_cancel_blocked");
    await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "blocked_internal" });

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/cancel`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(409);
    expect(response.json().cancel_status.outbox_status).toBe("blocked_internal");
    expect(response.json().cancel_status.safe_reason_codes).toContain("not_cancellable");
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toMatchObject({ outbox_status: "blocked_internal" });
    expectCancelSafe(response.json());

    await app.close();
  }, 20_000);

  it("committed internal outbox cancel evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-internal-outbox-cancel.json");

    expect(evidence.reactionDispatchInternalOutboxCancelStatus).toBe("implemented");
    expect(evidence.outboxCancelStatus).toBe("pass");
    expect(evidence.outboxCancelIdempotencyStatus).toBe("pass");
    expect(evidence.outboxCancelStateGuardStatus).toBe("pass");
    expect(evidence.externalDeliveryNotAttemptedGuardStatus).toBe("pass");
    expect(evidence.adapterNotExecutedGuardStatus).toBe("pass");
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
