import type { YouTubeLiveChatClient, YouTubeLiveChatReadRequest, YouTubeLiveChatReadResult, YouTubeLiveChatSafeFailureClass, YouTubeLiveChatSourceMode } from "./youtube-live-chat-client.js";
import { fakeFixtureCapability } from "./youtube-live-chat-client.js";

type FixturePage = {
  page_token: string | null;
  page: unknown;
  next_page_token: string | null;
  polling_interval_ms?: number | null;
};

function safeFailure(sourceMode: YouTubeLiveChatSourceMode, failureClass: YouTubeLiveChatSafeFailureClass, safeReason: string): YouTubeLiveChatReadResult {
  return {
    source_mode: sourceMode,
    next_page_token: null,
    polling_interval_ms: null,
    observed_at: "fixture_observed_at",
    safe_failure: {
      failure_class: failureClass,
      safe_reason: safeReason,
      raw_logs_read: false,
      scope_expansion: false
    }
  };
}

function readFixturePage(sourceMode: YouTubeLiveChatSourceMode, fixtures: FixturePage[], request: YouTubeLiveChatReadRequest): YouTubeLiveChatReadResult {
  if (!request.live_chat_id) return safeFailure(sourceMode, "fixture_invalid", "live_chat_id_required");
  const requestedToken = request.page_token ?? null;
  const fixture = fixtures.find((page) => page.page_token === requestedToken);
  if (!fixture) return safeFailure(sourceMode, "page_token_invalid", "fixture_page_token_not_found");
  if (typeof fixture.page !== "object" || fixture.page === null || Array.isArray(fixture.page)) return safeFailure(sourceMode, "fixture_invalid", "fixture_page_invalid");
  return {
    source_mode: sourceMode,
    page: fixture.page,
    next_page_token: fixture.next_page_token,
    polling_interval_ms: fixture.polling_interval_ms ?? null,
    observed_at: "fixture_observed_at"
  };
}

export class YouTubeLiveChatFakeClient implements YouTubeLiveChatClient {
  readonly #streamPages: FixturePage[];
  readonly #listPages: FixturePage[];

  constructor(input: { stream_pages?: FixturePage[]; list_pages?: FixturePage[] }) {
    this.#streamPages = input.stream_pages ?? [];
    this.#listPages = input.list_pages ?? [];
  }

  getCapability() {
    return fakeFixtureCapability();
  }

  async readStreamPage(request: YouTubeLiveChatReadRequest) {
    return readFixturePage("stream", this.#streamPages, request);
  }

  async readListPage(request: YouTubeLiveChatReadRequest) {
    return readFixturePage("list", this.#listPages, request);
  }
}
