import type { YouTubeLiveChatClient, YouTubeLiveChatReadResult, YouTubeLiveChatSourceMode } from "./youtube-live-chat-client.js";

export type YouTubeLiveChatFakeConnectorLoopStatus =
  | "completed_fixture"
  | "blocked"
  | "cycle_budget_exhausted"
  | "same_failure_repeated";

export type YouTubeLiveChatFakeConnectorLoopSafeFailureCapsule = {
  failure_class: string;
  safe_fingerprint: string;
  cursor_id: string;
  cycle: number;
  short_reason: string;
  recommended_single_repair: string;
  raw_logs_read: false;
  scope_expansion: false;
};

export type YouTubeLiveChatFakeConnectorLoopResult = {
  loop_status: YouTubeLiveChatFakeConnectorLoopStatus;
  cycles_completed: number;
  pages_read: number;
  pages_ingested: number;
  events_normalized: number;
  events_persisted: number;
  duplicates_skipped: number;
  held_count: number;
  last_cursor_status: string;
  safe_failure_capsule?: YouTubeLiveChatFakeConnectorLoopSafeFailureCapsule;
};

export type YouTubeLiveChatFakeConnectorLoopInput = {
  client: YouTubeLiveChatClient;
  cursor_id: string;
  live_chat_id: string;
  mode: YouTubeLiveChatSourceMode;
  initial_page_token?: string | null;
  max_cycles?: number;
  same_failure_repeat_limit?: number;
  ingestPage: (input: { cursor_id: string; page_token: string | null; page: unknown }) => Promise<{
    page_status: "page_ingested" | "page_replayed" | "page_blocked";
    next_page_token: string | null;
    cursor_status: string;
    normalized_count: number;
    persisted_count: number;
    duplicate_count: number;
    held_count: number;
    safe_reason_codes: string[];
  }>;
};

const MAX_CYCLES = 5;
const SAME_FAILURE_REPEAT_LIMIT = 2;

function clampPositive(value: number | undefined, fallback: number, max: number) {
  if (!Number.isInteger(value) || value === undefined || value < 1) return fallback;
  return Math.min(value, max);
}

function safeFingerprint(cursorId: string, cycle: number, failureClass: string) {
  return `fake-loop:${cursorId}:${cycle}:${failureClass}`;
}

function failureResult(input: {
  status: YouTubeLiveChatFakeConnectorLoopStatus;
  cursorId: string;
  cycle: number;
  failureClass: string;
  shortReason: string;
  recommendedSingleRepair: string;
  counters: Omit<YouTubeLiveChatFakeConnectorLoopResult, "loop_status" | "safe_failure_capsule">;
}): YouTubeLiveChatFakeConnectorLoopResult {
  return {
    loop_status: input.status,
    ...input.counters,
    safe_failure_capsule: {
      failure_class: input.failureClass,
      safe_fingerprint: safeFingerprint(input.cursorId, input.cycle, input.failureClass),
      cursor_id: input.cursorId,
      cycle: input.cycle,
      short_reason: input.shortReason,
      recommended_single_repair: input.recommendedSingleRepair,
      raw_logs_read: false,
      scope_expansion: false
    }
  };
}

function readFailureClass(result: YouTubeLiveChatReadResult) {
  return result.safe_failure?.failure_class ?? "fixture_invalid";
}

export async function runYouTubeLiveChatFakeConnectorLoop(input: YouTubeLiveChatFakeConnectorLoopInput): Promise<YouTubeLiveChatFakeConnectorLoopResult> {
  const maxCycles = clampPositive(input.max_cycles, MAX_CYCLES, MAX_CYCLES);
  const sameFailureRepeatLimit = clampPositive(input.same_failure_repeat_limit, SAME_FAILURE_REPEAT_LIMIT, SAME_FAILURE_REPEAT_LIMIT);
  let pageToken = input.initial_page_token ?? null;
  let lastFailureClass: string | undefined;
  let sameFailureCount = 0;
  const counters = {
    cycles_completed: 0,
    pages_read: 0,
    pages_ingested: 0,
    events_normalized: 0,
    events_persisted: 0,
    duplicates_skipped: 0,
    held_count: 0,
    last_cursor_status: "not_started"
  };

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const read = input.mode === "stream"
      ? await input.client.readStreamPage({ live_chat_id: input.live_chat_id, page_token: pageToken })
      : await input.client.readListPage({ live_chat_id: input.live_chat_id, page_token: pageToken });
    counters.cycles_completed = cycle;
    if (read.safe_failure || !read.page) {
      const failureClass = readFailureClass(read);
      sameFailureCount = failureClass === lastFailureClass ? sameFailureCount + 1 : 1;
      lastFailureClass = failureClass;
      if (sameFailureCount >= sameFailureRepeatLimit) {
        return failureResult({
          status: "same_failure_repeated",
          cursorId: input.cursor_id,
          cycle,
          failureClass,
          shortReason: "same fixture read failure repeated",
          recommendedSingleRepair: "repair fixture page token sequence or fixture page shape",
          counters
        });
      }
      return failureResult({
        status: "blocked",
        cursorId: input.cursor_id,
        cycle,
        failureClass,
        shortReason: "fixture read failed",
        recommendedSingleRepair: "repair fixture page token sequence or fixture page shape",
        counters
      });
    }
    counters.pages_read += 1;
    const ingest = await input.ingestPage({ cursor_id: input.cursor_id, page_token: pageToken, page: read.page });
    counters.last_cursor_status = ingest.cursor_status;
    if (ingest.page_status === "page_blocked") {
      return failureResult({
        status: "blocked",
        cursorId: input.cursor_id,
        cycle,
        failureClass: "page_ingest_blocked",
        shortReason: "fixture page ingest was blocked",
        recommendedSingleRepair: "repair cursor token order or fixture page content",
        counters
      });
    }
    counters.pages_ingested += ingest.page_status === "page_ingested" ? 1 : 0;
    counters.events_normalized += ingest.normalized_count;
    counters.events_persisted += ingest.persisted_count;
    counters.duplicates_skipped += ingest.duplicate_count;
    counters.held_count += ingest.held_count;
    pageToken = ingest.next_page_token ?? read.next_page_token ?? null;
    if (!pageToken || ingest.cursor_status === "caught_up_fixture") {
      return { loop_status: "completed_fixture", ...counters };
    }
  }

  return failureResult({
    status: "cycle_budget_exhausted",
    cursorId: input.cursor_id,
    cycle: maxCycles,
    failureClass: "cycle_budget_exhausted",
    shortReason: "fake connector loop reached the cycle cap",
    recommendedSingleRepair: "reduce fixture pages or split the fixture run",
    counters
  });
}
