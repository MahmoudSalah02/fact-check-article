import { z } from "zod";

const ServerConfigSchema = z.object({
  DATA_BACKEND: z.enum(["fake", "supabase"]).default("fake"),
  ANALYSIS_PROVIDER: z.enum(["fixture", "openai"]).default("fixture"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
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
  return config;
}
