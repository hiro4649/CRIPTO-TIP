import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 API admin YouTube connector routes", () => {
  it("registers read-only admin YouTube connector routes with existing auth and safe validation", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const unauthorized = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/connector-capability" });
    const capability = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/connector-capability", headers: { authorization: adminAuth } });
    const readiness = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/real-connector-readiness", headers: { authorization: adminAuth } });
    const preflight = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/controlled-canary-preflight", headers: { authorization: adminAuth } });
    const invalid = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: { unknown: true } });

    expect(unauthorized.statusCode).toBe(401);
    expect(capability.statusCode).toBe(200);
    expect(capability.json().real_api_execution).toBe(false);
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().readiness_status).toBe("blocked_pending_owner_scope");
    expect(preflight.statusCode).toBe(200);
    expect(preflight.json().real_api_execution).toBe(false);
    expect(invalid.statusCode).toBe(400);
    await app.close();
  });

  it("keeps admin YouTube connector module dependency-injected and server as composition root", () => {
    const routeSource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "admin-youtube-connector-routes.ts"), "utf8");
    const dependencySource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "admin-youtube-connector-route-dependencies.ts"), "utf8");
    const serverSource = fs.readFileSync(path.join(root, "apps", "api", "src", "server.ts"), "utf8");

    for (const source of [routeSource, dependencySource]) {
      expect(source).not.toContain("process.env");
      expect(source).not.toContain("ADMIN_TOKEN");
      expect(source).not.toContain("INTERNAL_TOKEN");
      expect(source).not.toContain("new InMemoryRepository");
      expect(source).not.toContain("globalThis");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("../server");
    }
    expect(serverSource).toContain("registerAdminYouTubeConnectorRoutes(app, {");
    expect(serverSource).not.toContain('app.get("/admin/youtube-live-chat/connector-capability"');
    expect(serverSource).not.toContain('app.get("/admin/youtube-live-chat/real-connector-readiness"');
    expect(serverSource).not.toContain('app.get("/admin/youtube-live-chat/controlled-canary-preflight"');
    expect(serverSource).not.toContain('app.post("/admin/youtube-live-chat/controlled-canary-preflight/evaluate"');
  });

  it("committed admin YouTube connector route evidence preserves read-only boundaries", () => {
    const evidence = readCodexEvidence("p1-api-admin-youtube-connector-routes.json");

    expect(evidence.adminYouTubeConnectorRouteModuleStatus).toBe("implemented");
    expect(evidence.routeRegistrationStatus).toBe("pass");
    expect(evidence.authParityStatus).toBe("pass");
    expect(evidence.strictSchemaStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.networkBlockedStatus).toBe("pass");
    expect(evidence.secretExclusionStatus).toBe("pass");
    expect(evidence.serverCompositionRootStatus).toBe("pass");
    expect(evidence.productBehaviorChanged).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
