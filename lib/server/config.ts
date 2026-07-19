import { z } from "zod";

const ServerConfigSchema = z.object({
  DATA_BACKEND: z.enum(["fake", "supabase"]).default("fake"),
  ANALYSIS_PROVIDER: z.enum(["fixture", "openai"]).default("fixture"),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function readServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  return ServerConfigSchema.parse(environment);
}
