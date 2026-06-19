import type { FastifyRequest } from "fastify";

export type AdminAuthChecker = (request: FastifyRequest) => boolean;

export type AdminYouTubeConnectorRouteDependencies = {
  requireAdminAuth: AdminAuthChecker;
  connectorCapability: () => {
    client_kind: string;
    network_enabled: boolean;
    oauth_configured: boolean;
    real_api_execution: boolean;
    supports_stream_list: boolean;
    supports_list_fallback: boolean;
    supports_fixture_pages: boolean;
    supports_cursor_handoff: boolean;
  };
  realConnectorReadiness: () => unknown;
  defaultCanaryInput: () => unknown;
  evaluateControlledCanary: (input: any) => unknown;
};
