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

async function createAttemptPlan(app: ReturnType<typeof buildServer>, requestId = "dry_run_boundary") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "dry run boundary viewer",
      tier: "medium",
      message: "dry run boundary raw message 0x1111111111111111111111111111111111111111 https://private.example/hook adapter_url webhook_url Bearer secret",
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
  const boundary = boundaryResponse.json().boundary;
  const outboxResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
  expect(outboxResponse.statusCode).toBe(200);
  const outbox = outboxResponse.json().outbox;
  const leaseResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
  expect(leaseResponse.statusCode).toBe(200);
  const lease = leaseResponse.json().lease_status;
  const planResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(planResponse.statusCode).toBe(200);
  return { support, candidate, boundary, outbox, lease, plan: planResponse.json().attempt_plan };
}

function expectDryRunSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("dry run boundary raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("tts_text");
  expect(serialized).not.toContain("audio_url");
  expect(serialized).not.toContain("renderer_url");
}

describe("P0 reaction dispatch dry-run adapter boundary", () => {
  it("requires admin auth and returns 404 for unknown attempt plan", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/attempt-plans/rdplan_missing/dry-run-adapter-boundary", payload: { lease_id: "rdlease_missing" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/attempt-plans/rdplan_missing/dry-run-adapter-boundary", headers: { authorization: "Bearer wrong-token" }, payload: { lease_id: "rdlease_missing" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/attempt-plans/rdplan_missing/dry-run-adapter-boundary", headers: { authorization: adminAuth }, payload: { lease_id: "rdlease_missing" } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates safe dry-run adapter boundary preview without external execution or mutation", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, boundary, outbox, lease, plan } = await createAttemptPlan(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });

    expect(response.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json()).toEqual(response.json());
    expect(response.json().dry_run_boundary).toMatchObject({
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      candidate_id: candidate.candidate_id,
      boundary_id: boundary.boundary_id,
      support_event_id: support.event_id,
      stream_id: support.stream_id,
      character_id: support.character_id,
      adapter_kind: "iris_core_reaction",
      dry_run_boundary_status: "dry_run_ready",
      adapter_request_status: "preview_only",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0,
      request_preview_summary: {
        adapter_kind: "iris_core_reaction",
        execution_mode: "dry_run_preview_only",
        external_adapter_call: "not_performed",
        runtime_execution: "not_performed"
      }
    });
    expect(response.json().dry_run_boundary.dry_run_boundary_id).toMatch(/^rddry_[a-f0-9]{24}$/);
    expect(response.json().dry_run_boundary.request_preview_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectDryRunSafe(response.json());

    await app.close();
  }, 20_000);

  it("blocks mismatched lease without mutating state", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox, plan } = await createAttemptPlan(app, "dry_run_boundary_blocked");
    const before = await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id);

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: "rdlease_mismatch" } });

    expect(response.statusCode).toBe(409);
    expect(response.json().dry_run_boundary.dry_run_boundary_status).toBe("dry_run_blocked");
    expect(response.json().dry_run_boundary.safe_reason_codes).toContain("lease_id_mismatch");
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before);
    expectDryRunSafe(response.json());

    await app.close();
  }, 20_000);

  it("committed dry-run adapter boundary evidence preserves no-execution boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-dry-run-adapter-boundary.json");

    expect(evidence.reactionDispatchDryRunAdapterBoundaryStatus).toBe("implemented");
    expect(evidence.dryRunAdapterBoundaryStatus).toBe("pass");
    expect(evidence.safeRequestPreviewStatus).toBe("pass");
    expect(evidence.activeLeaseRequiredStatus).toBe("pass");
    expect(evidence.reviewedAttemptPlanRequiredStatus).toBe("pass");
    expect(evidence.noExternalAdapterCallStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.adapterUrlExcluded).toBe(true);
    expect(evidence.webhookUrlExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
