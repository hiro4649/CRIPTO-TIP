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

async function createDryRunBoundary(app: ReturnType<typeof buildServer>, requestId = "dry_run_review") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "dry run review viewer",
      tier: "medium",
      message: "dry run review raw message 0x1111111111111111111111111111111111111111 https://private.example/hook adapter_url webhook_url Authorization Bearer secret token",
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
  const plan = planResponse.json().attempt_plan;
  const dryRunResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(dryRunResponse.statusCode).toBe(200);
  return { support, candidate, boundary, outbox, lease, plan, dryRun: dryRunResponse.json().dry_run_boundary };
}

function expectDryRunReviewSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("dry run review raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("token");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("headers");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("tts_text");
  expect(serialized).not.toContain("audio_url");
  expect(serialized).not.toContain("renderer_url");
}

describe("P0 admin reaction dispatch dry-run review surface", () => {
  it("requires admin auth and returns 404 for unknown dry-run boundary", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/dry-run-boundaries" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/dry-run-boundaries/rddry_missing" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/dry-run-boundaries", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/dry-run-boundaries/rddry_missing", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("lists and details safe dry-run metadata without side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, boundary, outbox, lease, plan, dryRun } = await createDryRunBoundary(app);
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

    const list = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries?support_event_id=${support.event_id}&outbox_id=${outbox.outbox_id}&lease_id=${lease.lease_id}&plan_id=${plan.plan_id}&candidate_id=${candidate.candidate_id}&boundary_id=${boundary.boundary_id}&character_id=${support.character_id}&stream_id=${support.stream_id}&adapter_kind=iris_core_reaction&dry_run_status=dry_run_ready&limit=1`, headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}`, headers: { authorization: adminAuth } });

    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(list.json().dry_run_boundaries).toEqual([detail.json().dry_run_boundary]);
    expect(list.json().page).toEqual({ limit: 1, offset: 0, total: 1 });
    expect(detail.json().dry_run_boundary).toMatchObject({
      dry_run_boundary_id: dryRun.dry_run_boundary_id,
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      candidate_id: candidate.candidate_id,
      boundary_id: boundary.boundary_id,
      support_event_id: support.event_id,
      adapter_kind: "iris_core_reaction",
      dry_run_status: "dry_run_ready",
      plan_status: "planned_internal",
      outbox_status: "queued_internal",
      lease_status: "leased_internal",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0,
      validation_status: "candidate_ready",
      adapter_request_shape_summary: {
        adapter_kind: "iris_core_reaction",
        execution_mode: "dry_run_preview_only",
        request_body_included: false,
        auth_material_included: false
      }
    });
    expect(detail.json().dry_run_boundary.request_preview_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectDryRunReviewSafe(list.json());
    expectDryRunReviewSafe(detail.json());

    await app.close();
  }, 20_000);

  it("filters blocked dry-run previews safely", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { outbox, lease, plan } = await createDryRunBoundary(app, "dry_run_review_blocked");
    await repo.setReactionDispatchInternalOutboxLease({ ...lease, lease_status: "lease_released", updated_at: new Date().toISOString() });

    const response = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries?plan_id=${plan.plan_id}&dry_run_status=dry_run_blocked`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(response.json().dry_run_boundaries).toHaveLength(1);
    expect(response.json().dry_run_boundaries[0]).toMatchObject({
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      dry_run_status: "dry_run_blocked",
      lease_status: "lease_released"
    });
    expect(response.json().dry_run_boundaries[0].blocking_reason_codes).toContain("lease_required");
    expectDryRunReviewSafe(response.json());

    await app.close();
  }, 20_000);

  it("committed dry-run review evidence preserves safe read-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-dry-run-review-surface.json");

    expect(evidence.adminReactionDispatchDryRunReviewSurfaceStatus).toBe("implemented");
    expect(evidence.dryRunReviewStatus).toBe("pass");
    expect(evidence.dryRunFilterStatus).toBe("pass");
    expect(evidence.dryRunSafeDetailStatus).toBe("pass");
    expect(evidence.adapterKindAllowlistStatus).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.readOnlySupportEventStatus).toBe("pass");
    expect(evidence.readOnlyOutboxStatus).toBe("pass");
    expect(evidence.readOnlyLeaseStatus).toBe("pass");
    expect(evidence.readOnlyAttemptPlanStatus).toBe("pass");
    expect(evidence.readOnlyDryRunBoundaryStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.adapterUrlExcluded).toBe(true);
    expect(evidence.webhookUrlExcluded).toBe(true);
    expect(evidence.headersExcluded).toBe(true);
    expect(evidence.tokensExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
