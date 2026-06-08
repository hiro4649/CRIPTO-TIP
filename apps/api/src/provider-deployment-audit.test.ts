import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeManualGate, targetCommitSha } from "./manual-gates.test-support.js";
import {
  createProviderDeploymentAuditRecord,
  createProviderDeploymentJob,
  sanitizeProviderDeploymentSummary
} from "./provider-deployment-audit.js";
import { InMemoryAuditLogRepository } from "./repositories/audit-log-repository.js";
import { InMemoryManualGatePersistentRepository } from "./repositories/manual-gate-repository.js";

const createdAt = "2026-06-08T00:00:00.000Z";

function job(overrides = {}) {
  return {
    id: "provider-job-1",
    operation: "provider_specific_deployment_apply" as const,
    status: "planned" as const,
    target: "provider-safe-deployment",
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    manual_gate_id: "provider_specific_deployment_apply-gate-1",
    rollback_plan_ref: "docs/PROVIDER_SAFE_DEPLOYMENT.md#rollback",
    operator_runbook_ref: "docs/RUNBOOK.md#provider-safe-deployment",
    safe_summary: { operation: "planned", changedRoutes: 1 },
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides
  };
}

function audit(overrides = {}) {
  return {
    id: "provider-audit-1",
    job_id: "provider-job-1",
    operation: "provider_specific_deployment_apply" as const,
    action: "provider_deployment.apply.planned" as const,
    target: "provider-safe-deployment",
    actor_type: "system" as const,
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    safe_summary: { status: "planned", dryRun: true },
    created_at: createdAt,
    ...overrides
  };
}

describe("provider deployment audit boundary", () => {
  it("records planned, executed, failed, and rollback planned audit records as safe summaries", () => {
    const repository = new InMemoryAuditLogRepository();
    const planned = repository.appendProviderDeploymentAudit(audit());
    const executed = repository.appendProviderDeploymentAudit(audit({ id: "provider-audit-2", action: "provider_deployment.apply.executed", safe_summary: { status: "applied", dryRun: false } }));
    const failed = repository.appendProviderDeploymentAudit(audit({ id: "provider-audit-3", action: "provider_deployment.apply.failed", safe_summary: { status: "failed", retryable: false } }));
    const rollback = repository.appendProviderDeploymentAudit(audit({ id: "provider-audit-4", action: "provider_deployment.rollback.planned", safe_summary: { status: "planned" } }));
    expect([planned.action, executed.action, failed.action, rollback.action]).toEqual([
      "provider_deployment.apply.planned",
      "provider_deployment.apply.executed",
      "provider_deployment.apply.failed",
      "provider_deployment.rollback.planned"
    ]);
    expect(JSON.stringify(repository.listProviderDeploymentAudits())).not.toMatch(/Bearer|https?:\/\/|0x[0-9a-fA-F]{40}|raw_provider/i);
  });

  it("failed audit record does not mark manual gate used", () => {
    const gates = new InMemoryManualGatePersistentRepository();
    const requested = gates.createRequestedGate(makeManualGate("provider_specific_deployment_apply"));
    gates.approveGate(requested.gate_id, "project-owner", createdAt);
    const auditRepository = new InMemoryAuditLogRepository();
    auditRepository.appendProviderDeploymentAudit(audit({ action: "provider_deployment.apply.failed", safe_summary: { status: "failed" } }));
    expect(gates.getGate(requested.gate_id)?.status).toBe("approved");
  });

  it.each([
    ["raw provider response", { raw_provider_response: "provider payload" }],
    ["webhook URL", { note: "https://private.example.test/webhook" }],
    ["API key", { api_key: "AKIA123" }],
    ["wallet address", { wallet: `0x${"2".repeat(40)}` }]
  ])("rejects unsafe provider deployment audit %s", (_label, safe_summary) => {
    expect(() => createProviderDeploymentAuditRecord(audit({ safe_summary }))).toThrow(/unsafe|safe_summary/);
  });

  it("records rollback and runbook references without credential values", () => {
    const repository = new InMemoryAuditLogRepository();
    const stored = repository.recordProviderDeploymentJob(job());
    expect(stored.rollback_plan_ref).toContain("PROVIDER_SAFE_DEPLOYMENT");
    expect(stored.operator_runbook_ref).toContain("RUNBOOK");
    expect(JSON.stringify(stored)).not.toMatch(/credentialRef|projects\/example\/secrets|Bearer|https?:\/\/private/i);
  });

  it("strips unsafe fields from provider deployment job safe summary", () => {
    const stored = createProviderDeploymentJob(job({
      safe_summary: {
        kept: "safe",
        rawMessage: "remove me",
        webhookUrl: "https://private.example.test/hook",
        walletAddress: `0x${"3".repeat(40)}`
      }
    }));
    expect(stored.safe_summary).toEqual({ kept: "safe" });
  });

  it("migration defines provider deployment audit tables and constraints", () => {
    const migration = readFileSync(join(process.cwd(), "migrations", "0003_manual_gate_audit.sql"), "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS provider_deployment_jobs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS provider_deployment_audit_logs");
    expect(migration).toContain("CHECK (status IN ('planned', 'running', 'applied', 'failed', 'rolled_back', 'cancelled'))");
    expect(migration).not.toMatch(new RegExp("DEFAULT\\\\s+'.*(SECRET|PRIVATE|TOKEN|API_KEY|Bearer|https?://)", "i"));
  });

  it("sanitizes provider deployment summary down to safe primitive fields", () => {
    expect(sanitizeProviderDeploymentSummary({
      safeCount: 1,
      safeFlag: true,
      webhookUrl: "https://private.example.test/hook",
      tokenValue: "Bearer abc"
    })).toEqual({ safeCount: 1, safeFlag: true });
  });
});
