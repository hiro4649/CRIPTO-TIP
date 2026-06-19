import { describe, expect, it } from "vitest";
import { loadConfig } from "../config/env.js";
import { InMemoryRepository } from "./in-memory.js";
import { createRuntimeRepository, resolveRuntimeRepositorySelection } from "./runtime-selection.js";

describe("runtime repository selection gate", () => {
  it("selects in-memory repository by default without attempting a real DB connection", () => {
    const config = loadConfig({ APP_ENV: "test" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory",
      requestedMode: "in_memory",
      databaseUrlUsed: false,
      postgresRuntimeEnabled: false,
      realDbConnectionAttempted: false,
      selectionStatus: "selected"
    });
    expect(createRuntimeRepository(config)).toBeInstanceOf(InMemoryRepository);
  });

  it("does not silently use DATABASE_URL while in-memory mode is selected", () => {
    const config = loadConfig({ APP_ENV: "test", DATABASE_URL: "postgres://example.invalid/db" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory",
      databaseUrlConfigured: true,
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      selectionStatus: "selected"
    });
  });

  it("blocks postgres runtime repository mode until a scoped DB driver PR enables it", () => {
    const config = loadConfig({ APP_ENV: "test", RUNTIME_REPOSITORY_MODE: "postgres", DATABASE_URL: "postgres://example.invalid/db" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory",
      requestedMode: "postgres",
      databaseUrlConfigured: true,
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      selectionStatus: "blocked",
      blocker: "postgres_runtime_repository_not_enabled"
    });
    expect(() => createRuntimeRepository(config)).toThrow("postgres_runtime_repository_not_enabled");
  });

  it("blocks db_outbox queue mode when runtime repository remains in-memory", () => {
    const config = loadConfig({ APP_ENV: "test", QUEUE_MODE: "db_outbox" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory",
      queueMode: "db_outbox",
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      selectionStatus: "blocked",
      blocker: "db_outbox_requires_postgres_runtime_repository"
    });
    expect(() => createRuntimeRepository(config)).toThrow("db_outbox_requires_postgres_runtime_repository");
  });
});
