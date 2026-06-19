import type { AppConfig } from "../config/env.js";
import { InMemoryRepository } from "./in-memory.js";
import type { CriptoTipRepository } from "./types.js";

export type RuntimeRepositorySelection = {
  selectedMode: "in_memory";
  requestedMode: AppConfig["RUNTIME_REPOSITORY_MODE"];
  queueMode: AppConfig["QUEUE_MODE"];
  databaseUrlConfigured: boolean;
  databaseUrlUsed: false;
  postgresRuntimeEnabled: false;
  realDbConnectionAttempted: false;
  selectionStatus: "selected" | "blocked";
  blocker?: "postgres_runtime_repository_not_enabled" | "db_outbox_requires_postgres_runtime_repository";
};

export function resolveRuntimeRepositorySelection(config: AppConfig): RuntimeRepositorySelection {
  const base = {
    requestedMode: config.RUNTIME_REPOSITORY_MODE,
    queueMode: config.QUEUE_MODE,
    databaseUrlConfigured: Boolean(config.DATABASE_URL),
    databaseUrlUsed: false as const,
    postgresRuntimeEnabled: false as const,
    realDbConnectionAttempted: false as const
  };
  if (config.RUNTIME_REPOSITORY_MODE === "postgres") {
    return { ...base, selectedMode: "in_memory", selectionStatus: "blocked", blocker: "postgres_runtime_repository_not_enabled" };
  }
  if (config.QUEUE_MODE === "db_outbox") {
    return { ...base, selectedMode: "in_memory", selectionStatus: "blocked", blocker: "db_outbox_requires_postgres_runtime_repository" };
  }
  return { ...base, selectedMode: "in_memory", selectionStatus: "selected" };
}

export function createRuntimeRepository(config: AppConfig): CriptoTipRepository {
  const selection = resolveRuntimeRepositorySelection(config);
  if (selection.selectionStatus !== "selected") throw new Error(selection.blocker);
  return new InMemoryRepository();
}
