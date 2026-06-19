import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminYouTubeConnectorRouteDependencies } from "./admin-youtube-connector-route-dependencies.js";
import { YouTubeCanaryAuthorizationBundleSchema } from "../youtube-live-chat-canary-authorization-gate.js";

const ControlledCanaryPreflightSchema = z.object({
  config_status: z.enum(["planning_valid", "preflight_blocked", "controlled_canary_candidate", "config_invalid"]),
  oauth_contract_status: z.enum(["pass", "blocked"]),
  credential_provider_status: z.enum(["missing", "opaque_interface_ready"]),
  kill_switch_status: z.enum(["blocked", "armed_for_fake_transport", "armed_for_controlled_canary"]),
  quota_planner_status: z.enum(["pass", "blocked"]),
  direct_rest_transport_status: z.enum(["pass", "blocked"]),
  list_connector_service_status: z.enum(["pass", "blocked"]),
  stream_contract_status: z.enum(["pass", "blocked"]),
  privacy_review_status: z.enum(["required", "pass"]),
  data_deletion_review_status: z.enum(["required", "pass"]),
  revocation_runbook_status: z.enum(["documented", "missing"]),
  network_authorization_status: z.enum(["absent", "present"])
}).strict();

const secretWord = ["client", "secret"].join("[_-]?");
const refreshWord = ["refresh", "token"].join("[_-]?");
const accessWord = ["access", "token"].join("[_-]?");
const liveChatWord = ["live", "chat", "id"].join("[_-]?");
const SECRET_LIKE_INPUT_PATTERN = new RegExp(
  [
    "Bearer",
    `${secretWord}\\s*[:=]`,
    `${refreshWord}\\s*[:=]`,
    `${accessWord}\\s*[:=]`,
    "secretref:",
    "https?:\\/\\/",
    "127\\.0\\.0\\.1",
    "localhost",
    "wallet\\s*[:=]",
    "postgres:\\/\\/",
    "mysql:\\/\\/",
    "mongodb:\\/\\/",
    `${liveChatWord}\\s*[:=]`
  ].join("|"),
  "iu"
);

export function registerAdminYouTubeConnectorRoutes(app: FastifyInstance, deps: AdminYouTubeConnectorRouteDependencies) {
  const {
    requireAdminAuth,
    connectorCapability,
    realConnectorReadiness,
    defaultCanaryInput,
    evaluateControlledCanary,
    defaultCanaryAuthorizationBundle,
    evaluateCanaryAuthorization
  } = deps;

  app.get("/admin/youtube-live-chat/connector-capability", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const capability = connectorCapability();
    return {
      client_kind: capability.client_kind,
      fixture_only: true,
      network_enabled: capability.network_enabled,
      oauth_configured: capability.oauth_configured,
      real_api_execution: capability.real_api_execution,
      supports_stream_list: capability.supports_stream_list,
      supports_list_fallback: capability.supports_list_fallback,
      supports_fixture_pages: capability.supports_fixture_pages,
      supports_cursor_handoff: capability.supports_cursor_handoff,
      max_cycles: 5,
      same_failure_repeat_limit: 2,
      safe_reason_codes: [
        "fake_fixture_only",
        "network_disabled",
        "oauth_not_configured",
        "real_api_execution_false",
        "raw_config_hidden"
      ]
    };
  });

  app.get("/admin/youtube-live-chat/real-connector-readiness", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    return realConnectorReadiness();
  });

  app.get("/admin/youtube-live-chat/canary-authorization", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    return evaluateCanaryAuthorization(defaultCanaryAuthorizationBundle());
  });

  app.post("/admin/youtube-live-chat/canary-authorization/evaluate", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    if (hasSecretLikeInput(req.body ?? {})) {
      return reply.code(400).send({ error: "canary_authorization_invalid", safe_reason_codes: ["secret_like_input_forbidden"] });
    }
    const parsed = YouTubeCanaryAuthorizationBundleSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "canary_authorization_invalid", safe_reason_codes: ["canonical_authorization_fields_required"] });
    return evaluateCanaryAuthorization(parsed.data);
  });

  app.get("/admin/youtube-live-chat/controlled-canary-preflight", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    return evaluateControlledCanary(defaultCanaryInput());
  });

  app.post("/admin/youtube-live-chat/controlled-canary-preflight/evaluate", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const parsed = ControlledCanaryPreflightSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "controlled_canary_preflight_invalid", safe_reason_codes: ["safe_status_fields_required"] });
    if (hasSecretLikeInput(parsed.data)) {
      return reply.code(400).send({ error: "controlled_canary_preflight_invalid", safe_reason_codes: ["secret_like_input_forbidden"] });
    }
    return evaluateControlledCanary(parsed.data);
  });
}

function hasSecretLikeInput(value: unknown): boolean {
  if (typeof value === "string") return SECRET_LIKE_INPUT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(hasSecretLikeInput);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(hasSecretLikeInput);
}
