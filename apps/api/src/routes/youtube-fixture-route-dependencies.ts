import type { FastifyRequest } from "fastify";
import type { SupportReceived } from "@cripto-tip/shared";
import type { CriptoTipRepository } from "../repositories/types.js";

export type InternalAuthChecker = (request: FastifyRequest) => boolean;

export type YouTubeFixtureContractValidation = {
  status: "valid" | "invalid";
  errors: string[];
};

export type YouTubeFixturePreviewResult = {
  contract_validation: YouTubeFixtureContractValidation;
};

export type YouTubeFixtureApplyResult = unknown;

export type YouTubeFixtureRouteDependencies = {
  repo: CriptoTipRepository;
  requireInternalAuth: InternalAuthChecker;
  now: () => string;
  previewReactionDispatch: (repo: CriptoTipRepository, support: SupportReceived) => Promise<YouTubeFixturePreviewResult>;
  applySupportReceived: (repo: CriptoTipRepository, support: SupportReceived) => Promise<YouTubeFixtureApplyResult>;
};
