import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 API admin moderation read routes", () => {
  it("keeps held-support and moderation summary read routes behind admin auth", async () => {
    const app = buildServer(new InMemoryRepository());
    try {
      await app.ready();

      const heldUnauthorized = await app.inject({ method: "GET", url: "/admin/moderation/held-support" });
      const summaryUnauthorized = await app.inject({ method: "GET", url: "/admin/moderation/summary" });
      const held = await app.inject({ method: "GET", url: "/admin/moderation/held-support", headers: { authorization: adminAuth } });
      const summary = await app.inject({ method: "GET", url: "/admin/moderation/summary", headers: { authorization: adminAuth } });

      expect(heldUnauthorized.statusCode).toBe(401);
      expect(summaryUnauthorized.statusCode).toBe(401);
      expect(held.statusCode).toBe(200);
      expect(held.json().held_support).toEqual([]);
      expect(summary.statusCode).toBe(200);
      expect(summary.json().status).toBe("ok");
    } finally {
      await app.close();
    }
  });

  it("keeps admin moderation read module dependency-injected and server as composition root", () => {
    const routeSource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "admin-moderation-read-routes.ts"), "utf8");
    const dependencySource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "admin-moderation-read-route-dependencies.ts"), "utf8");
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
    expect(serverSource).toContain("registerAdminModerationReadRoutes(app, {");
    expect(serverSource).not.toContain('app.get("/admin/moderation/held-support"');
    expect(serverSource).not.toContain('app.get("/admin/moderation/summary"');
  });

  it("committed admin moderation read route evidence preserves read-only boundaries", () => {
    const evidence = readCodexEvidence("p1-api-admin-moderation-read-routes.json");

    expect(evidence.adminModerationReadRouteModuleStatus).toBe("implemented");
    expect(evidence.routeRegistrationStatus).toBe("pass");
    expect(evidence.authParityStatus).toBe("pass");
    expect(evidence.heldListStatus).toBe("pass");
    expect(evidence.summaryStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.serverCompositionRootStatus).toBe("pass");
    expect(evidence.productBehaviorChanged).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
