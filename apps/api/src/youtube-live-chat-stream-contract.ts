import type { YouTubeLiveChatSafePageProjection } from "./youtube-live-chat-direct-rest-transport.js";

export type YouTubeLiveChatStreamChunkStatus =
  | "stream_page"
  | "stream_disconnected"
  | "live_chat_ended"
  | "live_chat_disabled"
  | "live_chat_not_found"
  | "rate_limit_exceeded"
  | "oauth_missing"
  | "network_forbidden"
  | "response_invalid"
  | "fixture_exhausted";

export type YouTubeLiveChatStreamRequest = {
  live_chat_id: string;
  page_token?: string | null;
  max_results?: number;
  hl?: string | null;
  timeout_budget_ms: number;
  execution_mode: "fake_stream";
};

export type YouTubeLiveChatStreamChunk = {
  chunk_status: YouTubeLiveChatStreamChunkStatus;
  page: YouTubeLiveChatSafePageProjection | null;
  next_page_token: string | null;
  polling_interval_ms: number | null;
  observed_at: string;
  raw_frame_stored: false;
  network_call_used: false;
  safe_reason_codes: string[];
};

export interface YouTubeLiveChatStreamTransport {
  openStream(request: YouTubeLiveChatStreamRequest): AsyncIterable<YouTubeLiveChatStreamChunk>;
}

export type YouTubeLiveChatStreamConsumeResult = {
  stream_status: "completed" | "blocked" | "backoff_required" | "aborted" | "chunk_budget_exhausted" | "same_failure_repeated";
  chunks_read: number;
  pages_read: number;
  last_chunk_status: YouTubeLiveChatStreamChunkStatus | null;
  next_page_token: string | null;
  network_call_used: false;
  global_fetch_used: false;
  timer_started: false;
  sleep_used: false;
  grpc_used: false;
  http_streaming_used: false;
  google_sdk_used: false;
  real_api_execution: false;
  raw_frame_stored: false;
  safe_reason_codes: string[];
};

export function validateYouTubeLiveChatStreamRequest(request: YouTubeLiveChatStreamRequest): string[] {
  const reasons: string[] = [];
  if (request.execution_mode !== "fake_stream") reasons.push("fake_stream_required");
  if (!request.live_chat_id || request.live_chat_id.length > 240 || /[\u0000-\u001f\u007f]/u.test(request.live_chat_id)) reasons.push("live_chat_id_invalid");
  if (request.page_token !== undefined && request.page_token !== null && (request.page_token.length > 512 || /[\u0000-\u001f\u007f]/u.test(request.page_token))) reasons.push("page_token_invalid");
  if (request.max_results !== undefined && (!Number.isInteger(request.max_results) || request.max_results < 200 || request.max_results > 2000)) reasons.push("max_results_out_of_bounds");
  if (request.hl !== undefined && request.hl !== null && (request.hl.length > 35 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(request.hl))) reasons.push("hl_invalid");
  if (!Number.isInteger(request.timeout_budget_ms) || request.timeout_budget_ms < 100 || request.timeout_budget_ms > 30000) reasons.push("timeout_budget_invalid");
  return reasons;
}

export async function consumeYouTubeLiveChatStream(input: {
  transport: YouTubeLiveChatStreamTransport;
  request: YouTubeLiveChatStreamRequest;
  max_chunks?: number;
  same_failure_repeat_limit?: number;
  abort_signal?: AbortSignal;
}): Promise<YouTubeLiveChatStreamConsumeResult> {
  const requestReasons = validateYouTubeLiveChatStreamRequest(input.request);
  if (requestReasons.length > 0) return consumeResult("blocked", 0, 0, null, null, requestReasons);
  const maxChunks = boundedInteger(input.max_chunks ?? 5, 1, 5, "max_chunks");
  const sameFailureRepeatLimit = boundedInteger(input.same_failure_repeat_limit ?? 2, 1, 2, "same_failure_repeat_limit");
  let chunksRead = 0;
  let pagesRead = 0;
  let lastFailure: YouTubeLiveChatStreamChunkStatus | null = null;
  let sameFailureCount = 0;

  for await (const chunk of input.transport.openStream(input.request)) {
    if (input.abort_signal?.aborted) return consumeResult("aborted", chunksRead, pagesRead, chunk.chunk_status, chunk.next_page_token, ["stream_aborted"]);
    chunksRead += 1;
    if (chunk.chunk_status === "stream_page") {
      pagesRead += 1;
      lastFailure = null;
      sameFailureCount = 0;
    } else {
      sameFailureCount = chunk.chunk_status === lastFailure ? sameFailureCount + 1 : 1;
      lastFailure = chunk.chunk_status;
      if (sameFailureCount >= sameFailureRepeatLimit) return consumeResult("same_failure_repeated", chunksRead, pagesRead, chunk.chunk_status, chunk.next_page_token, chunk.safe_reason_codes);
      if (chunk.chunk_status === "response_invalid" && chunk.safe_reason_codes.includes("response_invalid")) continue;
      const mapped = mapChunkStatus(chunk.chunk_status);
      if (mapped !== "completed") return consumeResult(mapped, chunksRead, pagesRead, chunk.chunk_status, chunk.next_page_token, chunk.safe_reason_codes);
      return consumeResult("completed", chunksRead, pagesRead, chunk.chunk_status, chunk.next_page_token, chunk.safe_reason_codes);
    }
    if (chunksRead >= maxChunks) return consumeResult("chunk_budget_exhausted", chunksRead, pagesRead, chunk.chunk_status, chunk.next_page_token, ["chunk_budget_exhausted"]);
  }

  return consumeResult("completed", chunksRead, pagesRead, null, null, ["fixture_exhausted"]);
}

function mapChunkStatus(status: Exclude<YouTubeLiveChatStreamChunkStatus, "stream_page">): YouTubeLiveChatStreamConsumeResult["stream_status"] {
  if (status === "stream_disconnected" || status === "rate_limit_exceeded") return "backoff_required";
  if (status === "live_chat_ended" || status === "fixture_exhausted") return "completed";
  return "blocked";
}

function consumeResult(status: YouTubeLiveChatStreamConsumeResult["stream_status"], chunksRead: number, pagesRead: number, lastChunkStatus: YouTubeLiveChatStreamChunkStatus | null, nextPageToken: string | null, safeReasonCodes: string[]): YouTubeLiveChatStreamConsumeResult {
  return {
    stream_status: status,
    chunks_read: chunksRead,
    pages_read: pagesRead,
    last_chunk_status: lastChunkStatus,
    next_page_token: nextPageToken,
    network_call_used: false,
    global_fetch_used: false,
    timer_started: false,
    sleep_used: false,
    grpc_used: false,
    http_streaming_used: false,
    google_sdk_used: false,
    real_api_execution: false,
    raw_frame_stored: false,
    safe_reason_codes: safeReasonCodes
  };
}

function boundedInteger(value: number, min: number, max: number, name: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name}_out_of_bounds`);
  return value;
}
