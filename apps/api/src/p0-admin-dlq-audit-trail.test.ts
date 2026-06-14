import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeYouTubeSuperChatToSupportReceived } from "@cripto-tip/shared";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { AuditLogInput, OutboxEvent } from "./repositories/types.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function supportReceived(overrides: Partial<ReturnType<typeof normalizeYouTubeSuperChatToSupportReceived>> = {}) {
  const normalized = normalizeYouTubeSuperChatToSupportReceived({
    live_chat_message_id: "yt_admin_dlq_audit_1",
    stream_id: "str_admin_dlq_audit",
    youtube_video_id: "yt_video_admin_dlq_audit",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_DLQ_AUDIT",
    author_display_name: "Ren",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "audit without exposing this raw message",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return {
    ...normalized,
    viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_dlq_audit" },
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

function expectSafeAuditLog(log: AuditLogInput, action: string, targetType: string) {
  expect(log.actor_type).toBe("admin");
  expect(["admin_mock", "admin-1"]).toContain(log.actor_id);
  expect(["list_dead_letters", "retry_dead_letter"]).toContain(log.action);
  expect(log.action).toBe(action);
  expect(["dlq_list", "dead_letter_event"]).toContain(log.target_type);
  expect(log.target_type).toBe(targetType);
  expect(log.target_id).toEqual(expect.any(String));
  expect(log.ip_address).toBeUndefined();
  expect(log.user_agent).toBeUndefined();
  const serialized = JSON.stringify(log);
  expect(serialized).not.toContain("audit without exposing this raw message");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("redis://");
  expect(serialized).not.toContain("kafka://");
  expect(serialized).not.toContain("database_url");
  expect(serialized).not.toContain("wallet_private_key");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("oauth_token");
}

describe("P0 admin DLQ audit trail", () => {
  it("writes safe audit metadata for admin DLQ list", async () => {
    const repo = new FailingOutboxRepository("reaction.request:");
    const app = buildServer(repo);
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived()
    });
    const response = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq_audit/dlq",
      headers: { authorization: adminAuth }
    });

    expect(response.statusCode).toBe(200);
    const audit = repo.auditLogs.find((log) => log.action === "list_dead_letters");
    if (!audit) throw new Error("missing list audit log");
    expectSafeAuditLog(audit, "list_dead_letters", "dlq_list");
    expect(audit.target_id).toBe("str_admin_dlq_audit");
    expect(audit.after_json).toEqual({ stream_id: "str_admin_dlq_audit", result_count: 1 });

    await app.close();
  }, 20_000);

  it("requires admin auth before writing DLQ list audit", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const missing = await app.inject({ method: "GET", url: "/admin/live-sessions/str_admin_dlq_audit/dlq" });
    expect(missing.statusCode).toBe(401);
    const invalid = await app.inject({
      method: "GET",
      url: "/admin/live-sessions/str_admin_dlq_audit/dlq",
      headers: { authorization: "Bearer wrong-token" }
    });
    expect(invalid.statusCode).toBe(401);
    expect(repo.auditLogs).toEqual([]);

    await app.close();
  });

  it("writes safe audit metadata for admin DLQ retry", async () => {
    const repo = new FailingOutboxRepository("overlay.emit:");
    const app = buildServer(repo);
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({ source_event_id: "yt_admin_dlq_audit_retry", event_id: "evt_admin_dlq_audit_retry" })
    });
    const dead = [...repo.deadLetterEvents.values()][0];
    if (!dead) throw new Error("missing dead letter");

    const response = await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });

    expect(response.statusCode).toBe(200);
    const audit = repo.auditLogs.find((log) => log.action === "retry_dead_letter");
    if (!audit) throw new Error("missing retry audit log");
    expectSafeAuditLog(audit, "retry_dead_letter", "dead_letter_event");
    expect(audit.target_id).toBe(dead.id);
    expect(audit.after_json).toEqual({ outbox_event_id: dead.original_event_id });

    await app.close();
  }, 20_000);

  it("bounds duplicate retry audit records", async () => {
    const repo = new FailingOutboxRepository("reaction.request:");
    const app = buildServer(repo);
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({ source_event_id: "yt_admin_dlq_audit_duplicate", event_id: "evt_admin_dlq_audit_duplicate" })
    });
    const dead = [...repo.deadLetterEvents.values()][0];
    if (!dead) throw new Error("missing dead letter");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: `/admin/dead-letter/${dead.id}/retry`,
        headers: { authorization: adminAuth },
        payload: { actor_id: "admin-1" }
      });
      expect(response.statusCode).toBe(200);
    }

    expect(repo.auditLogs.filter((log) => log.action === "retry_dead_letter" && log.target_id === dead.id)).toHaveLength(1);

    await app.close();
  }, 20_000);

  it("does not write unsafe audit data for unknown or unsafe retry targets", async () => {
    const repo = new InMemoryRepository();
    repo.deadLetterEvents.set("dlq_unsafe_audit", {
      id: "dlq_unsafe_audit",
      original_event_id: "outbox_unsafe_audit",
      job_type: "reaction.request",
      payload_json: {
        stream_id: "str_admin_dlq_audit",
        raw_payload: "do not return this",
        database_url: "postgres://hidden",
        wallet_private_key: "hidden",
        oauth_token: "hidden"
      },
      last_error: "hidden error with Bearer token",
      retry_count: 1,
      failed_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z"
    });
    const app = buildServer(repo);
    await app.ready();

    const unknown = await app.inject({
      method: "POST",
      url: "/admin/dead-letter/dlq_unknown_audit/retry",
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });
    const unsafe = await app.inject({
      method: "POST",
      url: "/admin/dead-letter/dlq_unsafe_audit/retry",
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });

    expect(unknown.statusCode).toBe(404);
    expect(unsafe.statusCode).toBe(422);
    expect(JSON.stringify(repo.auditLogs)).not.toContain("postgres://");
    expect(JSON.stringify(repo.auditLogs)).not.toContain("wallet_private_key");
    expect(JSON.stringify(repo.auditLogs)).not.toContain("oauth_token");
    expect(repo.auditLogs.filter((log) => log.action === "retry_dead_letter")).toEqual([]);

    await app.close();
  });

  it("does not create DLQ audit records for moderation hold without admin DLQ operations", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const held = await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: supportReceived({
        source_event_id: "yt_admin_dlq_audit_hold",
        event_id: "evt_admin_dlq_audit_hold",
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
    expect(repo.auditLogs.filter((log) => log.action === "list_dead_letters" || log.action === "retry_dead_letter")).toEqual([]);

    await app.close();
  });

  it("committed admin DLQ audit trail evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-dlq-audit-trail.json"), "utf8"));
    expect(evidence.adminDlqAuditTrailStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.dlqListAuditStatus).toBe("pass");
    expect(evidence.dlqRetryAuditStatus).toBe("pass");
    expect(evidence.auditActionAllowlistStatus).toBe("pass");
    expect(evidence.auditTargetAllowlistStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.duplicateAuditBoundedStatus).toBe("pass");
    expect(evidence.moderationHoldNotDlqAuditStatus).toBe("pass");
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
