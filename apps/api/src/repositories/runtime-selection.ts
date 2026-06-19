import type { AppConfig } from "../config/env.js";
import { InMemoryRepository } from "./in-memory.js";
import type { CriptoTipRepository } from "./types.js";

export type RuntimeRepositorySelection = {
  selectedMode: "in_memory_local" | "postgres_injected" | "blocked_configuration";
  requestedMode: AppConfig["RUNTIME_REPOSITORY_MODE"];
  queueMode: AppConfig["QUEUE_MODE"];
  environment: AppConfig["APP_ENV"];
  persistenceMode: "volatile_memory" | "postgres_external" | "blocked";
  databaseUrlConfigured: boolean;
  databaseUrlUsed: false;
  postgresRuntimeEnabled: false;
  realDbConnectionAttempted: false;
  realDbConnected: false;
  durabilityClaimed: false;
  runtimeReadinessClaimed: false;
  selectionStatus: "selected" | "blocked";
  safeBlocker?: "in_memory_repository_forbidden_outside_local_test" | "postgres_runtime_repository_not_enabled" | "db_outbox_requires_postgres_runtime_repository";
};

export type RuntimeRepositorySelectionOptions = {
  injectedRepository?: CriptoTipRepository;
  injectedMode?: "postgres";
};

function isProductionLike(config: AppConfig) {
  return config.APP_ENV === "staging" || config.APP_ENV === "production" || config.NODE_ENV === "production";
}

export function resolveRuntimeRepositorySelection(config: AppConfig, options: RuntimeRepositorySelectionOptions = {}): RuntimeRepositorySelection {
  const base = {
    requestedMode: config.RUNTIME_REPOSITORY_MODE,
    queueMode: config.QUEUE_MODE,
    environment: config.APP_ENV,
    databaseUrlConfigured: Boolean(config.DATABASE_URL),
    databaseUrlUsed: false as const,
    postgresRuntimeEnabled: false as const,
    realDbConnectionAttempted: false as const,
    realDbConnected: false as const,
    durabilityClaimed: false as const,
    runtimeReadinessClaimed: false as const
  };
  if (config.QUEUE_MODE === "db_outbox" && options.injectedMode !== "postgres") {
    return { ...base, selectedMode: "blocked_configuration", persistenceMode: "blocked", selectionStatus: "blocked", safeBlocker: "db_outbox_requires_postgres_runtime_repository" };
  }
  if (config.RUNTIME_REPOSITORY_MODE === "postgres") {
    if (options.injectedRepository && options.injectedMode === "postgres") {
      return { ...base, selectedMode: "postgres_injected", persistenceMode: "postgres_external", selectionStatus: "selected" };
    }
    return { ...base, selectedMode: "blocked_configuration", persistenceMode: "blocked", selectionStatus: "blocked", safeBlocker: "postgres_runtime_repository_not_enabled" };
  }
  if (isProductionLike(config)) {
    return { ...base, selectedMode: "blocked_configuration", persistenceMode: "blocked", selectionStatus: "blocked", safeBlocker: "in_memory_repository_forbidden_outside_local_test" };
  }
  return { ...base, selectedMode: "in_memory_local", persistenceMode: "volatile_memory", selectionStatus: "selected" };
}

export function createRuntimeRepository(config: AppConfig, options: RuntimeRepositorySelectionOptions = {}): CriptoTipRepository {
  const selection = resolveRuntimeRepositorySelection(config, options);
  if (selection.selectionStatus !== "selected") throw new Error(selection.safeBlocker);
  if (selection.selectedMode === "postgres_injected" && options.injectedRepository) return options.injectedRepository;
  return new InMemoryRepository();
}
