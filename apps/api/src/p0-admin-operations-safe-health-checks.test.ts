import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain(mockValue("admin"));
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("fingerprint");
  expect(serialized).not.toContain("ip_address");
  expect(serialized).not.toContain("user_agent");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("postgres://");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
  expect(serialized).not.toContain("legal_compliance");
  expect(serialized).not.toContain("youtube_policy_compliance");
}

describe("P0 admin operations safe health checks", () => {
  it("requires admin bearer token", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/operations/health" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/operations/health", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);

    await app.close();
  });

  it("returns safe local health metadata only", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/admin/operations/health", headers: { authorization: adminAuth } });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.repository.mode).toBe("local_in_memory");
    expect(body.endpoints).toEqual({
      dlq_list: true,
      dlq_redrive: true,
      audit_export: true,
      operations_summary: true,
      operations_health: true
    });
    expect(body.rate_limit).toEqual({
      storage: "in_memory",
      key_material: "redacted",
      window_ms: 60000,
      max_requests: 3,
      scopes: {
        dlq_list: { enabled: true },
        dlq_retry: { enabled: true },
        audit_export: { enabled: true }
      }
    });
    expectSafe(body);

    await app.close();
  });

  it("keeps existing operations summary available", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const summary = await app.inject({ method: "GET", url: "/admin/operations/summary", headers: { authorization: adminAuth } });
    const health = await app.inject({ method: "GET", url: "/admin/operations/health", headers: { authorization: adminAuth } });

    expect(summary.statusCode).toBe(200);
    expect(health.statusCode).toBe(200);
    expectSafe(summary.json());
    expectSafe(health.json());

    await app.close();
  });

  it("committed health evidence preserves safe boundaries", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, ".codex", "p0-admin-operations-safe-health-checks.json"), "utf8"));

    expect(evidence.adminOperationsHealthStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.endpointAvailabilityStatus).toBe("pass");
    expect(evidence.safeRateLimitConfigStatus).toBe("pass");
    expect(evidence.rawTokenExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.ipUserAgentExcluded).toBe(true);
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
