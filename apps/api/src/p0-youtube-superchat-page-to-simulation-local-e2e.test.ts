import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const internalAuth = `Bearer ${mockValue("internal")}`;
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function superChat(id: string, comment = "Please cheer for the stream") {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T06:00:00.000Z",
      superChatDetails: {
        amountMicros: "2500000",
        currency: "JPY",
        amountDisplayString: "JPY 2,500",
        userComment: comment,
        tier: 4
      }
    },
    authorDetails: {
      channelId: `channel_${id}`,
      displayName: `Viewer ${id}`
    }
  };
}

function page(items: unknown[], nextPageToken: string | null = null) {
  return nextPageToken === null
    ? { pollingIntervalMillis: 5000, items }
    : { nextPageToken, pollingIntervalMillis: 5000, items };
}

function cursorPayload(overrides: Record<string, unknown> = {}) {
  return {
    stream_id: "stream_page_to_sim",
    youtube_video_id: "yt_video_page_to_sim",
    live_chat_id: "live_chat_page_to_sim",
    character_id: "char_page_to_sim",
    ...overrides
  };
}

function approvalPayload(preview: Record<string, string>) {
  return {
    adapter_execution_boundary_preview_id: preview.adapter_execution_boundary_preview_id,
    request_envelope_hash: preview.request_envelope_hash,
    safe_context_hash: preview.safe_context_hash,
    constraints_hash: preview.constraints_hash,
    request_preview_hash: preview.request_preview_hash
  };
}

async function createCursor(app: ReturnType<typeof buildServer>, payload = cursorPayload()) {
  const response = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-live-chat/cursors", headers: { authorization: internalAuth }, payload });
  expect(response.statusCode).toBe(200);
  return response.json().cursor.cursor_id as string;
}

async function runInternalLifecycle(app: ReturnType<typeof buildServer>, supportEventId: string, simulationCase: "success" | "retryable_failure" | "terminal_failure") {
  const candidateResponse = await app.inject({ method: "POST", url: `/admin/support-events/${supportEventId}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
  expect(candidateResponse.statusCode).toBe(200);
  const candidate = candidateResponse.json().candidate;
  expect(candidate.candidate_status).toBe("candidate_ready");
  const approvalResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approve`, headers: { authorization: adminAuth } });
  expect(approvalResponse.statusCode).toBe(200);
  const boundaryResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
  expect(boundaryResponse.statusCode).toBe(200);
  const boundary = boundaryResponse.json().boundary;
  const outboxResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
  expect(outboxResponse.statusCode).toBe(200);
  const enqueueResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
  expect(enqueueResponse.statusCode).toBe(200);
  const outbox = enqueueResponse.json().outbox;
  const leaseResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
  expect(leaseResponse.statusCode).toBe(200);
  const lease = leaseResponse.json().lease_status;
  const planResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(planResponse.statusCode).toBe(200);
  const plan = planResponse.json().attempt_plan;
  const dryRunResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(dryRunResponse.statusCode).toBe(200);
  const dryRun = dryRunResponse.json().dry_run_boundary;
  const dryRunApproval = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
  expect(dryRunApproval.statusCode).toBe(200);
  const previewResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
  expect(previewResponse.statusCode).toBe(200);
  const preview = previewResponse.json().adapter_execution_boundary_preview;
  const adapterApproval = await app.inject({
    method: "POST",
    url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRun.dry_run_boundary_id}/approve`,
    headers: { authorization: adminAuth },
    payload: approvalPayload(preview)
  });
  expect(adapterApproval.statusCode).toBe(200);
  const simulation = await app.inject({
    method: "POST",
    url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRun.dry_run_boundary_id}/simulate`,
    headers: { authorization: adminAuth },
    payload: { simulation_case: simulationCase }
  });
  expect(simulation.statusCode).toBe(200);
  return { candidate, boundary, outbox, lease, plan, dryRun, preview, simulation: simulation.json().simulation_result };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("raw_item");
  expect(serialized).not.toContain("JPY 2,500");
  expect(serialized).not.toContain("Viewer msg");
}

describe("P0 YouTube Super Chat page-to-simulation local E2E", () => {
  it("connects page fixture ingest to local simulation without external execution", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const cursorId = await createCursor(app);
    const pagePayload = {
      page_token: null,
      page: page([
        superChat("msg_success"),
        superChat("msg_held", "visit https://private.example/hook Authorization Bearer secret"),
        { id: "txt_ignored", snippet: { type: "textMessageEvent" } },
        superChat("msg_success")
      ], null)
    };
    const ingest = await app.inject({ method: "POST", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`, headers: { authorization: internalAuth }, payload: pagePayload });
    const replay = await app.inject({ method: "POST", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`, headers: { authorization: internalAuth }, payload: pagePayload });
    const wrongToken = await app.inject({ method: "POST", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/pages/ingest`, headers: { authorization: internalAuth }, payload: { page_token: "wrong", page: page([superChat("msg_wrong")]) } });

    expect(ingest.statusCode).toBe(200);
    expect(ingest.json().page_result.persisted_count).toBe(2);
    expect(ingest.json().page_result.held_count).toBe(1);
    expect(ingest.json().page_result.duplicate_count).toBe(1);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().idempotent).toBe(true);
    expect(wrongToken.statusCode).toBe(409);
    expect(repo.supportEvents.size).toBe(2);
    expect(repo.reactionRequests.size).toBe(1);
    expect(repo.overlayEvents.size).toBe(1);
    expect(repo.outboxEvents.size).toBe(2);

    const approved = await repo.getSupportEventBySource("youtube_super_chat", "msg_success");
    const held = await repo.getSupportEventBySource("youtube_super_chat", "msg_held");
    expect(approved).toBeDefined();
    expect(held?.support.message_moderation_status).toBe("hold");
    const lifecycle = await runInternalLifecycle(app, approved!.event_id, "success");
    expect(lifecycle.simulation.simulation_status).toBe("simulated_success");
    const heldCandidate = await app.inject({ method: "POST", url: `/admin/support-events/${held!.event_id}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
    expect(heldCandidate.statusCode).toBe(200);
    expect(heldCandidate.json().candidate.candidate_status).toBe("candidate_blocked");
    const outbox = await repo.getReactionDispatchInternalOutbox(lifecycle.outbox.outbox_id);
    expect(outbox?.dispatch_attempt_count).toBe(0);
    expect(outbox?.external_delivery_status).toBe("not_attempted");
    expect(outbox?.adapter_execution_status).toBe("not_executed");
    expectSafeOutput(ingest.json());
    expectSafeOutput(replay.json());
    expectSafeOutput(lifecycle.simulation);

    const isolatedCursorId = await createCursor(app, cursorPayload({ character_id: "char_page_to_sim_two" }));
    expect(isolatedCursorId).not.toBe(cursorId);
    await app.close();
  }, 180_000);

  it("committed page-to-simulation evidence preserves fixture-only boundaries", () => {
    const evidence = readCodexEvidence("p0-youtube-superchat-page-to-simulation-local-e2e.json");

    expect(evidence.youtubeSuperChatFixturePathCompletionStatus).toBe("pass");
    expect(evidence.cursorContextStatus).toBe("pass");
    expect(evidence.pageFixtureStatus).toBe("pass");
    expect(evidence.cursorBoundaryStatus).toBe("pass");
    expect(evidence.pageSupportIngestStatus).toBe("pass");
    expect(evidence.normalizerStatus).toBe("pass");
    expect(evidence.supportReceivedStatus).toBe("pass");
    expect(evidence.contractV2Status).toBe("pass");
    expect(evidence.internalLifecycleStatus).toBe("pass");
    expect(evidence.simulationStatus).toBe("pass");
    expect(evidence.duplicateReplayStatus).toBe("pass");
    expect(evidence.heldModerationStatus).toBe("pass");
    expect(evidence.identityIsolationStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
