import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeYouTubeSuperChatToSupportReceived } from "@cripto-tip/shared";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { DeadLetterEvent, OutboxEvent } from "./repositories/types.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function supportReceived(overrides: Partial<ReturnType<typeof normalizeYouTubeSuperChatToSupportReceived>> = {}) {
  const normalized = normalizeYouTubeSuperChatToSupportReceived({
    live_chat_message_id: "yt_admin_dlq_1",
    stream_id: "str_admin_dlq",
    youtube_video_id: "yt_video_admin_dlq",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_DLQ",
    author_display_name: "Nana",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "please read this but do not leak it",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return {
    ...normalized,
    viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_dlq" },
    ...overrides
  };
}

class FailingOutboxRepository extends InMemoryRepository {
  constructor(private readonly failingPrefix: string) {
    super();
  }

  async enqueueOutbox(input: Parameters<InMemoryRepository["enqueueOutbox"]>[0]): Promise<OutboxEvent> {
    if (input.idempotency_key.startsWith(this.failingPrefix)) {
      throw new Error("simulated enqueue failure with Authorization Bearer hidden detail postgres://hidden redis://hidden");
    }
    return super.enqueueOutbox(input);
  }
}

function expectAdminDlqSafeEntry(entry: Record<string, unknown>, reasonCode: string) {
  expect(entry).toEqual(expect.objectContaining({
    id: expect.any(String),
    original_event_id: expect.any(String),
    job_type: expect.any(String),
    retry_count: expect.any(Number),
    failed_at: expect.any(String),
    created_at: expect.any(String),
    retry_status: "candidate",
    event_id: expect.any(String),
    source: expect.any(String),
    source_event_id: expect.any(String),
    stream_id: expect.any(String),
    character_id: expect.any(String),
    reason_code: reasonCode
  }));
  expect(Object.keys(entry).sort()).toEqual([
    "character_id",
    "created_at",
    "event_id",
    "failed_at",
    "id",
    "job_type",
    "original_event_id",
    "reason_code",
    "retry_count",
    "retry_status",
    "source",
    "source_event_id",
    "stream_id"
  ]);
  const serialized = JSON.stringify(entry);
  expect(serialized).not.toContain("please read this");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("redis://");
  expect(serialized).not.toContain("kafka://");
  expect(serialized).not.toContain("database_url");
  expect(serialized).not.toContain("wallet_private_key");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
}

describe("P0 admin DLQ visibility", () => {
  it("requires admin bearer auth for the DLQ list", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const missing = await app.inject({ method: "GET", url: "/admin/live-sessions/str_admin_dlq/dlq" });
    expect(missing.statusCode).toBe(401);

    const invalid = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq/dlq",
      headers: { authorization: "Bearer wrong-token" }
    });
    expect(invalid.statusCode).toBe(401);

    await app.close();
  });

  it("returns DLQ safe summary entries filtered by stream_id", async () => {
    const repo = new FailingOutboxRepository("reaction.request:");
    const app = buildServer(repo);
    await app.ready();

    const created = await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived()
    });
    expect(created.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq/dlq",
      headers: { authorization: adminAuth }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dead_letters).toHaveLength(1);
    expectAdminDlqSafeEntry(body.dead_letters[0], "reaction_enqueue_failed");

    const otherStream = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_other/dlq",
      headers: { authorization: adminAuth }
    });
    expect(otherStream.statusCode).toBe(200);
    expect(otherStream.json().dead_letters).toEqual([]);

    repo.deadLetterEvents.set("dlq_unsafe", {
      id: "dlq_unsafe",
      original_event_id: "outbox_unsafe",
      job_type: "reaction.request",
      payload_json: {
        stream_id: "str_admin_dlq",
        raw_payload: "do not return this",
        oauth_token: "oauth_hidden",
        database_url: "postgres://hidden",
        private_url: "https://private.example/internal",
        stack: "stack trace hidden"
      },
      last_error: "hidden error with Bearer token",
      retry_count: 1,
      failed_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z"
    } satisfies DeadLetterEvent);
    const unsafeResponse = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq/dlq",
      headers: { authorization: adminAuth }
    });
    expect(unsafeResponse.statusCode).toBe(200);
    expect(unsafeResponse.json().dead_letters).toHaveLength(2);
    const entry = (unsafeResponse.json().dead_letters as Record<string, unknown>[]).find((item) => item.id === "dlq_unsafe");
    expect(entry).toEqual({
      id: "dlq_unsafe",
      original_event_id: "outbox_unsafe",
      job_type: "reaction.request",
      retry_count: 1,
      failed_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z",
      retry_status: "candidate"
    });
    const serialized = JSON.stringify(unsafeResponse.json());
    expect(serialized).not.toContain("raw_payload");
    expect(serialized).not.toContain("do not return this");
    expect(serialized).not.toContain("oauth_hidden");
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("private.example");
    expect(serialized).not.toContain("stack");
    expect(serialized).not.toContain("Bearer");

    await app.close();
  }, 20_000);

  it("does not duplicate admin DLQ list entries for duplicate retry input", async () => {
    const repo = new FailingOutboxRepository("overlay.emit:");
    const app = buildServer(repo);
    await app.ready();

    const payload = supportReceived({ source_event_id: "yt_admin_dlq_duplicate", event_id: "evt_admin_dlq_duplicate" });
    const first = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload });
    const duplicate = await app.inject({ method: "POST", url: "/internal/events", headers: { authorization: internalAuth }, payload });
    expect(first.statusCode).toBe(200);
    expect(duplicate.json().duplicate).toBe(true);

    const response = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq/dlq",
      headers: { authorization: adminAuth }
    });
    expect(response.json().dead_letters).toHaveLength(1);
    expectAdminDlqSafeEntry(response.json().dead_letters[0], "overlay_enqueue_failed");

    await app.close();
  }, 20_000);

  it("does not include moderation hold events in the admin DLQ list", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const held = await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({
        source_event_id: "yt_admin_dlq_hold",
        event_id: "evt_admin_dlq_hold",
        support: {
          amount_raw: "1000000",
          amount_display: "JPY 1,000",
          tier: "large",
          message: "hold this message",
          message_moderation_status: "hold"
        },
        relationship: { previous_affinity: 0, affinity_delta: 0, new_affinity: 0, relationship_level: 0 },
        reaction_policy: {
          can_say_name: false,
          can_read_message: false,
          max_speech_seconds: 12,
          must_not_discuss_token_price: true,
          must_not_promise_financial_return: true
        }
      })
    });
    expect(held.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq/dlq",
      headers: { authorization: adminAuth }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().dead_letters).toEqual([]);

    await app.close();
  });

  it("committed admin DLQ visibility evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-dlq-visibility.json"), "utf8"));
    expect(evidence.adminDlqVisibilityStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.dlqSafeSummaryStatus).toBe("pass");
    expect(evidence.streamFilterStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.duplicateDlqListStatus).toBe("pass");
    expect(evidence.moderationHoldNotDlqStatus).toBe("pass");
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
