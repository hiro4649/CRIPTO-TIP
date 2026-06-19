import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config/env.js";
import { InMemoryRepository } from "./in-memory.js";
import { createRuntimeRepository, resolveRuntimeRepositorySelection } from "./runtime-selection.js";

describe("runtime repository selection gate", () => {
  const root = path.resolve(__dirname, "..", "..", "..", "..");
  const productionLikeConfig = (APP_ENV: "test" | "staging" | "production" = "production", extra: Record<string, string> = {}) => loadConfig({
    APP_ENV,
    MOCK_ADMIN_TOKEN: "admin-realistic-placeholder",
    MOCK_INTERNAL_TOKEN: "internal-realistic-placeholder",
    MOCK_OVERLAY_TOKEN: "overlay-realistic-placeholder",
    IRIS_CORE_API_URL: "https://iris.example.test",
    IRIS_CORE_SHARED_SECRET: "prod-secret-placeholder",
    ...extra
  });

  it("selects in-memory repository by default without attempting a real DB connection", () => {
    const config = loadConfig({ APP_ENV: "test" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory_local",
      requestedMode: "in_memory",
      persistenceMode: "volatile_memory",
      databaseUrlUsed: false,
      postgresRuntimeEnabled: false,
      realDbConnectionAttempted: false,
      realDbConnected: false,
      durabilityClaimed: false,
      runtimeReadinessClaimed: false,
      selectionStatus: "selected"
    });
    expect(createRuntimeRepository(config)).toBeInstanceOf(InMemoryRepository);
  });

  it("does not silently use DATABASE_URL while in-memory mode is selected", () => {
    const config = loadConfig({ APP_ENV: "test", DATABASE_URL: "postgres://example.invalid/db" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "in_memory_local",
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
      selectedMode: "blocked_configuration",
      requestedMode: "postgres",
      databaseUrlConfigured: true,
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      selectionStatus: "blocked",
      safeBlocker: "postgres_runtime_repository_not_enabled"
    });
    expect(() => createRuntimeRepository(config)).toThrow("postgres_runtime_repository_not_enabled");
  });

  it("blocks db_outbox queue mode when runtime repository remains in-memory", () => {
    const config = loadConfig({ APP_ENV: "test", QUEUE_MODE: "db_outbox" });
    const selection = resolveRuntimeRepositorySelection(config);

    expect(selection).toMatchObject({
      selectedMode: "blocked_configuration",
      queueMode: "db_outbox",
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      selectionStatus: "blocked",
      safeBlocker: "db_outbox_requires_postgres_runtime_repository"
    });
    expect(() => createRuntimeRepository(config)).toThrow("db_outbox_requires_postgres_runtime_repository");
  });

  it("blocks in-memory runtime repository outside local and test environments", () => {
    for (const config of [productionLikeConfig("staging"), productionLikeConfig("production"), productionLikeConfig("test", { NODE_ENV: "production" })]) {
      const selection = resolveRuntimeRepositorySelection(config);
      expect(selection).toMatchObject({
        selectedMode: "blocked_configuration",
        persistenceMode: "blocked",
        selectionStatus: "blocked",
        safeBlocker: "in_memory_repository_forbidden_outside_local_test",
        databaseUrlUsed: false,
        realDbConnectionAttempted: false,
        realDbConnected: false,
        durabilityClaimed: false,
        runtimeReadinessClaimed: false
      });
      expect(() => createRuntimeRepository(config)).toThrow("in_memory_repository_forbidden_outside_local_test");
    }
  });

  it("selects an injected postgres-compatible repository without opening a real connection", () => {
    const injected = new InMemoryRepository();
    const config = productionLikeConfig("staging");
    const postgresConfig = { ...config, RUNTIME_REPOSITORY_MODE: "postgres" as const, DATABASE_URL: "postgres://example.invalid/db" };
    const selection = resolveRuntimeRepositorySelection(postgresConfig, { injectedRepository: injected, injectedMode: "postgres" });

    expect(selection).toMatchObject({
      selectedMode: "postgres_injected",
      persistenceMode: "postgres_external",
      selectionStatus: "selected",
      databaseUrlConfigured: true,
      databaseUrlUsed: false,
      realDbConnectionAttempted: false,
      realDbConnected: false,
      runtimeReadinessClaimed: false
    });
    expect(createRuntimeRepository(postgresConfig, { injectedRepository: injected, injectedMode: "postgres" })).toBe(injected);
  });

  it("keeps server module imports free of default repository startup side effects", () => {
    const source = fs.readFileSync(path.join(root, "apps", "api", "src", "server.ts"), "utf8");

    expect(source).not.toContain("const appConfig = loadConfig()");
    expect(source).not.toContain("export const repository =");
    expect(source).toContain("export function getRuntimeRepository");
  });
});
