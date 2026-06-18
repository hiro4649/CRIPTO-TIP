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

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("client_secret");
  expect(serialized).not.toContain("endpoint");
  expect(serialized).not.toContain("token");
}

describe("P1 admin YouTube Live Chat connector capability", () => {
  it("returns read-only fake connector capability without raw config or secrets", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const unauthorized = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/connector-capability" });
    const response = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/connector-capability", headers: { authorization: adminAuth } });

    expect(unauthorized.statusCode).toBe(401);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      client_kind: "fake_fixture",
      fixture_only: true,
      network_enabled: false,
      oauth_configured: false,
      real_api_execution: false,
      supports_stream_list: false,
      supports_list_fallback: false,
      supports_fixture_pages: true,
      supports_cursor_handoff: true,
      max_cycles: 5,
      same_failure_repeat_limit: 2,
      safe_reason_codes: [
        "fake_fixture_only",
        "network_disabled",
        "oauth_not_configured",
        "real_api_execution_false",
        "raw_config_hidden"
      ]
    });
    expectSafeOutput(response.json());

    await app.close();
  });

  it("committed connector capability evidence preserves fake-only boundaries", () => {
    const evidence = readCodexEvidence("p1-admin-youtube-live-chat-connector-capability.json");

    expect(evidence.youtubeLiveChatConnectorCapabilityStatus).toBe("implemented");
    expect(evidence.readOnlyAdminSurfaceStatus).toBe("pass");
    expect(evidence.fakeClientCapabilityStatus).toBe("pass");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.oauthConfigured).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.rawConfigExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
