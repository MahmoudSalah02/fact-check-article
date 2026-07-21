import { z } from "zod";

const ServerConfigSchema = z.object({
  DATA_BACKEND: z.enum(["fake", "supabase"]).default("fake"),
  ANALYSIS_PROVIDER: z.enum(["fixture", "openai"]).default("fixture"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  OPENAI_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function readServerConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ServerConfig {
  const config = ServerConfigSchema.parse(environment);

  if (
    config.DATA_BACKEND === "supabase" &&
    (!config.NEXT_PUBLIC_SUPABASE_URL ||
      !config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      !config.SUPABASE_SECRET_KEY)
  ) {
    throw new Error(
      "Supabase mode requires its URL, publishable key, and server secret key",
    );
  }

  if (config.ANALYSIS_PROVIDER === "openai") {
    // Live analysis persists runs and completes them out-of-band, so it needs
    // the durable backend plus OpenAI credentials. The webhook signing secret
    // is optional here: GET reconciliation completes runs by polling, and only
    // the webhook route itself requires OPENAI_WEBHOOK_SECRET.
    if (config.DATA_BACKEND !== "supabase") {
      throw new Error("OpenAI analysis requires DATA_BACKEND=supabase");
    }
    if (!config.OPENAI_API_KEY || !config.OPENAI_MODEL) {
      throw new Error(
        "OpenAI analysis requires OPENAI_API_KEY and OPENAI_MODEL",
      );
    }
  }

  return config;
}
