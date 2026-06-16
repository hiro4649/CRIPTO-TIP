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

async function createLeasedInternalOutbox(app: ReturnType<typeof buildServer>, requestId = "outbox_attempt_plan") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "outbox attempt plan viewer",
      tier: "medium",
      message: "attempt plan raw message 0x1111111111111111111111111111111111111111 https://private.example/hook",
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
  const outbox = outboxResponse.json().outbox as ReactionDispatchInternalOutboxMetadata;
  const leaseResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
  expect(leaseResponse.statusCode).toBe(200);
  return { support, candidate, outbox, lease: leaseResponse.json().lease_status };
}

function expectAttemptPlanSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("attempt plan raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
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
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
}

describe("P0 reaction dispatch internal outbox attempt planning", () => {
  it("requires admin auth and returns 404 for unknown outbox", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/attempt-plan" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/attempt-plan" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/attempt-plan", headers: { authorization: "Bearer wrong-token" }, payload: { lease_id: "rdlease_bad" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/outbox/missing/attempt-plan", headers: { authorization: adminAuth }, payload: { lease_id: "rdlease_bad" } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing/attempt-plan", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates internal attempt plan from active lease without runtime execution", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, outbox, lease } = await createLeasedInternalOutbox(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      internalOutbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      audit: repo.auditLogs.length
    };

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
    const status = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(status.statusCode).toBe(200);
    expect(response.json().attempt_plan).toMatchObject({
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      attempt_plan_status: "planned_internal",
      planned_adapter_type: "iris_core_reaction_dispatch",
      planned_action: "reaction_dispatch",
      created_by_actor_type: "admin",
      safe_reason_codes: ["attempt_plan_created", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]
    });
    expect(response.json().attempt_plan.plan_id).toMatch(/^rdplan_[a-f0-9]{24}$/);
    expect(response.json().attempt_plan.plan_context_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(duplicate.json().idempotent).toBe(true);
    expect(status.json().attempt_plan).toEqual(response.json().attempt_plan);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.internalOutbox);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_internal_outbox_attempt_plan_created",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: outbox.outbox_id
    });
    expectAttemptPlanSafe(response.json());
    expectAttemptPlanSafe(duplicate.json());
    expectAttemptPlanSafe(status.json());
    expectAttemptPlanSafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("blocks missing mismatched expired and released lease planning", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox, lease } = await createLeasedInternalOutbox(app, "attempt_plan_lease_guards");

    const mismatch = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: "rdlease_mismatch" } });
    await repo.setReactionDispatchInternalOutboxLease({ ...lease, lease_expires_at: "2000-01-01T00:00:00.000Z", updated_at: "2000-01-01T00:00:00.000Z" });
    const expired = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
    await repo.setReactionDispatchInternalOutboxLease({ ...lease, lease_status: "lease_released", updated_at: new Date().toISOString() });
    const released = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });

    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json().attempt_plan.safe_reason_codes).toContain("lease_id_mismatch");
    expect(expired.statusCode).toBe(409);
    expect(expired.json().attempt_plan.safe_reason_codes).toContain("lease_expired");
    expect(released.statusCode).toBe(409);
    expect(released.json().attempt_plan.safe_reason_codes).toContain("lease_required");
    expectAttemptPlanSafe(mismatch.json());
    expectAttemptPlanSafe(expired.json());
    expectAttemptPlanSafe(released.json());

    await app.close();
  }, 20_000);

  it("blocks non-queued or attempted execution states without mutating outbox", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox, lease } = await createLeasedInternalOutbox(app, "attempt_plan_state_guards");

    const cases: Array<[string, Partial<ReactionDispatchInternalOutboxMetadata>]> = [
      ["cancelled_internal", { outbox_status: "cancelled_internal" }],
      ["blocked_internal", { outbox_status: "blocked_internal" }],
      ["external_attempted", { external_delivery_status: "attempted" as ReactionDispatchInternalOutboxMetadata["external_delivery_status"] }],
      ["adapter_attempted", { adapter_execution_status: "executed" as ReactionDispatchInternalOutboxMetadata["adapter_execution_status"] }],
      ["dispatch_count", { dispatch_attempt_count: 1 }]
    ];

    for (const [name, patch] of cases) {
      const candidate = { ...outbox, ...patch, outbox_id: `${outbox.outbox_id}_${name}`, boundary_id: `${outbox.boundary_id}_${name}` };
      await repo.setReactionDispatchInternalOutboxIfAbsent(candidate);
      await repo.setReactionDispatchInternalOutboxLease({ ...lease, outbox_id: candidate.outbox_id });
      const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${candidate.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
      expect(response.statusCode).toBe(409);
      expect(response.json().attempt_plan.attempt_plan_status).toBe("plan_blocked");
      expect(response.json().attempt_plan.safe_reason_codes).toContain("external_execution_forbidden");
      expect(await repo.getReactionDispatchInternalOutbox(candidate.outbox_id)).toEqual(candidate);
      expectAttemptPlanSafe(response.json());
    }

    await app.close();
  }, 20_000);

  it("committed attempt planning evidence preserves no-execution boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-internal-outbox-attempt-planning.json");

    expect(evidence.reactionDispatchInternalOutboxAttemptPlanningStatus).toBe("implemented");
    expect(evidence.attemptPlanStatus).toBe("pass");
    expect(evidence.activeLeaseRequiredStatus).toBe("pass");
    expect(evidence.leaseIdMatchRequiredStatus).toBe("pass");
    expect(evidence.outboxQueuedOnlyStatus).toBe("pass");
    expect(evidence.externalDeliveryNotAttemptedGuardStatus).toBe("pass");
    expect(evidence.adapterNotExecutedGuardStatus).toBe("pass");
    expect(evidence.dispatchAttemptCountUnchangedStatus).toBe("pass");
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
