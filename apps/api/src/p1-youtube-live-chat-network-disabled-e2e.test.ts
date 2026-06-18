import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import { YouTubeLiveChatDirectRestListTransport, type YouTubeDirectRestFetch, type YouTubeLiveChatDirectRestListTransportResult } from "./youtube-live-chat-direct-rest-transport.js";
import { FakeOpaqueYouTubeCredentialProvider } from "./youtube-credential-provider.js";
import { armYouTubeConnectorKillSwitchForFakeTransport } from "./youtube-connector-kill-switch.js";
import {
  YouTubeLiveChatListConnectorService,
  type YouTubeLiveChatCursorGateway,
  type YouTubeLiveChatCursorSnapshot,
  type YouTubeLiveChatSafePageIngestResult
} from "./youtube-live-chat-list-connector-service.js";
import type { YouTubeLiveChatPlannerFailureClass } from "./youtube-live-chat-quota-polling-planner.js";
import { YouTubeLiveChatFakeStreamTransport, streamPage, streamStatus } from "./youtube-live-chat-fake-stream.js";
import { consumeYouTubeLiveChatStream } from "./youtube-live-chat-stream-contract.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");
const readonlyScope = "https://www.googleapis.com/auth/youtube.readonly";

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function superChat(id: string, comment = "hello") {
  return {
    id,
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-06-18T00:00:00.000Z",
      superChatDetails: { amountMicros: "1000000", currency: "JPY", amountDisplayString: "JPY 1,000", userComment: comment, tier: 1 }
    },
    authorDetails: { channelId: `channel_${id}`, displayName: "Viewer" }
  };
}

function page(items: unknown[], nextPageToken?: string) {
  return {
    ...(nextPageToken ? { nextPageToken } : {}),
    pollingIntervalMillis: 5000,
    items
  };
}

function upstreamUnavailableFailure(): YouTubeLiveChatDirectRestListTransportResult {
  return {
    status: "upstream_unavailable",
    page: null,
    next_page_token: null,
    polling_interval_ms: null,
    fetch_called: true,
    fake_fetch_called: true,
    network_call_used: false,
    global_fetch_used: false,
    raw_body_stored: false,
    authorization_header_exposed: false,
    credential_handle_acquired: true,
    credential_handle_release_attempted: true,
    credential_handle_released: true,
    safe_reason_codes: ["injected_fetch_exception"]
  };
}

class AppCursorGateway implements YouTubeLiveChatCursorGateway {
  readonly #app: ReturnType<typeof buildServer>;

  constructor(app: ReturnType<typeof buildServer>) {
    this.#app = app;
  }

  async getCursor(cursorId: string): Promise<YouTubeLiveChatCursorSnapshot | null> {
    const response = await this.#app.inject({ method: "GET", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}`, headers: { authorization: internalAuth } });
    if (response.statusCode === 404) return null;
    const cursor = response.json().cursor;
    return {
      cursor_id: cursor.cursor_id,
      stream_id: cursor.stream_id,
      youtube_video_id: cursor.youtube_video_id,
      live_chat_id: cursor.live_chat_id,
      character_id: cursor.character_id,
      next_page_token: cursor.next_page_token,
      cursor_status: cursor.cursor_status,
      pages_ingested: cursor.pages_ingested,
      connector_failure_class: cursor.connector_failure_class,
      connector_failure_count: cursor.connector_failure_count,
      connector_failure_fingerprint: cursor.connector_failure_fingerprint
    };
  }

  async updateConnectorFailureState(input: { cursor_id: string; failure_class: YouTubeLiveChatPlannerFailureClass; failure_count: number; safe_failure_fingerprint: string }): Promise<void> {
    const response = await this.#app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${input.cursor_id}/failure-state`,
      headers: { authorization: internalAuth },
      payload: {
        failure_class: input.failure_class,
        failure_count: input.failure_count,
        safe_failure_fingerprint: input.safe_failure_fingerprint
      }
    });
    expect(response.statusCode).toBe(200);
  }

  async clearConnectorFailureState(cursorId: string): Promise<void> {
    const response = await this.#app.inject({
      method: "DELETE",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`,
      headers: { authorization: internalAuth }
    });
    expect(response.statusCode).toBe(200);
  }

  async ingestPage(input: { cursor_id: string; page_token: string | null; page: { items: unknown[]; nextPageToken?: string; pollingIntervalMillis?: number } }): Promise<YouTubeLiveChatSafePageIngestResult> {
    const response = await this.#app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${input.cursor_id}/pages/ingest`,
      headers: { authorization: internalAuth },
      payload: { page_token: input.page_token, page: input.page }
    });
    const body = response.json();
    return {
      ingest_status: response.statusCode === 200 ? body.idempotent ? "duplicate_page_replay" : "page_ingested" : "ingest_failed",
      cursor: {
        cursor_id: body.cursor?.cursor_id ?? input.cursor_id,
        stream_id: body.cursor?.stream_id ?? "unknown",
        youtube_video_id: body.cursor?.youtube_video_id ?? "unknown",
        live_chat_id: body.cursor?.live_chat_id ?? "unknown",
        character_id: body.cursor?.character_id ?? "unknown",
        next_page_token: body.cursor?.next_page_token ?? null,
        cursor_status: body.cursor?.cursor_status ?? "not_started",
        pages_ingested: body.cursor?.pages_ingested ?? 0,
        connector_failure_class: body.cursor?.connector_failure_class,
        connector_failure_count: body.cursor?.connector_failure_count,
        connector_failure_fingerprint: body.cursor?.connector_failure_fingerprint
      },
      events_normalized: body.page_result?.normalized_count ?? 0,
      events_persisted: body.page_result?.support_events?.length ?? 0,
      duplicates_skipped: body.page_result?.duplicate_count ?? 0,
      held_count: body.page_result?.held_count ?? 0,
      safe_reason_codes: body.page_result?.safe_reason_codes ?? body.safe_reason_codes ?? ["ingest_failed"]
    };
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("P1 YouTube Live Chat network-disabled E2E", () => {
  it("runs fake direct list transport through cursor ingest, support.received, stream contract, and admin preflight with global fetch disabled", async () => {
    const originalFetch = globalThis.fetch;
    const globalFetch = vi.fn(async () => {
      throw new Error("global fetch forbidden");
    });
    Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: globalFetch });
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    try {
      const cursorCreate = await app.inject({
        method: "POST",
        url: "/internal/fixtures/youtube-live-chat/cursors",
        headers: { authorization: internalAuth },
        payload: {
          stream_id: "stream_network_disabled_e2e",
          youtube_video_id: "yt_network_disabled_e2e",
          live_chat_id: "live_chat_network_disabled_e2e",
          character_id: "char_network_disabled_e2e"
        }
      });
      const cursorId = cursorCreate.json().cursor.cursor_id as string;
      const fakeFetch = vi.fn<YouTubeDirectRestFetch>(async (input) => ({
        status: 200,
        content_type: "application/json",
        body_text: JSON.stringify(page(input.query.pageToken ? [superChat("msg_2", "second")] : [superChat("msg_1")], input.query.pageToken ? undefined : "page_2"))
      }));
      const transport = new YouTubeLiveChatDirectRestListTransport({
        fetch_fn: fakeFetch,
        credential_provider: new FakeOpaqueYouTubeCredentialProvider(),
        kill_switch: armYouTubeConnectorKillSwitchForFakeTransport({
          now: new Date("2026-06-18T00:00:00.000Z"),
          expires_at: "2026-06-18T00:10:00.000Z",
          head_binding: "head",
          config_hash_binding: "config"
        }),
        head_binding: "head",
        config_hash_binding: "config",
        scope_ids: [readonlyScope]
      });
      const service = new YouTubeLiveChatListConnectorService({
        transport,
        cursor_gateway: new AppCursorGateway(app),
        execution_mode: "fake_transport",
        clock: () => new Date("2026-06-18T00:01:00.000Z")
      });

      const listResult = await service.run({
        cursor_id: cursorId,
        max_results: 200,
        timeout_budget_ms: 1000,
        quota_budget_remaining: 100,
        estimated_request_units: 1
      });
      const streamResult = await consumeYouTubeLiveChatStream({
        transport: new YouTubeLiveChatFakeStreamTransport({
          chunks: [
            streamPage({ next_page_token: "stream_page_2", items: [superChat("stream_msg_1")] }),
            streamStatus("stream_disconnected", ["stream_disconnected"])
          ]
        }),
        request: { live_chat_id: "live_chat_stream_e2e", max_results: 200, timeout_budget_ms: 1000, execution_mode: "fake_stream" }
      });
      const supportEvents = await app.inject({ method: "GET", url: "/admin/support-events?stream_id=stream_network_disabled_e2e", headers: { authorization: adminAuth } });
      const preflight = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: {
        config_status: "controlled_canary_candidate",
        oauth_contract_status: "pass",
        credential_provider_status: "opaque_interface_ready",
        kill_switch_status: "armed_for_controlled_canary",
        quota_planner_status: "pass",
        direct_rest_transport_status: "pass",
        list_connector_service_status: "pass",
        stream_contract_status: "pass",
        privacy_review_status: "pass",
        data_deletion_review_status: "pass",
        revocation_runbook_status: "documented",
        network_authorization_status: "absent"
      } });

      expect(listResult).toMatchObject({
        service_status: "completed_fixture",
        pages_read: 2,
        pages_ingested: 2,
        events_persisted: 2,
        network_call_used: false,
        global_fetch_used: false,
        timer_started: false,
        sleep_used: false,
        real_api_execution: false
      });
      expect(fakeFetch).toHaveBeenCalledTimes(2);
      expect(globalFetch).not.toHaveBeenCalled();
      expect(streamResult).toMatchObject({ stream_status: "backoff_required", network_call_used: false, global_fetch_used: false, grpc_used: false, http_streaming_used: false });
      expect(supportEvents.json().support_events.length).toBe(2);
      expect(preflight.json()).toMatchObject({ preflight_status: "code_ready_network_blocked", network_enabled: false, oauth_configured: false, real_api_execution: false });
      const serialized = JSON.stringify({ listResult, streamResult, preflight: preflight.json() });
      expect(serialized).not.toContain("Authorization");
      expect(serialized).not.toContain("Bearer");
      expect(serialized).not.toContain("access_token");
      expect(serialized).not.toContain("refresh_token");
      expect(serialized).not.toContain("client_secret");
    } finally {
      Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: originalFetch });
      await app.close();
    }
  });

  it("persists connector same-failure state through the app cursor gateway without network execution", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    try {
      const cursorCreate = await app.inject({
        method: "POST",
        url: "/internal/fixtures/youtube-live-chat/cursors",
        headers: { authorization: internalAuth },
        payload: {
          stream_id: "stream_failure_state_e2e",
          youtube_video_id: "yt_failure_state_e2e",
          live_chat_id: "live_chat_failure_state_e2e",
          character_id: "char_failure_state_e2e"
        }
      });
      const cursorId = cursorCreate.json().cursor.cursor_id as string;
      const gateway = new AppCursorGateway(app);
      const failingTransport = {
        executeList: vi.fn(async () => upstreamUnavailableFailure())
      };
      const firstRun = await new YouTubeLiveChatListConnectorService({
        transport: failingTransport,
        cursor_gateway: gateway,
        execution_mode: "fake_transport",
        clock: () => new Date("2026-06-18T00:02:00.000Z")
      }).run({
        cursor_id: cursorId,
        max_results: 200,
        timeout_budget_ms: 1000,
        quota_budget_remaining: 100,
        estimated_request_units: 1
      });
      const persisted = await gateway.getCursor(cursorId);
      const secondRun = await new YouTubeLiveChatListConnectorService({
        transport: failingTransport,
        cursor_gateway: gateway,
        execution_mode: "fake_transport",
        clock: () => new Date("2026-06-18T00:03:00.000Z")
      }).run({
        cursor_id: cursorId,
        max_results: 200,
        timeout_budget_ms: 1000,
        quota_budget_remaining: 100,
        estimated_request_units: 1
      });

      expect(firstRun).toMatchObject({
        service_status: "backoff_required",
        network_call_used: false,
        global_fetch_used: false,
        real_api_execution: false
      });
      expect(persisted).toMatchObject({
        connector_failure_class: "upstream_unavailable",
        connector_failure_count: 1,
        connector_failure_fingerprint: "p1_list_connector:upstream_unavailable:injected_fetch_exception"
      });
      expect(secondRun).toMatchObject({
        service_status: "same_failure_repeated",
        cycles_completed: 1,
        network_call_used: false,
        global_fetch_used: false,
        real_api_execution: false
      });
      expect(failingTransport.executeList).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });

  it("committed network-disabled E2E evidence preserves pre-network stop boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-network-disabled-e2e.json");

    expect(evidence.networkDisabledE2EStatus).toBe("pass");
    expect(evidence.globalFetchCallCountZeroStatus).toBe("pass");
    expect(evidence.directRestFakeTransportStatus).toBe("pass");
    expect(evidence.listConnectorServiceStatus).toBe("pass");
    expect(evidence.streamContractStatus).toBe("pass");
    expect(evidence.controlledCanaryPreflightStatus).toBe("pass");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.oauthExecutionUsed).toBe(false);
    expect(evidence.secretValueUsed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("committed fixture cursor failure-state evidence preserves pre-network stop boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-fixture-cursor-failure-state.json");

    expect(evidence.fixtureCursorFailureStateStatus).toBe("pass");
    expect(evidence.appCursorGatewayFailureStateStatus).toBe("pass");
    expect(evidence.sameFailureRepeatedAcrossRunsStatus).toBe("pass");
    expect(evidence.successClearHookStatus).toBe("pass");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.oauthExecutionUsed).toBe(false);
    expect(evidence.secretValueUsed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
  });

  it("committed fixture cursor boundary helper evidence preserves pre-network stop boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-fixture-cursor-boundary-helper.json");

    expect(evidence.fixtureCursorBoundaryHelperStatus).toBe("pass");
    expect(evidence.serverExtractionStatus).toBe("pass");
    expect(evidence.responseProjectionStatus).toBe("pass");
    expect(evidence.failureStateSchemaStatus).toBe("pass");
    expect(evidence.behaviorChangeStatus).toBe("none_intended");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.oauthExecutionUsed).toBe(false);
    expect(evidence.secretValueUsed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("committed fixture cursor store helper evidence preserves pre-network stop boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-fixture-cursor-store-helper.json");

    expect(evidence.fixtureCursorStoreHelperStatus).toBe("pass");
    expect(evidence.serverWeakMapExtractionStatus).toBe("pass");
    expect(evidence.storeIdentityMappingStatus).toBe("pass");
    expect(evidence.behaviorChangeStatus).toBe("none_intended");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.oauthExecutionUsed).toBe(false);
    expect(evidence.secretValueUsed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
