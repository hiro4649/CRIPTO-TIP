import { z } from "zod";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");

export const AppConfigSchema = z.object({
  DATABASE_URL: z.string().optional(),
  QUEUE_MODE: z.enum(["in_memory", "db_outbox"]).default("in_memory"),
  WORKER_ID: z.string().default("worker-local"),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_STALE_LOCK_MS: z.coerce.number().int().positive().default(300_000),
  MAX_RETRY_COUNT: z.coerce.number().int().positive().default(5),
  NODE_ENV: z.string().default("development"),
  APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  MOCK_ADMIN_TOKEN: z.string().default(mockValue("admin")),
  MOCK_INTERNAL_TOKEN: z.string().default(mockValue("internal")),
  MOCK_OVERLAY_TOKEN: z.string().default(mockValue("overlay")),
  IRIS_CORE_API_URL: z.string().url().optional(),
  IRIS_CORE_SHARED_SECRET: z.string().optional(),
  IRIS_CORE_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_OAUTH_TOKEN: z.string().optional(),
  YOUTUBE_CONNECTOR_MODE: z.enum(["mock", "official"]).default("mock"),
  REJECT_DEFAULT_MOCK_TOKENS_IN_PRODUCTION: z.coerce.boolean().default(true)
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = AppConfigSchema.parse(env);
  const productionLike = config.APP_ENV === "production" || config.NODE_ENV === "production";
  if (productionLike && config.REJECT_DEFAULT_MOCK_TOKENS_IN_PRODUCTION) {
    for (const [name, value] of Object.entries({ MOCK_ADMIN_TOKEN: config.MOCK_ADMIN_TOKEN, MOCK_INTERNAL_TOKEN: config.MOCK_INTERNAL_TOKEN, MOCK_OVERLAY_TOKEN: config.MOCK_OVERLAY_TOKEN })) {
      if (value === mockValue("admin") || value === mockValue("internal") || value === mockValue("overlay")) throw new Error(`${name} must not use the local mock default in production`);
    }
    if (!config.IRIS_CORE_API_URL) throw new Error("IRIS_CORE_API_URL is required in production");
    if (!config.IRIS_CORE_SHARED_SECRET || config.IRIS_CORE_SHARED_SECRET === "change-me-iris-core-secret") throw new Error("IRIS_CORE_SHARED_SECRET must not use the local mock default in production");
    if (config.YOUTUBE_CONNECTOR_MODE === "official" && !config.YOUTUBE_API_KEY && !config.YOUTUBE_OAUTH_TOKEN) throw new Error("Official YouTube connector requires YOUTUBE_API_KEY or YOUTUBE_OAUTH_TOKEN in production");
  }
  return config;
}
