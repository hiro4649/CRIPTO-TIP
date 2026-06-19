import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminModerationReadRouteDependencies } from "./admin-moderation-read-route-dependencies.js";

const HeldSupportQuerySchema = z.object({
  stream_id: z.string().optional()
}).strict();

export function registerAdminModerationReadRoutes(app: FastifyInstance, deps: AdminModerationReadRouteDependencies) {
  const { repo, requireAdminAuth, toHeldSupportEntry, buildSummary } = deps;

  app.get("/admin/moderation/held-support", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const query = HeldSupportQuerySchema.parse(req.query);
    const held = await repo.listHeldSupportEvents(query.stream_id ? { streamId: query.stream_id } : undefined);
    await repo.writeAuditLog({
      actor_type: "admin",
      actor_id: "admin_mock",
      action: "list_held_support",
      target_type: "held_support_list",
      target_id: query.stream_id ?? "all",
      after_json: { stream_id: query.stream_id ?? "all", result_count: held.length }
    });
    return { held_support: held.map(toHeldSupportEntry) };
  });

  app.get("/admin/moderation/summary", async (req, reply) => {
    if (!requireAdminAuth(req)) return reply.code(401).send({ error: "unauthorized" });
    const held = await repo.listHeldSupportEvents();
    const reviewed = await repo.listSupportModerationReviewStatuses();
    return buildSummary(held, reviewed);
  });
}
