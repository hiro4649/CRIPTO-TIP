import type {
  YouTubeLiveChatDirectRestListTransportResult,
  YouTubeLiveChatSafePageProjection
} from "./youtube-live-chat-direct-rest-transport.js";
import { planYouTubeLiveChatQuotaPolling, type YouTubeLiveChatPlannerFailureClass } from "./youtube-live-chat-quota-polling-planner.js";

export type YouTubeLiveChatCursorStatus = "not_started" | "page_ingested" | "caught_up_fixture";

export type YouTubeLiveChatCursorSnapshot = {
  cursor_id: string;
  stream_id: string;
  youtube_video_id: string;
  live_chat_id: string;
  character_id: string;
  next_page_token: string | null;
  cursor_status: YouTubeLiveChatCursorStatus;
  pages_ingested: number;
};

export type YouTubeLiveChatSafePageIngestResult = {
  ingest_status: "page_ingested" | "duplicate_page_replay" | "ingest_failed";
  cursor: YouTubeLiveChatCursorSnapshot;
  events_normalized: number;
  events_persisted: number;
  duplicates_skipped: number;
  held_count: number;
  safe_reason_codes: string[];
};

export interface YouTubeLiveChatCursorGateway {
  getCursor(cursorId: string): Promise<YouTubeLiveChatCursorSnapshot | null>;
  ingestPage(input: {
    cursor_id: string;
    page_token: string | null;
    page: YouTubeLiveChatSafePageProjection;
    observed_at: string;
  }): Promise<YouTubeLiveChatSafePageIngestResult>;
}

export interface YouTubeLiveChatListTransport {
  executeList(input: {
    live_chat_id: string;
    page_token?: string | null;
    max_results: number;
    hl?: string | null;
    timeout_budget_ms: number;
    now?: Date;
  }): Promise<YouTubeLiveChatDirectRestListTransportResult>;
}

export type YouTubeLiveChatListConnectorServiceStatus =
  | "completed_fixture"
  | "caught_up_fixture"
  | "backoff_required"
  | "blocked"
  | "cycle_budget_exhausted"
  | "same_failure_repeated"
  | "cursor_not_found"
  | "ingest_failed";

export type YouTubeLiveChatListConnectorServiceResult = {
  service_status: YouTubeLiveChatListConnectorServiceStatus;
  execution_mode: "fake_transport";
  cursor_id: string;
  cycles_completed: number;
  pages_read: number;
  pages_ingested: number;
  events_normalized: number;
  events_persisted: number;
  duplicates_skipped: number;
  held_count: number;
  last_cursor_status: YouTubeLiveChatCursorStatus | null;
  next_page_token_present: boolean;
  next_poll_after_ms: number | null;
  network_call_used: false;
  global_fetch_used: false;
  timer_started: false;
  sleep_used: false;
  real_api_execution: false;
  safe_reason_codes: string[];
  safe_failure_capsule?: {
    failure_class: string;
    safe_fingerprint: string;
    repository: "hiro4649/CRIPTO-TIP";
    branch: "feat/p1-youtube-live-chat-list-connector-service";
    test_file: "apps/api/src/p1-youtube-live-chat-list-connector-service.test.ts";
    short_reason: string;
    recommended_single_repair: string;
    raw_logs_read: false;
    scope_expansion: false;
  };
};

export class YouTubeLiveChatListConnectorService {
  readonly #transport: YouTubeLiveChatListTransport;
  readonly #cursorGateway: YouTubeLiveChatCursorGateway;
  readonly #maxCycles: number;
  readonly #sameFailureRepeatLimit: number;
  readonly #clock: () => Date;

  constructor(input: {
    transport: YouTubeLiveChatListTransport;
    cursor_gateway: YouTubeLiveChatCursorGateway;
    execution_mode: "fake_transport";
    clock?: () => Date;
    max_cycles?: number;
    same_failure_repeat_limit?: number;
  }) {
    if (input.execution_mode !== "fake_transport") throw new Error("fake_transport_required");
    this.#maxCycles = boundedInteger(input.max_cycles ?? 5, 1, 5, "max_cycles");
    this.#sameFailureRepeatLimit = boundedInteger(input.same_failure_repeat_limit ?? 2, 1, 2, "same_failure_repeat_limit");
    this.#transport = input.transport;
    this.#cursorGateway = input.cursor_gateway;
    this.#clock = input.clock ?? (() => new Date());
  }

  async run(input: {
    cursor_id: string;
    max_results: number;
    hl?: string | null;
    timeout_budget_ms: number;
    quota_budget_remaining: number | null;
    estimated_request_units: number;
  }): Promise<YouTubeLiveChatListConnectorServiceResult> {
    let cursor = await this.#cursorGateway.getCursor(input.cursor_id);
    if (!cursor) return result("cursor_not_found", input.cursor_id, ["cursor_not_found"]);
    if (cursor.cursor_status === "caught_up_fixture") return result("caught_up_fixture", input.cursor_id, ["cursor_already_caught_up"], { last_cursor_status: cursor.cursor_status });

    let cyclesCompleted = 0;
    let pagesRead = 0;
    let pagesIngested = 0;
    let eventsNormalized = 0;
    let eventsPersisted = 0;
    let duplicatesSkipped = 0;
    let heldCount = 0;
    let sameFailureCount = 0;
    let lastFailureClass: YouTubeLiveChatPlannerFailureClass = "none";
    let nextPollAfterMs: number | null = null;
    let quotaRemainingUnits = input.quota_budget_remaining;

    while (cyclesCompleted < this.#maxCycles) {
      const plan = planYouTubeLiveChatQuotaPolling({
        cycle_index: cyclesCompleted,
        last_polling_interval_ms: nextPollAfterMs,
        quota_remaining_units: quotaRemainingUnits,
        estimated_request_units: input.estimated_request_units,
        same_failure_repeat_count: sameFailureCount,
        last_failure_class: lastFailureClass,
        preferred_mode: "list",
        list_mode_enabled: true,
        execution_mode: "fake_transport",
        kill_switch_status: "armed_for_fake_transport",
        network_authorized: false,
        next_page_token: cursor.next_page_token,
        max_results: input.max_results
      });
      if (plan.status === "poll_blocked") return result("blocked", input.cursor_id, plan.safe_reason_codes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, next_poll_after_ms: nextPollAfterMs });
      if (plan.status === "poll_terminal") return result("completed_fixture", input.cursor_id, plan.safe_reason_codes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status });
      quotaRemainingUnits = quotaRemainingUnits === null ? null : quotaRemainingUnits - input.estimated_request_units;

      const transportResult = await this.#transport.executeList({
        live_chat_id: cursor.live_chat_id,
        page_token: cursor.next_page_token,
        max_results: input.max_results,
        ...(input.hl ? { hl: input.hl } : {}),
        timeout_budget_ms: input.timeout_budget_ms,
        now: this.#clock()
      });
      cyclesCompleted += 1;

      if (transportResult.status !== "success_page") {
        const mapped = mapTransportFailure(transportResult.status, transportResult.safe_reason_codes);
        sameFailureCount = mapped.failureClass === (lastFailureClass as YouTubeLiveChatPlannerFailureClass) ? sameFailureCount + 1 : 1;
        lastFailureClass = mapped.failureClass;
        if (sameFailureCount >= this.#sameFailureRepeatLimit) return result("same_failure_repeated", input.cursor_id, mapped.safeReasonCodes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, safe_failure_capsule: failureCapsule(mapped.failureClass, mapped.safeReasonCodes[0] ?? "unknown") });
        if (mapped.serviceStatus === "backoff_required") return result("backoff_required", input.cursor_id, mapped.safeReasonCodes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, next_poll_after_ms: 5000, safe_failure_capsule: failureCapsule(mapped.failureClass, mapped.safeReasonCodes[0] ?? "unknown") });
        return result(mapped.serviceStatus, input.cursor_id, mapped.safeReasonCodes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, safe_failure_capsule: failureCapsule(mapped.failureClass, mapped.safeReasonCodes[0] ?? "unknown") });
      }

      pagesRead += 1;
      const ingest = await this.#cursorGateway.ingestPage({
        cursor_id: input.cursor_id,
        page_token: cursor.next_page_token,
        page: transportResult.page,
        observed_at: this.#clock().toISOString()
      });
      if (ingest.ingest_status === "ingest_failed") return result("ingest_failed", input.cursor_id, ingest.safe_reason_codes, { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, safe_failure_capsule: failureCapsule("ingest_failed", ingest.safe_reason_codes[0] ?? "ingest_failed") });

      cursor = ingest.cursor;
      pagesIngested += ingest.ingest_status === "page_ingested" ? 1 : 0;
      eventsNormalized += ingest.events_normalized;
      eventsPersisted += ingest.events_persisted;
      duplicatesSkipped += ingest.duplicates_skipped;
      heldCount += ingest.held_count;
      nextPollAfterMs = transportResult.polling_interval_ms;
      lastFailureClass = "none";
      sameFailureCount = 0;

      if (!cursor.next_page_token || cursor.cursor_status === "caught_up_fixture") {
        return result("completed_fixture", input.cursor_id, ["fixture_completed"], { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, next_page_token_present: Boolean(cursor.next_page_token), next_poll_after_ms: nextPollAfterMs });
      }
    }

    return result("cycle_budget_exhausted", input.cursor_id, ["cycle_budget_exhausted"], { cycles_completed: cyclesCompleted, pages_read: pagesRead, pages_ingested: pagesIngested, events_normalized: eventsNormalized, events_persisted: eventsPersisted, duplicates_skipped: duplicatesSkipped, held_count: heldCount, last_cursor_status: cursor.cursor_status, next_page_token_present: Boolean(cursor.next_page_token), next_poll_after_ms: nextPollAfterMs });
  }
}

function boundedInteger(value: number, min: number, max: number, name: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name}_out_of_bounds`);
  return value;
}

function result(status: YouTubeLiveChatListConnectorServiceStatus, cursorId: string, safeReasonCodes: string[], overrides: Partial<YouTubeLiveChatListConnectorServiceResult> = {}): YouTubeLiveChatListConnectorServiceResult {
  return {
    service_status: status,
    execution_mode: "fake_transport",
    cursor_id: cursorId,
    cycles_completed: 0,
    pages_read: 0,
    pages_ingested: 0,
    events_normalized: 0,
    events_persisted: 0,
    duplicates_skipped: 0,
    held_count: 0,
    last_cursor_status: null,
    next_page_token_present: false,
    next_poll_after_ms: null,
    network_call_used: false,
    global_fetch_used: false,
    timer_started: false,
    sleep_used: false,
    real_api_execution: false,
    safe_reason_codes: safeReasonCodes,
    ...overrides
  };
}

function mapTransportFailure(status: Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page">, safeReasonCodes: string[]) {
  const failureClass: YouTubeLiveChatPlannerFailureClass = status === "page_token_invalid" ? "page_token_invalid"
    : status === "live_chat_ended" ? "live_chat_ended"
    : status === "live_chat_disabled" ? "live_chat_disabled"
    : status === "live_chat_not_found" ? "live_chat_not_found"
    : status === "rate_limit_exceeded" ? "rate_limit_exceeded"
    : status === "quota_unavailable" ? "quota_unavailable"
    : status === "oauth_missing" ? "oauth_missing"
    : status === "network_forbidden" ? "network_forbidden"
    : "real_api_not_configured";
  const serviceStatus: YouTubeLiveChatListConnectorServiceStatus = status === "live_chat_ended" ? "completed_fixture"
    : status === "rate_limit_exceeded" || status === "upstream_unavailable" ? "backoff_required"
    : "blocked";
  return { failureClass, serviceStatus, safeReasonCodes };
}

function failureCapsule(failureClass: string, reason: string): NonNullable<YouTubeLiveChatListConnectorServiceResult["safe_failure_capsule"]> {
  return {
    failure_class: failureClass,
    safe_fingerprint: `p1_list_connector:${reason}`,
    repository: "hiro4649/CRIPTO-TIP",
    branch: "feat/p1-youtube-live-chat-list-connector-service",
    test_file: "apps/api/src/p1-youtube-live-chat-list-connector-service.test.ts",
    short_reason: reason,
    recommended_single_repair: "Inspect the safe reason code and add one bounded fake-transport contract repair.",
    raw_logs_read: false,
    scope_expansion: false
  };
}
