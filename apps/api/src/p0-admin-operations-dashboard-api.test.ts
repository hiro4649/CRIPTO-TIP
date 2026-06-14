import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeYouTubeSuperChatToSupportReceived } from "@cripto-tip/shared";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { OutboxEvent } from "./repositories/types.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function supportReceived(sourceEventId: string, streamId = "str_admin_ops") {
  const normalized = normalizeYouTubeSuperChatToSupportReceived({
    live_chat_message_id: sourceEventId,
    stream_id: streamId,
    youtube_video_id: "yt_video_admin_ops",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_OPS",
    author_display_name: "Ren",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "operations summary must not expose this comment",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return { ...normalized, viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_ops" } };
}

class FailingOutboxRepository extends InMemoryRepository {
  async enqueueOutbox(input: Parameters<InMemoryRepository["enqueueOutbox"]>[0]): Promise<OutboxEvent> {
    if (input.idempotency_key.startsWith("reaction.request:")) throw new Error("simulated enqueue failure with Bearer hidden postgres://hidden");
    return super.enqueueOutbox(input);
  }
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("operations summary must not expose this comment");
  expect(serialized).not.toContain(mockValue("admin"));
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("fingerprint");
  expect(serialized).not.toContain("ip_address");
  expect(serialized).not.toContain("user_agent");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
}

describe("P0 admin operations dashboard API", () => {
  it("requires admin bearer token", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/operations/summary" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/operations/summary", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);

    await app.close();
  });

  it("returns safe DLQ audit and rate-limit metadata", async () => {
    const repo = new FailingOutboxRepository();
    const app = buildServer(repo);
    await app.ready();

    await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: supportReceived("yt_admin_ops_1") });
    await app.inject({ method: "GET", url: "/admin/live-sessions/str_admin_ops/dlq", headers: { authorization: adminAuth } });
    await app.inject({ method: "GET", url: "/admin/audit-logs", headers: { authorization: adminAuth } });

    const response = await app.inject({ method: "GET", url: "/admin/operations/summary", headers: { authorization: adminAuth } });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.dlq.total).toBe(1);
    expect(body.dlq.by_stream_id.str_admin_ops).toBe(1);
    expect(body.audit.action_counts.list_dead_letters).toBe(1);
    expect(body.rate_limit.storage).toBe("in_memory");
    expect(body.rate_limit.key_material).toBe("redacted");
    expect(body.rate_limit.active_buckets_by_scope.dlq_list).toBe(1);
    expect(body.rate_limit.active_buckets_by_scope.audit_export).toBe(1);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("filters summary by stream_id", async () => {
    const repo = new FailingOutboxRepository();
    const app = buildServer(repo);
    await app.ready();

    await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: supportReceived("yt_admin_ops_a", "str_admin_ops_a") });
    await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: supportReceived("yt_admin_ops_b", "str_admin_ops_b") });

    const response = await app.inject({ method: "GET", url: "/admin/operations/summary?stream_id=str_admin_ops_a", headers: { authorization: adminAuth } });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.dlq.total).toBe(1);
    expect(body.dlq.by_stream_id).toEqual({ str_admin_ops_a: 1 });
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("does not affect internal support.received path", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const internal = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload: supportReceived("yt_admin_ops_internal") });
    const summary = await app.inject({ method: "GET", url: "/admin/operations/summary", headers: { authorization: adminAuth } });

    expect(internal.statusCode).toBe(200);
    expect(summary.statusCode).toBe(200);

    await app.close();
  }, 20_000);

  it("committed admin operations evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-operations-dashboard-api.json"), "utf8"));
    expect(evidence.adminOperationsSummaryStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.dlqCountStatus).toBe("pass");
    expect(evidence.streamGroupingStatus).toBe("pass");
    expect(evidence.auditCountStatus).toBe("pass");
    expect(evidence.rateLimitSummaryStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.rawTokenExcluded).toBe(true);
    expect(evidence.ipUserAgentExcluded).toBe(true);
    expect(evidence.internalEventsUnaffectedStatus).toBe("pass");
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
});
