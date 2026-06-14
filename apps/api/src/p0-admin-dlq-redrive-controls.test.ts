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
    live_chat_message_id: "yt_admin_dlq_redrive_1",
    stream_id: "str_admin_dlq_redrive",
    youtube_video_id: "yt_video_admin_dlq_redrive",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_DLQ_REDRIVE",
    author_display_name: "Mika",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "retry this without exposing raw text",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return {
    ...normalized,
    viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_dlq_redrive" },
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

function expectSafeRetryResponse(body: Record<string, unknown>, reasonCode: string) {
  expect(body).toEqual(expect.objectContaining({
    id: expect.any(String),
    original_event_id: expect.any(String),
    job_type: expect.any(String),
    retry_count: expect.any(Number),
    failed_at: expect.any(String),
    created_at: expect.any(String),
    retry_status: "retry_queued",
    retried_outbox_event_id: expect.any(String),
    event_id: expect.any(String),
    source: expect.any(String),
    source_event_id: expect.any(String),
    stream_id: expect.any(String),
    character_id: expect.any(String),
    reason_code: reasonCode
  }));
  expect(Object.keys(body).sort()).toEqual([
    "character_id",
    "created_at",
    "event_id",
    "failed_at",
    "id",
    "job_type",
    "original_event_id",
    "reason_code",
    "retried_outbox_event_id",
    "retry_count",
    "retry_status",
    "source",
    "source_event_id",
    "stream_id"
  ]);
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain("retry this without exposing raw text");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("redis://");
  expect(serialized).not.toContain("kafka://");
  expect(serialized).not.toContain("database_url");
  expect(serialized).not.toContain("wallet_private_key");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("raw_payload");
}

describe("P0 admin DLQ redrive controls", () => {
  it("requires admin bearer auth for DLQ redrive", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const missing = await app.inject({ method: "POST", url: "/admin/dead-letter/dlq_missing/retry" });
    expect(missing.statusCode).toBe(401);

    const invalid = await app.inject({
      method: "POST",
      url: "/admin/dead-letter/dlq_missing/retry",
      headers: { authorization: "Bearer wrong-token" }
    });
    expect(invalid.statusCode).toBe(401);

    await app.close();
  });

  it("returns 404 for unknown DLQ ids", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/admin/dead-letter/dlq_unknown/retry",
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "dead_letter_not_found" });

    await app.close();
  });

  it("requeues retry candidates with safe metadata only", async () => {
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
    const dead = [...repo.deadLetterEvents.values()][0];
    if (!dead) throw new Error("missing dead letter");

    const response = await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });
    expect(response.statusCode).toBe(200);
    expectSafeRetryResponse(response.json(), "reaction_enqueue_failed");
    expect(repo.outboxEvents.get(dead.original_event_id)?.status).toBe("pending");
    expect(repo.auditLogs).toContainEqual(expect.objectContaining({
      actor_type: "admin",
      actor_id: "admin-1",
      action: "retry_dead_letter",
      target_type: "dead_letter_event",
      target_id: dead.id,
      after_json: { outbox_event_id: dead.original_event_id }
    }));

    await app.close();
  }, 20_000);

  it("is idempotent for duplicate redrive requests", async () => {
    const repo = new FailingOutboxRepository("overlay.emit:");
    const app = buildServer(repo);
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({ source_event_id: "yt_admin_dlq_redrive_duplicate", event_id: "evt_admin_dlq_redrive_duplicate" })
    });
    const dead = [...repo.deadLetterEvents.values()][0];
    if (!dead) throw new Error("missing dead letter");
    const beforeOutboxIds = [...repo.outboxEvents.keys()];

    const first = await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });
    const second = await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().retried_outbox_event_id).toBe(dead.original_event_id);
    expect(second.json().retried_outbox_event_id).toBe(dead.original_event_id);
    expect([...repo.outboxEvents.keys()].sort()).toEqual(beforeOutboxIds.sort());
    expect([...repo.outboxEvents.values()].filter((event) => event.id === dead.original_event_id)).toHaveLength(1);

    await app.close();
  }, 20_000);

  it("fail-closes unsafe payloads and unsupported reason codes", async () => {
    const repo = new InMemoryRepository();
    repo.deadLetterEvents.set("dlq_unsafe", {
      id: "dlq_unsafe",
      original_event_id: "outbox_unsafe",
      job_type: "reaction.request",
      payload_json: {
        stream_id: "str_admin_dlq_redrive",
        raw_payload: "do not return this",
        database_url: "postgres://hidden",
        wallet_private_key: "hidden"
      },
      last_error: "hidden error with Bearer token",
      retry_count: 1,
      failed_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z"
    } satisfies DeadLetterEvent);
    repo.deadLetterEvents.set("dlq_reason", {
      id: "dlq_reason",
      original_event_id: "outbox_reason",
      job_type: "reaction.request",
      payload_json: {
        event_id: "evt_reason",
        source: "youtube_super_chat",
        source_event_id: "yt_reason",
        stream_id: "str_admin_dlq_redrive",
        character_id: "char_mio",
        reason_code: "unsupported_failure"
      },
      last_error: "hidden",
      retry_count: 1,
      failed_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z"
    } satisfies DeadLetterEvent);
    const app = buildServer(repo);
    await app.ready();

    for (const id of ["dlq_unsafe", "dlq_reason"]) {
      const response = await app.inject({
        method: "POST",
        url: `/admin/dead-letter/${id}/retry`,
        headers: { authorization: adminAuth },
        payload: { actor_id: "admin-1" }
      });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ error: "dead_letter_not_retryable" });
      expect(JSON.stringify(response.json())).not.toContain("postgres://");
      expect(JSON.stringify(response.json())).not.toContain("wallet_private_key");
      expect(JSON.stringify(response.json())).not.toContain("Bearer");
    }

    await app.close();
  });

  it("does not make moderation hold events retryable as DLQ", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const held = await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({
        source_event_id: "yt_admin_dlq_redrive_hold",
        event_id: "evt_admin_dlq_redrive_hold",
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
    expect(repo.deadLetterEvents.size).toBe(0);

    await app.close();
  });

  it("committed admin DLQ redrive evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-dlq-redrive-controls.json"), "utf8"));
    expect(evidence.adminDlqRedriveStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.retryCandidateStatus).toBe("pass");
    expect(evidence.retryIdempotencyStatus).toBe("pass");
    expect(evidence.unknownDlqStatus).toBe("pass");
    expect(evidence.unsafePayloadFailClosedStatus).toBe("pass");
    expect(evidence.reasonCodeAllowlistStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.duplicateRetryStatus).toBe("pass");
    expect(evidence.moderationHoldNotRetryableStatus).toBe("pass");
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
