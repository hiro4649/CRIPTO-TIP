import type { FastifyRequest } from "fastify";
import type { SupportReceived } from "@cripto-tip/shared";
import type { CriptoTipRepository } from "../repositories/types.js";

export type AdminModerationAuthChecker = (request: FastifyRequest) => boolean;

export type AdminHeldSupportEntry = {
  event_id: string;
  source: string;
  source_event_id: string;
  stream_id: string;
  character_id: string;
  viewer_display_name: string;
  amount_display: string;
  tier: string;
  moderation_status: string;
  created_at: string;
};

export type AdminModerationReviewSummary = Awaited<ReturnType<CriptoTipRepository["listSupportModerationReviewStatuses"]>>;

export type AdminModerationReadRouteDependencies = {
  repo: Pick<CriptoTipRepository, "listHeldSupportEvents" | "listSupportModerationReviewStatuses" | "writeAuditLog">;
  requireAdminAuth: AdminModerationAuthChecker;
  toHeldSupportEntry: (support: SupportReceived) => AdminHeldSupportEntry;
  buildSummary: (held: SupportReceived[], reviewed: AdminModerationReviewSummary) => unknown;
};
