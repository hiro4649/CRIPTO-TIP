import type {
  YouTubeLiveChatStreamChunk,
  YouTubeLiveChatStreamRequest,
  YouTubeLiveChatStreamTransport
} from "./youtube-live-chat-stream-contract.js";
import { validateYouTubeLiveChatStreamRequest } from "./youtube-live-chat-stream-contract.js";

export class YouTubeLiveChatFakeStreamTransport implements YouTubeLiveChatStreamTransport {
  readonly #chunks: YouTubeLiveChatStreamChunk[];
  readonly #expectedResumeToken: string | null;

  constructor(input: { chunks: YouTubeLiveChatStreamChunk[]; expected_resume_token?: string | null }) {
    this.#chunks = [...input.chunks];
    this.#expectedResumeToken = input.expected_resume_token ?? null;
  }

  async *openStream(request: YouTubeLiveChatStreamRequest): AsyncIterable<YouTubeLiveChatStreamChunk> {
    const requestReasons = validateYouTubeLiveChatStreamRequest(request);
    if (requestReasons.length > 0) {
      yield streamStatus("response_invalid", requestReasons);
      return;
    }
    if ((request.page_token ?? null) !== this.#expectedResumeToken) {
      yield streamStatus("response_invalid", ["resume_token_mismatch"]);
      return;
    }
    for (const chunk of this.#chunks) {
      yield {
        ...chunk,
        raw_frame_stored: false,
        network_call_used: false
      };
    }
    yield streamStatus("fixture_exhausted", ["fixture_exhausted"]);
  }
}

export function streamPage(input: {
  items?: unknown[];
  next_page_token?: string | null;
  polling_interval_ms?: number | null;
  observed_at?: string;
}): YouTubeLiveChatStreamChunk {
  return {
    chunk_status: "stream_page",
    page: {
      ...(input.next_page_token ? { nextPageToken: input.next_page_token } : {}),
      ...(typeof input.polling_interval_ms === "number" ? { pollingIntervalMillis: input.polling_interval_ms } : {}),
      items: input.items ?? []
    },
    next_page_token: input.next_page_token ?? null,
    polling_interval_ms: input.polling_interval_ms ?? null,
    observed_at: input.observed_at ?? "2026-06-18T00:00:00.000Z",
    raw_frame_stored: false,
    network_call_used: false,
    safe_reason_codes: ["stream_page"]
  };
}

export function streamStatus(status: Exclude<YouTubeLiveChatStreamChunk["chunk_status"], "stream_page">, safeReasonCodes: string[]): YouTubeLiveChatStreamChunk {
  return {
    chunk_status: status,
    page: null,
    next_page_token: null,
    polling_interval_ms: null,
    observed_at: "2026-06-18T00:00:00.000Z",
    raw_frame_stored: false,
    network_call_used: false,
    safe_reason_codes: safeReasonCodes
  };
}
