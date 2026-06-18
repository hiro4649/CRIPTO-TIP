import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { YouTubeLiveChatDirectRestListTransportResult, YouTubeLiveChatSafePageProjection } from "./youtube-live-chat-direct-rest-transport.js";
import {
  YouTubeLiveChatListConnectorService,
  type YouTubeLiveChatCursorGateway,
  type YouTubeLiveChatCursorSnapshot,
  type YouTubeLiveChatListTransport,
  type YouTubeLiveChatSafePageIngestResult
} from "./youtube-live-chat-list-connector-service.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function cursor(overrides: Partial<YouTubeLiveChatCursorSnapshot> = {}): YouTubeLiveChatCursorSnapshot {
  return {
    cursor_id: "cursor_list_service",
    stream_id: "stream_list_service",
    youtube_video_id: "yt_video_list_service",
    live_chat_id: "live_chat_list_service",
    character_id: "char_list_service",
    next_page_token: null,
    cursor_status: "not_started",
    pages_ingested: 0,
    ...overrides
  };
}

function successPage(page: YouTubeLiveChatSafePageProjection): YouTubeLiveChatDirectRestListTransportResult {
  return {
    status: "success_page",
    page,
    next_page_token: page.nextPageToken ?? null,
    polling_interval_ms: page.pollingIntervalMillis ?? null,
    fetch_called: true,
    fake_fetch_called: true,
    network_call_used: false,
    global_fetch_used: false,
    raw_body_stored: false,
    authorization_header_exposed: false,
    credential_handle_acquired: true,
    credential_handle_release_attempted: true,
    credential_handle_released: true
  };
}

function failure(status: Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page">, reason: string): YouTubeLiveChatDirectRestListTransportResult {
  return {
    status,
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
    safe_reason_codes: [reason]
  };
}

class MemoryCursorGateway implements YouTubeLiveChatCursorGateway {
  readonly ingestedTokens: Array<string | null> = [];
  readonly seenTokens = new Set<string>();
  snapshot: YouTubeLiveChatCursorSnapshot | null;

  constructor(initial: YouTubeLiveChatCursorSnapshot | null) {
    this.snapshot = initial;
  }

  async getCursor(): Promise<YouTubeLiveChatCursorSnapshot | null> {
    return this.snapshot;
  }

  async ingestPage(input: { cursor_id: string; page_token: string | null; page: YouTubeLiveChatSafePageProjection }): Promise<YouTubeLiveChatSafePageIngestResult> {
    if (!this.snapshot) throw new Error("missing test cursor");
    const replayKey = input.page_token ?? "initial";
    const duplicatePageReplay = this.seenTokens.has(replayKey);
    this.seenTokens.add(replayKey);
    this.ingestedTokens.push(input.page_token);
    const held = input.page.items.filter((item) => JSON.stringify(item).includes("heldForReview")).length;
    const duplicateMessages = input.page.items.filter((item) => JSON.stringify(item).includes("duplicate")).length;
    this.snapshot = {
      ...this.snapshot,
      next_page_token: input.page.nextPageToken ?? null,
      cursor_status: input.page.nextPageToken ? "page_ingested" : "caught_up_fixture",
      pages_ingested: duplicatePageReplay ? this.snapshot.pages_ingested : this.snapshot.pages_ingested + 1
    };
    return {
      ingest_status: duplicatePageReplay ? "duplicate_page_replay" : "page_ingested",
      cursor: this.snapshot,
      events_normalized: input.page.items.length,
      events_persisted: Math.max(0, input.page.items.length - held - duplicateMessages),
      duplicates_skipped: duplicateMessages + (duplicatePageReplay ? input.page.items.length : 0),
      held_count: held,
      safe_reason_codes: duplicatePageReplay ? ["duplicate_page_replay"] : ["page_ingested"]
    };
  }
}

class SequenceTransport implements YouTubeLiveChatListTransport {
  readonly requests: Array<{ page_token?: string | null; live_chat_id: string }> = [];
  #results: YouTubeLiveChatDirectRestListTransportResult[];

  constructor(results: YouTubeLiveChatDirectRestListTransportResult[]) {
    this.#results = [...results];
  }

  async executeList(input: { live_chat_id: string; page_token?: string | null }): Promise<YouTubeLiveChatDirectRestListTransportResult> {
    this.requests.push({
      live_chat_id: input.live_chat_id,
      ...(input.page_token !== undefined ? { page_token: input.page_token } : {})
    });
    return this.#results.shift() ?? failure("upstream_unavailable", "fixture_exhausted");
  }
}

function service(input: { gateway: YouTubeLiveChatCursorGateway; transport: YouTubeLiveChatListTransport; max_cycles?: number; same_failure_repeat_limit?: number }) {
  return new YouTubeLiveChatListConnectorService({
    transport: input.transport,
    cursor_gateway: input.gateway,
    execution_mode: "fake_transport",
    clock: () => new Date("2026-06-18T00:00:00.000Z"),
    ...(input.max_cycles ? { max_cycles: input.max_cycles } : {}),
    ...(input.same_failure_repeat_limit ? { same_failure_repeat_limit: input.same_failure_repeat_limit } : {})
  });
}

const runInput = {
  cursor_id: "cursor_list_service",
  max_results: 200,
  timeout_budget_ms: 1000,
  quota_budget_remaining: 100,
  estimated_request_units: 1
};

describe("P1 YouTube Live Chat list connector service", () => {
  it("returns safe cursor missing and already caught up statuses without fake fetch", async () => {
    const missingTransport = new SequenceTransport([]);
    await expect(service({ gateway: new MemoryCursorGateway(null), transport: missingTransport }).run(runInput)).resolves.toMatchObject({
      service_status: "cursor_not_found",
      pages_read: 0,
      network_call_used: false,
      timer_started: false
    });
    expect(missingTransport.requests).toHaveLength(0);

    const caughtTransport = new SequenceTransport([]);
    await expect(service({ gateway: new MemoryCursorGateway(cursor({ cursor_status: "caught_up_fixture" })), transport: caughtTransport }).run(runInput)).resolves.toMatchObject({
      service_status: "caught_up_fixture",
      safe_reason_codes: ["cursor_already_caught_up"]
    });
    expect(caughtTransport.requests).toHaveLength(0);
  });

  it("completes one page and multiple pages with token handoff and polling metadata", async () => {
    const gateway = new MemoryCursorGateway(cursor());
    const transport = new SequenceTransport([
      successPage({ nextPageToken: "page_2", pollingIntervalMillis: 5000, items: [{ id: "msg_1" }] }),
      successPage({ pollingIntervalMillis: 7000, items: [{ id: "msg_2" }, { id: "duplicate_msg" }, { moderationStatus: "heldForReview" }] })
    ]);
    const result = await service({ gateway, transport }).run(runInput);

    expect(result).toMatchObject({
      service_status: "completed_fixture",
      cycles_completed: 2,
      pages_read: 2,
      pages_ingested: 2,
      events_normalized: 4,
      events_persisted: 2,
      duplicates_skipped: 1,
      held_count: 1,
      next_page_token_present: false,
      next_poll_after_ms: 7000,
      network_call_used: false,
      global_fetch_used: false,
      sleep_used: false,
      real_api_execution: false
    });
    expect(gateway.ingestedTokens).toEqual([null, "page_2"]);
    expect(transport.requests.map((request) => request.page_token ?? null)).toEqual([null, "page_2"]);
    expect(JSON.stringify(result)).not.toContain("live_chat_list_service");
    expect(JSON.stringify(result)).not.toContain("raw comment");
  });

  it("keeps duplicate page replay idempotent and bounded", async () => {
    const gateway = new MemoryCursorGateway(cursor());
    gateway.seenTokens.add("initial");
    const transport = new SequenceTransport([successPage({ items: [{ id: "msg_replay" }] })]);
    const result = await service({ gateway, transport }).run(runInput);

    expect(result).toMatchObject({
      service_status: "completed_fixture",
      pages_read: 1,
      pages_ingested: 0,
      events_normalized: 1,
      events_persisted: 1,
      duplicates_skipped: 1
    });
  });

  it("maps safe transport failures to backoff, blocked, completed, same-failure, and cycle cap statuses", async () => {
    await expect(service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([failure("rate_limit_exceeded", "rate_limit_exceeded")]) }).run(runInput)).resolves.toMatchObject({
      service_status: "backoff_required",
      next_poll_after_ms: 5000,
      safe_failure_capsule: { raw_logs_read: false, scope_expansion: false }
    });
    await expect(service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([failure("quota_unavailable", "quota_unavailable")]) }).run(runInput)).resolves.toMatchObject({ service_status: "blocked" });
    await expect(service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([failure("live_chat_ended", "live_chat_ended")]) }).run(runInput)).resolves.toMatchObject({ service_status: "completed_fixture" });
    await expect(service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([failure("upstream_unavailable", "injected_fetch_exception"), failure("upstream_unavailable", "injected_fetch_exception")]), same_failure_repeat_limit: 2 }).run(runInput)).resolves.toMatchObject({ service_status: "backoff_required" });
    await expect(service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([
      successPage({ nextPageToken: "p2", items: [] }),
      successPage({ nextPageToken: "p3", items: [] }),
      successPage({ nextPageToken: "p4", items: [] })
    ]), max_cycles: 2 }).run(runInput)).resolves.toMatchObject({ service_status: "cycle_budget_exhausted", cycles_completed: 2 });
  });

  it("rejects unsafe constructor bounds and non-fake execution mode", () => {
    expect(() => new YouTubeLiveChatListConnectorService({ transport: new SequenceTransport([]), cursor_gateway: new MemoryCursorGateway(cursor()), execution_mode: "controlled_network_canary" as never })).toThrow("fake_transport_required");
    expect(() => service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([]), max_cycles: 6 })).toThrow("max_cycles_out_of_bounds");
    expect(() => service({ gateway: new MemoryCursorGateway(cursor()), transport: new SequenceTransport([]), same_failure_repeat_limit: 3 })).toThrow("same_failure_repeat_limit_out_of_bounds");
  });

  it("committed list connector service evidence preserves fake-only boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-list-connector-service.json");

    expect(evidence.listConnectorServiceStatus).toBe("implemented");
    expect(evidence.fakeTransportOnlyStatus).toBe("pass");
    expect(evidence.cursorGatewayStatus).toBe("pass");
    expect(evidence.boundedLoopStatus).toBe("pass");
    expect(evidence.networkCallUsed).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.timerUsed).toBe(false);
    expect(evidence.sleepUsed).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
