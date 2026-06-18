export type YouTubeCredentialProviderStatus = "unavailable" | "fake_opaque";

export type YouTubeAccessCredentialHandle = {
  credential_handle_id: string;
  expires_at: string;
  scope_ids: string[];
  credential_type: "access_token_handle";
  raw_value_exposed: false;
  authorization_header_exposed: false;
};

export type YouTubeCredentialProviderMetadata = {
  provider_status: YouTubeCredentialProviderStatus;
  raw_value_exposed: false;
  environment_read: false;
  filesystem_secret_read: false;
  safe_reason_codes: string[];
};

export type YouTubeCredentialProviderResult =
  | { status: "credential_handle_acquired"; handle: YouTubeAccessCredentialHandle; safe_reason_codes: string[] }
  | { status: "credential_unavailable"; handle: null; safe_reason_codes: string[] };

export interface YouTubeCredentialProvider {
  getMetadata(): YouTubeCredentialProviderMetadata;
  acquireAccessCredentialHandle(input: { scope_ids: string[]; now?: Date }): Promise<YouTubeCredentialProviderResult>;
  releaseAccessCredentialHandle(handleId: string): Promise<{ status: "released" | "already_released"; raw_value_exposed: false }>;
  markRefreshRequired(handleId: string): Promise<{ status: "refresh_required_marked"; refresh_executed: false }>;
  markRevocationRequired(handleId: string): Promise<{ status: "revocation_required_marked"; revocation_executed: false }>;
}

export class UnavailableYouTubeCredentialProvider implements YouTubeCredentialProvider {
  getMetadata(): YouTubeCredentialProviderMetadata {
    return {
      provider_status: "unavailable",
      raw_value_exposed: false,
      environment_read: false,
      filesystem_secret_read: false,
      safe_reason_codes: ["credential_provider_unavailable"]
    };
  }

  async acquireAccessCredentialHandle(_input: { scope_ids: string[]; now?: Date }): Promise<YouTubeCredentialProviderResult> {
    return { status: "credential_unavailable", handle: null, safe_reason_codes: ["credential_provider_unavailable"] };
  }

  async releaseAccessCredentialHandle(): Promise<{ status: "already_released"; raw_value_exposed: false }> {
    return { status: "already_released", raw_value_exposed: false };
  }

  async markRefreshRequired(): Promise<{ status: "refresh_required_marked"; refresh_executed: false }> {
    return { status: "refresh_required_marked", refresh_executed: false };
  }

  async markRevocationRequired(): Promise<{ status: "revocation_required_marked"; revocation_executed: false }> {
    return { status: "revocation_required_marked", revocation_executed: false };
  }
}

export class FakeOpaqueYouTubeCredentialProvider implements YouTubeCredentialProvider {
  readonly #released = new Set<string>();

  getMetadata(): YouTubeCredentialProviderMetadata {
    return {
      provider_status: "fake_opaque",
      raw_value_exposed: false,
      environment_read: false,
      filesystem_secret_read: false,
      safe_reason_codes: ["fake_opaque_handle_only"]
    };
  }

  async acquireAccessCredentialHandle(input: { scope_ids: string[]; now?: Date }): Promise<YouTubeCredentialProviderResult> {
    const now = input.now ?? new Date();
    const scopeFingerprint = input.scope_ids.join("|").replace(/[^a-z0-9._:/-]/gi, "_").slice(0, 80);
    return {
      status: "credential_handle_acquired",
      handle: {
        credential_handle_id: `fake_handle_${scopeFingerprint || "none"}`,
        expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        scope_ids: input.scope_ids,
        credential_type: "access_token_handle",
        raw_value_exposed: false,
        authorization_header_exposed: false
      },
      safe_reason_codes: ["fake_opaque_handle_acquired"]
    };
  }

  async releaseAccessCredentialHandle(handleId: string): Promise<{ status: "released" | "already_released"; raw_value_exposed: false }> {
    if (this.#released.has(handleId)) return { status: "already_released", raw_value_exposed: false };
    this.#released.add(handleId);
    return { status: "released", raw_value_exposed: false };
  }

  async markRefreshRequired(): Promise<{ status: "refresh_required_marked"; refresh_executed: false }> {
    return { status: "refresh_required_marked", refresh_executed: false };
  }

  async markRevocationRequired(): Promise<{ status: "revocation_required_marked"; revocation_executed: false }> {
    return { status: "revocation_required_marked", revocation_executed: false };
  }
}
