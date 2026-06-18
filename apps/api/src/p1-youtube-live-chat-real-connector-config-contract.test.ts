import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  defaultYouTubeLiveChatRealConnectorConfig,
  toYouTubeLiveChatRealConnectorAdminProjection,
  validateYouTubeLiveChatRealConnectorConfig
} from "./youtube-live-chat-real-connector-config.js";
import { fakeFixtureCapability, youtubeApiCandidateCapability } from "./youtube-live-chat-client.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectNoSecretLikeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Bearer ");
  expect(serialized).not.toContain("client_secret_value");
  expect(serialized).not.toContain("refresh_token_value");
  expect(serialized).not.toContain("127.0.0.1");
  expect(serialized).not.toContain("ya29.");
}

describe("P1 YouTube Live Chat real connector config contract", () => {
  it("keeps default real connector config planning-only and network disabled", () => {
    const config = defaultYouTubeLiveChatRealConnectorConfig();
    const validation = validateYouTubeLiveChatRealConnectorConfig(config);

    expect(validation).toEqual({
      status: "planning_valid",
      safe_reason_codes: ["planning_config_safe"],
      network_enabled: false,
      oauth_configured: false,
      real_api_execution: false,
      package_change_required: false,
      secret_values_read: false
    });
    expect(config.transport).toBe("unselected");
    expect(config.oauth_scopes).toEqual([]);
    expect(config.quota_budget_units_per_day).toBeNull();
  });

  it("rejects real execution, OAuth configuration, and network enablement", () => {
    const base = defaultYouTubeLiveChatRealConnectorConfig();

    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, network_enabled: true }).status).toBe("preflight_blocked");
    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, oauth_configured: true }).status).toBe("preflight_blocked");
    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, real_api_execution: true }).status).toBe("preflight_blocked");
  });

  it("rejects unknown transport and non-readonly OAuth scopes for planning", () => {
    const base = defaultYouTubeLiveChatRealConnectorConfig();

    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, transport: "grpc_streaming" }).safe_reason_codes).toContain("transport_unknown");
    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, oauth_scopes: ["https://www.googleapis.com/auth/youtube.force-ssl"] }).safe_reason_codes).toContain("oauth_scope_not_allowed_for_planning");
  });

  it("accepts opaque secret references but rejects raw secrets and private URLs", () => {
    const base = defaultYouTubeLiveChatRealConnectorConfig();
    const valid = validateYouTubeLiveChatRealConnectorConfig({
      ...base,
      secret_refs: {
        client_id_ref: "secretref:youtube/client-id",
        client_secret_ref: "secretref:youtube/client-secret",
        refresh_credential_ref: "secretref:youtube/refresh-credential"
      }
    });
    const rawBearer = validateYouTubeLiveChatRealConnectorConfig({
      ...base,
      secret_refs: {
        client_id_ref: "secretref:youtube/client-id",
        client_secret_ref: "Bearer client_secret_value",
        refresh_credential_ref: "secretref:youtube/refresh-credential"
      }
    });
    const privateUrl = validateYouTubeLiveChatRealConnectorConfig({
      ...base,
      secret_refs: {
        client_id_ref: "secretref:youtube/client-id",
        client_secret_ref: "http://127.0.0.1/client-secret",
        refresh_credential_ref: "secretref:youtube/refresh-credential"
      }
    });

    expect(valid.status).toBe("planning_valid");
    expect(rawBearer.status).toBe("preflight_blocked");
    expect(privateUrl.status).toBe("preflight_blocked");
  });

  it("accepts network-disabled fake transport planning without treating it as controlled canary", () => {
    const validation = validateYouTubeLiveChatRealConnectorConfig({
      ...defaultYouTubeLiveChatRealConnectorConfig(),
      execution_mode: "fake_transport",
      kill_switch_status: "armed_for_fake_transport",
      network_enabled: false,
      real_api_execution: false,
      list_mode_enabled: true,
      max_results: 200,
      timeout_budget_ms: 1000
    });

    expect(validation.status).toBe("planning_valid");
    expect(validation.safe_reason_codes).toEqual(["planning_config_safe"]);
    expect(validation.network_enabled).toBe(false);
    expect(validation.real_api_execution).toBe(false);
  });

  it("rejects fake transport when kill switch mode is not fake transport", () => {
    expect(validateYouTubeLiveChatRealConnectorConfig({
      ...defaultYouTubeLiveChatRealConnectorConfig(),
      execution_mode: "fake_transport",
      kill_switch_status: "blocked"
    }).safe_reason_codes).toContain("fake_transport_requires_fake_kill_switch");
  });

  it("admin projection excludes secret references and keeps safe status only", () => {
    const projection = toYouTubeLiveChatRealConnectorAdminProjection({
      ...defaultYouTubeLiveChatRealConnectorConfig(),
      secret_refs: {
        client_id_ref: "secretref:youtube/client-id",
        client_secret_ref: "secretref:youtube/client-secret",
        refresh_credential_ref: "secretref:youtube/refresh-credential"
      }
    });

    expect(projection.secret_refs_configured).toBe(true);
    expect("secret_refs" in projection).toBe(false);
    expect(projection.config_status).toBe("planning_valid");
    expectNoSecretLikeOutput(projection);
  });

  it("adds candidate capability without changing fake fixture capability", () => {
    expect(fakeFixtureCapability().client_kind).toBe("fake_fixture");
    expect(youtubeApiCandidateCapability()).toEqual({
      client_kind: "youtube_api_candidate",
      network_enabled: false,
      oauth_configured: false,
      real_api_execution: false,
      supports_stream_list: true,
      supports_list_fallback: true,
      supports_fixture_pages: false,
      supports_cursor_handoff: false,
      planning_only: true
    });
  });

  it("committed config contract evidence keeps real connector blocked before owner scope", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-real-connector-config-contract.json");

    expect(evidence.realConnectorConfigContractStatus).toBe("implemented");
    expect(evidence.defaultConfigStatus).toBe("planning_valid");
    expect(evidence.secretReferenceContractStatus).toBe("pass");
    expect(evidence.adminSafeProjectionStatus).toBe("pass");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.oauthConfigured).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.secretValuesRead).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
