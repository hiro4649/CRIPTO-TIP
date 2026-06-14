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

function supportReceived(sourceEventId: string, streamId = "str_admin_rate_limit") {
  const normalized = normalizeYouTubeSuperChatToSupportReceived({
    live_chat_message_id: sourceEventId,
    stream_id: streamId,
    youtube_video_id: "yt_video_admin_rate_limit",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_RATE_LIMIT",
    author_display_name: "Ren",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "rate-limit tests must not expose this comment",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return {
    ...normalized,
    viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_rate_limit" }
  };
}

class FailingOutboxRepository extends InMemoryRepository {
  constructor(private readonly failingPrefix: string) {
    super();
  }

  async enqueueOutbox(input: Parameters<InMemoryRepository["enqueueOutbox"]>[0]): Promise<OutboxEvent> {
    if (input.idempotency_key.startsWith(this.failingPrefix)) throw new Error("simulated enqueue failure");
    return super.enqueueOutbox(input);
  }
}

async function createDeadLetter() {
  const repo = new FailingOutboxRepository("reaction.request:");
  const app = buildServer(repo);
  await app.ready();
  await app.inject({
    method: "POST",
    url: "/internal/events",
    headers: { authorization: internalAuth },
    payload: supportReceived("yt_admin_rate_limit_1")
  });
  const dead = [...repo.deadLetterEvents.values()][0];
  if (!dead) throw new Error("missing dead letter");
  return { app, repo, dead };
}

function expectSafeRateLimitResponse(body: unknown) {
  const serialized = JSON.stringify(body);
  expect(body).toEqual(expect.objectContaining({
    error: "rate_limited",
    retry_after_seconds: expect.any(Number)
  }));
  expect(serialized).not.toContain(mockValue("admin"));
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("ip_address");
  expect(serialized).not.toContain("user_agent");
  expect(serialized).not.toContain("rate-limit tests must not expose this comment");
}

describe("P0 admin DLQ rate limit boundary", () => {
  it("rate-limits admin DLQ list after threshold", async () => {
    const { app } = await createDeadLetter();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/admin/live-sessions/str_admin_rate_limit/dlq",
        headers: { authorization: adminAuth }
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_rate_limit/dlq",
      headers: { authorization: adminAuth }
    });

    expect(limited.statusCode).toBe(429);
    expectSafeRateLimitResponse(limited.json());
    expect(limited.json().scope).toBe("dlq_list");

    await app.close();
  }, 20_000);

  it("rate-limits admin DLQ retry after threshold", async () => {
    const { app, dead } = await createDeadLetter();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: `/admin/dead-letter/${dead.id}/retry`,
        headers: { authorization: adminAuth },
        payload: { actor_id: "admin-1" }
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });

    expect(limited.statusCode).toBe(429);
    expectSafeRateLimitResponse(limited.json());
    expect(limited.json().scope).toBe("dlq_retry");

    await app.close();
  }, 20_000);

  it("rate-limits admin audit export after threshold", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/admin/audit-logs",
        headers: { authorization: adminAuth }
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "GET",
      url: "/admin/audit-logs",
      headers: { authorization: adminAuth }
    });

    expect(limited.statusCode).toBe(429);
    expectSafeRateLimitResponse(limited.json());
    expect(limited.json().scope).toBe("audit_export");

    await app.close();
  });

  it("keeps missing and invalid admin auth as 401 rather than 429", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await app.inject({ method: "GET", url: "/admin/audit-logs" })).statusCode).toBe(401);
      expect((await app.inject({ method: "GET", url: "/admin/audit-logs", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    }

    await app.close();
  });

  it("does not affect internal support.received path", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/internal/events",
        headers: { authorization: internalAuth },
        payload: supportReceived(`yt_admin_rate_limit_internal_${attempt}`, "str_internal_rate_limit")
      });
      expect(response.statusCode).toBe(200);
    }

    await app.close();
  }, 20_000);

  it("uses local in-memory state per server instance", async () => {
    const first = buildServer(new InMemoryRepository());
    const second = buildServer(new InMemoryRepository());
    await first.ready();
    await second.ready();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await first.inject({ method: "GET", url: "/admin/audit-logs", headers: { authorization: adminAuth } })).statusCode).toBe(200);
    }
    expect((await first.inject({ method: "GET", url: "/admin/audit-logs", headers: { authorization: adminAuth } })).statusCode).toBe(429);
    expect((await second.inject({ method: "GET", url: "/admin/audit-logs", headers: { authorization: adminAuth } })).statusCode).toBe(200);

    await first.close();
    await second.close();
  });

  it("committed admin DLQ rate-limit evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-dlq-rate-limit-boundary.json"), "utf8"));
    expect(evidence.adminDlqRateLimitStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.dlqListRateLimitStatus).toBe("pass");
    expect(evidence.dlqRetryRateLimitStatus).toBe("pass");
    expect(evidence.auditExportRateLimitStatus).toBe("pass");
    expect(evidence.safeRateLimitKeyStatus).toBe("pass");
    expect(evidence.rawTokenExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.internalEventsUnaffectedStatus).toBe("pass");
    expect(evidence.inMemoryOnlyStatus).toBe("pass");
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
