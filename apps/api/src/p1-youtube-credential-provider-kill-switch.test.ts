import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FakeOpaqueYouTubeCredentialProvider, UnavailableYouTubeCredentialProvider } from "./youtube-credential-provider.js";
import {
  armYouTubeConnectorKillSwitchForFakeTransport,
  defaultYouTubeConnectorKillSwitch,
  evaluateYouTubeConnectorKillSwitch
} from "./youtube-connector-kill-switch.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectNoSecret(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("access_token_value");
  expect(serialized).not.toContain("refresh_token");
  expect(serialized).not.toContain("client_secret");
}

describe("P1 YouTube credential provider and kill switch", () => {
  it("unavailable provider fails closed without env or filesystem secret reads", async () => {
    const provider = new UnavailableYouTubeCredentialProvider();
    expect(provider.getMetadata()).toMatchObject({ provider_status: "unavailable", raw_value_exposed: false, environment_read: false, filesystem_secret_read: false });
    expect(await provider.acquireAccessCredentialHandle({ scope_ids: ["https://www.googleapis.com/auth/youtube.readonly"] })).toMatchObject({ status: "credential_unavailable", handle: null });
  });

  it("fake provider returns opaque handles only and release is idempotent", async () => {
    const provider = new FakeOpaqueYouTubeCredentialProvider();
    const result = await provider.acquireAccessCredentialHandle({ scope_ids: ["https://www.googleapis.com/auth/youtube.readonly"], now: new Date("2026-06-18T00:00:00.000Z") });

    expect(result.status).toBe("credential_handle_acquired");
    expect(result.handle?.credential_type).toBe("access_token_handle");
    expect(result.handle?.raw_value_exposed).toBe(false);
    expect(result.handle?.authorization_header_exposed).toBe(false);
    expectNoSecret(result);
    expect(await provider.releaseAccessCredentialHandle(result.handle?.credential_handle_id ?? "missing")).toEqual({ status: "released", raw_value_exposed: false });
    expect(await provider.releaseAccessCredentialHandle(result.handle?.credential_handle_id ?? "missing")).toEqual({ status: "already_released", raw_value_exposed: false });
  });

  it("kill switch defaults blocked and permits fake transport only with matching bindings", () => {
    const blocked = defaultYouTubeConnectorKillSwitch({ now: new Date("2026-06-18T00:00:00.000Z"), head_binding: "head_a", config_hash_binding: "config_a" });
    expect(evaluateYouTubeConnectorKillSwitch({ kill_switch: blocked, expected_head_binding: "head_a", expected_config_hash_binding: "config_a", now: new Date("2026-06-18T00:01:00.000Z") }).safe_reason_codes).toContain("kill_switch_blocked");

    const armed = armYouTubeConnectorKillSwitchForFakeTransport({
      now: new Date("2026-06-18T00:00:00.000Z"),
      expires_at: "2026-06-18T00:10:00.000Z",
      head_binding: "head_a",
      config_hash_binding: "config_a"
    });
    expect(evaluateYouTubeConnectorKillSwitch({ kill_switch: armed, expected_head_binding: "head_a", expected_config_hash_binding: "config_a", now: new Date("2026-06-18T00:01:00.000Z") })).toEqual({ allowed: true, execution_allowed: false, safe_reason_codes: ["fake_transport_armed"] });
    expect(evaluateYouTubeConnectorKillSwitch({ kill_switch: armed, expected_head_binding: "head_b", expected_config_hash_binding: "config_a", now: new Date("2026-06-18T00:01:00.000Z") }).safe_reason_codes).toContain("head_binding_mismatch");
    expect(evaluateYouTubeConnectorKillSwitch({ kill_switch: armed, expected_head_binding: "head_a", expected_config_hash_binding: "config_a", now: new Date("2026-06-18T00:11:00.000Z") }).safe_reason_codes).toContain("kill_switch_expired");
  });

  it("committed evidence preserves no-token and no-network boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-credential-provider-kill-switch.json");

    expect(evidence.credentialProviderContractStatus).toBe("implemented");
    expect(evidence.killSwitchContractStatus).toBe("implemented");
    expect(evidence.rawTokenReturned).toBe(false);
    expect(evidence.authorizationHeaderReturned).toBe(false);
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
