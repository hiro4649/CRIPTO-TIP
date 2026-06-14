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

function supportReceived(sourceEventId: string, streamId = "str_admin_audit_export") {
  const normalized = normalizeYouTubeSuperChatToSupportReceived({
    live_chat_message_id: sourceEventId,
    stream_id: streamId,
    youtube_video_id: "yt_video_admin_audit_export",
    character_id: "char_mio",
    author_channel_id: "UC_ADMIN_AUDIT_EXPORT",
    author_display_name: "Ren",
    amount_micros: "1000000",
    currency: "JPY",
    amount_display_string: "JPY 1,000",
    tier: 3,
    user_comment: "export endpoint must not expose this raw comment",
    published_at: "2026-06-14T00:00:00.000Z"
  }, { previous: 0, delta: 15, next: 15 });
  return {
    ...normalized,
    viewer: { ...normalized.viewer, iris_user_id: "ytusr_admin_audit_export" }
  };
}

class FailingOutboxRepository extends InMemoryRepository {
  constructor(private readonly failingPrefix: string) {
    super();
  }

  async enqueueOutbox(input: Parameters<InMemoryRepository["enqueueOutbox"]>[0]): Promise<OutboxEvent> {
    if (input.idempotency_key.startsWith(this.failingPrefix)) {
      throw new Error("simulated enqueue failure with Bearer hidden postgres://hidden redis://hidden");
    }
    return super.enqueueOutbox(input);
  }
}

async function createListAndRetryAudit(repo = new FailingOutboxRepository("reaction.request:")) {
  const app = buildServer(repo);
  await app.ready();
  await app.inject({
    method: "POST",
    url: "/internal/events",
    headers: { authorization: internalAuth },
    payload: supportReceived("yt_admin_audit_export_1")
  });
  await app.inject({
    method: "GET",
    url: "/admin/live-sessions/str_admin_audit_export/dlq",
    headers: { authorization: adminAuth }
  });
  const dead = [...repo.deadLetterEvents.values()][0];
  if (!dead) throw new Error("missing dead letter");
  await app.inject({
    method: "POST",
    url: `/admin/dead-letter/${dead.id}/retry`,
    headers: { authorization: adminAuth },
    payload: { actor_id: "admin-1" }
  });
  return { app, repo, dead };
}

function expectSafeSerialized(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("export endpoint must not expose this raw comment");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("redis://");
  expect(serialized).not.toContain("kafka://");
  expect(serialized).not.toContain("database_url");
  expect(serialized).not.toContain("wallet_private_key");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("oauth_token");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
}

describe("P0 admin DLQ audit export safe summary", () => {
  it("requires admin auth before listing audit logs", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const missing = await app.inject({ method: "GET", url: "/admin/audit-logs" });
    const invalid = await app.inject({
      method: "GET",
      url: "/admin/audit-logs",
      headers: { authorization: "Bearer wrong-token" }
    });

    expect(missing.statusCode).toBe(401);
    expect(invalid.statusCode).toBe(401);

    await app.close();
  });

  it("lists safe audit summaries without raw payloads or secrets", async () => {
    const { app } = await createListAndRetryAudit();

    const response = await app.inject({
      method: "GET",
      url: "/admin/audit-logs",
      headers: { authorization: adminAuth }
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.audit_logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "list_dead_letters",
          target_type: "dlq_list",
          target_id: "str_admin_audit_export",
          after_json: { stream_id: "str_admin_audit_export", result_count: 1 }
        }),
        expect.objectContaining({
          action: "retry_dead_letter",
          target_type: "dead_letter_event",
          actor_id: "admin-1"
        })
      ])
    );
    expectSafeSerialized(body);

    await app.close();
  }, 20_000);

  it("filters audit summaries by action target type and stream id", async () => {
    const { app } = await createListAndRetryAudit();

    const action = await app.inject({
      method: "GET",
      url: "/admin/audit-logs?action=list_dead_letters",
      headers: { authorization: adminAuth }
    });
    const target = await app.inject({
      method: "GET",
      url: "/admin/audit-logs?target_type=dead_letter_event",
      headers: { authorization: adminAuth }
    });
    const stream = await app.inject({
      method: "GET",
      url: "/admin/audit-logs?stream_id=str_admin_audit_export",
      headers: { authorization: adminAuth }
    });

    expect(action.json().audit_logs).toHaveLength(1);
    expect(action.json().audit_logs[0].action).toBe("list_dead_letters");
    expect(target.json().audit_logs).toHaveLength(1);
    expect(target.json().audit_logs[0].target_type).toBe("dead_letter_event");
    expect(stream.json().audit_logs.map((log: { action: string }) => log.action)).toContain("list_dead_letters");
    expect(stream.json().audit_logs.map((log: { action: string }) => log.action)).not.toContain("retry_dead_letter");

    await app.close();
  }, 20_000);

  it("enforces audit action and target type allowlists", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const action = await app.inject({
      method: "GET",
      url: "/admin/audit-logs?action=export_raw_payload",
      headers: { authorization: adminAuth }
    });
    const target = await app.inject({
      method: "GET",
      url: "/admin/audit-logs?target_type=raw_payload",
      headers: { authorization: adminAuth }
    });

    expect(action.statusCode).toBe(400);
    expect(target.statusCode).toBe(400);

    await app.close();
  });

  it("redacts unsafe audit metadata and excludes unknown unsafe entries", async () => {
    const repo = new InMemoryRepository();
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin-1",
      action: "list_dead_letters",
      target_type: "dlq_list",
      target_id: "str_admin_audit_export",
      after_json: {
        stream_id: "str_admin_audit_export",
        raw_payload: "hidden",
        database_url: "postgres://hidden",
        wallet_private_key: "hidden",
        oauth_token: "hidden",
        logs_url: "https://example.invalid/logs"
      }
    });
    await repo.writeAuditLog({
      actor_type: "admin",
      action: "export_raw_payload",
      target_type: "raw_payload",
      target_id: "unsafe",
      after_json: { raw_payload: "hidden", secret: "hidden" }
    });
    const app = buildServer(repo);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/admin/audit-logs",
      headers: { authorization: adminAuth }
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.audit_logs).toHaveLength(1);
    expect(body.audit_logs[0].after_json).toEqual({ redacted: true });
    expect(body.audit_logs.map((log: { action: string }) => log.action)).not.toContain("export_raw_payload");
    expectSafeSerialized(body);

    await app.close();
  });

  it("preserves duplicate audit bounding and moderation hold DLQ separation", async () => {
    const { app, repo, dead } = await createListAndRetryAudit();

    await app.inject({
      method: "POST",
      url: `/admin/dead-letter/${dead.id}/retry`,
      headers: { authorization: adminAuth },
      payload: { actor_id: "admin-1" }
    });
    const held = await app.inject({
      method: "POST",
      url: "/internal/events",
      headers: { authorization: internalAuth },
      payload: {
        ...supportReceived("yt_admin_audit_export_hold", "str_admin_audit_export_hold"),
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
      }
    });

    expect(held.statusCode).toBe(200);
    expect(repo.auditLogs.filter((log) => log.action === "retry_dead_letter" && log.target_id === dead.id)).toHaveLength(1);
    expect(repo.auditLogs.filter((log) => log.target_id === "str_admin_audit_export_hold")).toEqual([]);

    await app.close();
  }, 20_000);

  it("committed admin DLQ audit export evidence preserves safety boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-dlq-audit-export-safe-summary.json"), "utf8"));
    expect(evidence.adminDlqAuditExportStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.auditListStatus).toBe("pass");
    expect(evidence.actionFilterStatus).toBe("pass");
    expect(evidence.targetTypeFilterStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.auditActionAllowlistStatus).toBe("pass");
    expect(evidence.auditTargetAllowlistStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.unsafeAuditRedactionStatus).toBe("pass");
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
