import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminYouTubeConnectorRouteDependencies } from "./admin-youtube-connector-route-dependencies.js";

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

const SECRET_LIKE_INPUT_PATTERN = /Bearer|Authorization|client_secret|refresh_token|access_token|secretref:|https?:\/\/|127\.0\.0\.1|localhost/iu;

export function registerAdminYouTubeConnectorRoutes(app: FastifyInstance, deps: AdminYouTubeConnectorRouteDependencies) {
  const { requireAdminAuth, connectorCapability, realConnectorReadiness, defaultCanaryInput, evaluateControlledCanary } = deps;

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

  app.get("/admin/youtube-live-chat/controlled-canary-preflight", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    return evaluateControlledCanary(defaultCanaryInput());
  });

  app.post("/admin/youtube-live-chat/controlled-canary-preflight/evaluate", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const parsed = ControlledCanaryPreflightSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "controlled_canary_preflight_invalid", safe_reason_codes: ["safe_status_fields_required"] });
    const serialized = JSON.stringify(Object.values(parsed.data));
    if (SECRET_LIKE_INPUT_PATTERN.test(serialized)) {
      return reply.code(400).send({ error: "controlled_canary_preflight_invalid", safe_reason_codes: ["secret_like_input_forbidden"] });
    }
    return evaluateControlledCanary(parsed.data);
  });
}
