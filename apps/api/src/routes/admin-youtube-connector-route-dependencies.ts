import type { FastifyRequest } from "fastify";
import type { YouTubeCanaryAuthorizationBundle, YouTubeCanaryAuthorizationEvaluationOptions } from "../youtube-live-chat-canary-authorization-gate.js";

export type AdminAuthChecker = (request: FastifyRequest) => boolean;

export type ControlledCanaryPreflightRouteInput = {
  config_status: "planning_valid" | "preflight_blocked" | "controlled_canary_candidate" | "config_invalid";
  oauth_contract_status: "pass" | "blocked";
  credential_provider_status: "missing" | "opaque_interface_ready";
  kill_switch_status: "blocked" | "armed_for_fake_transport" | "armed_for_controlled_canary";
  quota_planner_status: "pass" | "blocked";
  direct_rest_transport_status: "pass" | "blocked";
  list_connector_service_status: "pass" | "blocked";
  stream_contract_status: "pass" | "blocked";
  privacy_review_status: "required" | "pass";
  data_deletion_review_status: "required" | "pass";
  revocation_runbook_status: "documented" | "missing";
  network_authorization_status: "absent" | "present";
};

export type CanaryAuthorizationRouteInput = YouTubeCanaryAuthorizationBundle;

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
  now: () => Date;
  realConnectorReadiness: () => unknown;
  defaultCanaryInput: () => ControlledCanaryPreflightRouteInput;
  evaluateControlledCanary: (input: ControlledCanaryPreflightRouteInput, now?: Date, inputTrust?: "committed_safe_bundle" | "untrusted_preview") => unknown;
  defaultCanaryAuthorizationBundle: () => CanaryAuthorizationRouteInput;
  evaluateCanaryAuthorization: (input: unknown, options?: YouTubeCanaryAuthorizationEvaluationOptions) => unknown;
};
