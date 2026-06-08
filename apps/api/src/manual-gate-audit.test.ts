import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeManualGate, targetCommitSha } from "./manual-gates.test-support.js";
import { createManualGateAuditRecord } from "./manual-gate-audit.js";
import { InMemoryAuditLogRepository } from "./repositories/audit-log-repository.js";
import { InMemoryManualGatePersistentRepository } from "./repositories/manual-gate-repository.js";

const createdAt = "2026-06-08T00:00:00.000Z";

function auditRecord(overrides = {}) {
  return {
    id: "manual-gate-audit-1",
    gate_id: "provider_specific_deployment_apply-gate-1",
    gate_type: "provider_specific_deployment_apply" as const,
    action: "manual_gate.approved" as const,
    actor_type: "operator" as const,
    actor_id: "project-owner",
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    safe_summary: { status: "approved", evidenceCount: 3 },
    created_at: createdAt,
    ...overrides
  };
}

describe("persistent manual gate audit boundary", () => {
  it("creates requested and approved gates", () => {
    const repository = new InMemoryManualGatePersistentRepository();
    const requested = repository.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    expect(requested.status).toBe("requested");
    const approved = repository.approveGate(requested.gate_id, "project-owner", createdAt);
    expect(approved.status).toBe("approved");
    expect(repository.getGate(requested.gate_id)?.approved_by_role).toBe("project-owner");
  });

  it("rejects missing target commit and unsafe secret_source_ref", () => {
    const repository = new InMemoryManualGatePersistentRepository();
    expect(() => repository.createRequestedGate(makeManualGate("provider_specific_deployment_apply", { target_commit_sha: "" }))).toThrow(/target_commit_sha/);
    expect(() => repository.createRequestedGate(makeManualGate("provider_specific_deployment_apply", { secret_source_ref: "Bearer abc" }))).toThrow(/secret_source_ref/);
  });

  it("marks used once and rejects double used", () => {
    const repository = new InMemoryManualGatePersistentRepository();
    const requested = repository.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    repository.approveGate(requested.gate_id, "project-owner", createdAt);
    const used = repository.markUsed(requested.gate_id, "2026-06-08T00:01:00.000Z");
    expect(used.status).toBe("used");
    expect(() => repository.markUsed(requested.gate_id, "2026-06-08T00:02:00.000Z")).toThrow(/already been used/);
  });

  it("stores manual gate audit records without secret_source_ref values", () => {
    const repository = new InMemoryAuditLogRepository();
    const stored = repository.appendManualGateAudit(auditRecord());
    expect(stored.action).toBe("manual_gate.approved");
    expect(JSON.stringify(stored)).not.toContain("projects/example/secrets/provider-ref");
    expect(JSON.stringify(stored)).not.toMatch(/secret_source_ref|Bearer|https?:\/\//i);
  });

  it.each([
    ["wallet address", { wallet: `0x${"1".repeat(40)}` }],
    ["private URL", { details: "https://private.example.test/hook" }],
    ["token-like values", { value: "sk-test" }]
  ])("rejects unsafe manual gate audit %s", (_label, safe_summary) => {
    expect(() => createManualGateAuditRecord(auditRecord({ safe_summary }))).toThrow(/unsafe|safe_summary/);
  });

  it("migration defines manual gate audit tables and constraints", () => {
    const migration = readFileSync(join(process.cwd(), "migrations", "0003_manual_gate_audit.sql"), "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS manual_gates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS manual_gate_audit_logs");
    expect(migration).toContain("CHECK (status IN ('not_requested', 'requested', 'approved', 'rejected', 'expired', 'used'))");
    expect(migration).not.toMatch(new RegExp("DEFAULT\\\\s+'.*(SECRET|PRIVATE|TOKEN|API_KEY|Bearer|https?://)", "i"));
  });
});
