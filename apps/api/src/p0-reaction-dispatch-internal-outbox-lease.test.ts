import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { ReactionDispatchInternalOutboxMetadata } from "./repositories/types.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

async function createInternalOutbox(app: ReturnType<typeof buildServer>, requestId = "outbox_lease") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "outbox lease viewer",
      tier: "medium",
      message: "outbox lease raw message 0x1111111111111111111111111111111111111111 https://private.example/hook",
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
  return { support, candidate, outbox: outboxResponse.json().outbox as ReactionDispatchInternalOutboxMetadata };
}

function expectLeaseSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("outbox lease raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("lease_token");
  expect(serialized).not.toContain("token_hash");
}

describe("P0 reaction dispatch internal outbox lease", () => {
  it("requires admin bearer token and returns 404 for unknown outbox", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/lease" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/lease" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/lease", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/lease", headers: { authorization: adminAuth } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/lease", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates active lease metadata without mutating support or executing runtime work", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, outbox } = await createInternalOutbox(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      internalOutbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      audit: repo.auditLogs.length
    };

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
    const status = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(status.statusCode).toBe(200);
    expect(response.json().lease_status).toMatchObject({
      outbox_id: outbox.outbox_id,
      lease_status: "leased_internal",
      leased_by_actor_type: "admin",
      safe_reason_codes: ["lease_created", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    });
    expect(response.json().lease_status.lease_id).toMatch(/^rdlease_[a-f0-9]{24}$/);
    expect(status.json().lease_status).toEqual(response.json().lease_status);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.internalOutbox);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_internal_outbox_lease_created",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id
    });
    expectLeaseSafe(response.json());
    expectLeaseSafe(status.json());
    expectLeaseSafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("blocks duplicate active lease and allows a new lease after expiry", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox } = await createInternalOutbox(app, "outbox_lease_expiry");

    const first = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
    await repo.setReactionDispatchInternalOutboxLease({
      ...first.json().lease_status,
      lease_expires_at: "2000-01-01T00:00:00.000Z",
      updated_at: "2000-01-01T00:00:00.000Z",
      safe_reason_codes: ["lease_expired", "external_execution_forbidden"]
    });
    const reclaimed = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error).toBe("internal_outbox_lease_active");
    expect(reclaimed.statusCode).toBe(200);
    expect(reclaimed.json().lease_status.lease_id).not.toBe(first.json().lease_status.lease_id);
    expectLeaseSafe(duplicate.json());
    expectLeaseSafe(reclaimed.json());

    await app.close();
  }, 20_000);

  it("rejects blocked states and attempted execution boundaries", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox } = await createInternalOutbox(app, "outbox_lease_guards");

    const cases: Array<[string, Partial<ReactionDispatchInternalOutboxMetadata>]> = [
      ["cancelled_internal", { outbox_status: "cancelled_internal" }],
      ["blocked_internal", { outbox_status: "blocked_internal" }],
      ["external_attempted", { external_delivery_status: "attempted" as ReactionDispatchInternalOutboxMetadata["external_delivery_status"] }],
      ["adapter_attempted", { adapter_execution_status: "executed" as ReactionDispatchInternalOutboxMetadata["adapter_execution_status"] }]
    ];

    for (const [name, patch] of cases) {
      const candidate = { ...outbox, ...patch, outbox_id: `${outbox.outbox_id}_${name}`, boundary_id: `${outbox.boundary_id}_${name}` };
      await repo.setReactionDispatchInternalOutboxIfAbsent(candidate);
      const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${candidate.outbox_id}/lease`, headers: { authorization: adminAuth } });
      expect(response.statusCode).toBe(409);
      expect(response.json().lease_status.lease_status).toBe("lease_blocked");
      expect(response.json().lease_status.safe_reason_codes).toContain("external_execution_forbidden");
      expectLeaseSafe(response.json());
    }

    await app.close();
  }, 20_000);

  it("extends active lease, fails expired lease, and releases idempotently", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox } = await createInternalOutbox(app, "outbox_lease_extend_release");
    const created = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
    const leaseId = created.json().lease_status.lease_id;

    const mismatch = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease/extend`, headers: { authorization: adminAuth }, payload: { lease_id: "rdlease_mismatch" } });
    const extended = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease/extend`, headers: { authorization: adminAuth }, payload: { lease_id: leaseId } });
    const released = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease/release`, headers: { authorization: adminAuth }, payload: { lease_id: leaseId } });
    const releasedAgain = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease/release`, headers: { authorization: adminAuth }, payload: { lease_id: leaseId } });
    await repo.setReactionDispatchInternalOutboxLease({
      ...created.json().lease_status,
      lease_expires_at: "2000-01-01T00:00:00.000Z",
      updated_at: "2000-01-01T00:00:00.000Z"
    });
    const expiredExtend = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease/extend`, headers: { authorization: adminAuth }, payload: { lease_id: leaseId } });

    expect(mismatch.statusCode).toBe(409);
    expect(extended.statusCode).toBe(200);
    expect(extended.json().lease_status.safe_reason_codes).toContain("lease_extended");
    expect(released.statusCode).toBe(200);
    expect(released.json().lease_status.lease_status).toBe("lease_released");
    expect(releasedAgain.statusCode).toBe(200);
    expect(releasedAgain.json().idempotent).toBe(true);
    expect(expiredExtend.statusCode).toBe(409);
    expect(expiredExtend.json().lease_status.lease_status).toBe("lease_expired");
    expectLeaseSafe(mismatch.json());
    expectLeaseSafe(extended.json());
    expectLeaseSafe(released.json());
    expectLeaseSafe(expiredExtend.json());

    await app.close();
  }, 20_000);

  it("committed internal outbox lease evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-internal-outbox-lease.json");

    expect(evidence.reactionDispatchInternalOutboxLeaseStatus).toBe("implemented");
    expect(evidence.outboxLeaseStatus).toBe("pass");
    expect(evidence.outboxLeaseIdempotencyStatus).toBe("pass");
    expect(evidence.outboxLeaseExpiryStatus).toBe("pass");
    expect(evidence.outboxLeaseExtendStatus).toBe("pass");
    expect(evidence.outboxLeaseReleaseStatus).toBe("pass");
    expect(evidence.outboxLeaseStateGuardStatus).toBe("pass");
    expect(evidence.externalDeliveryNotAttemptedGuardStatus).toBe("pass");
    expect(evidence.adapterNotExecutedGuardStatus).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.readOnlySupportEventStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.redisDependencyAdded).toBe(false);
    expect(evidence.kafkaDependencyAdded).toBe(false);
    expect(evidence.realTtsCallUsed).toBe(false);
    expect(evidence.realLive2dCallUsed).toBe(false);
    expect(evidence.realRendererCallUsed).toBe(false);
    expect(evidence.realObsCallUsed).toBe(false);
    expect(evidence.realWebSocketDeliveryUsed).toBe(false);
    expect(evidence.irisCoreCallUsed).toBe(false);
    expect(evidence.voxweaveCallUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
