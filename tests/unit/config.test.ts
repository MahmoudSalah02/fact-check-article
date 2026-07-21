import { describe, expect, it } from "vitest";

import { readServerConfig } from "@/lib/server/config";

const SUPABASE_ENV = {
  DATA_BACKEND: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_SECRET_KEY: "sb_secret_example",
} as const;

describe("server configuration", () => {
  it("defaults to deterministic local adapters", () => {
    expect(readServerConfig({})).toEqual({
      DATA_BACKEND: "fake",
      ANALYSIS_PROVIDER: "fixture",
    });
  });

  it("rejects unknown adapter names", () => {
    expect(() => readServerConfig({ DATA_BACKEND: "filesystem" })).toThrow();
    expect(() =>
      readServerConfig({ ANALYSIS_PROVIDER: "unvalidated" }),
    ).toThrow();
  });

  it("requires the durable backend for OpenAI analysis", () => {
    expect(() =>
      readServerConfig({
        ANALYSIS_PROVIDER: "openai",
        OPENAI_API_KEY: "sk-test",
        OPENAI_MODEL: "gpt-5.6-luna",
      }),
    ).toThrow(/DATA_BACKEND=supabase/);
  });

  it("requires OpenAI credentials in openai mode", () => {
    expect(() =>
      readServerConfig({ ...SUPABASE_ENV, ANALYSIS_PROVIDER: "openai" }),
    ).toThrow(/OPENAI_API_KEY and OPENAI_MODEL/);
  });

  it("accepts a complete OpenAI configuration without a webhook secret", () => {
    const config = readServerConfig({
      ...SUPABASE_ENV,
      ANALYSIS_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-5.6-luna",
    });
    expect(config.ANALYSIS_PROVIDER).toBe("openai");
    expect(config.OPENAI_WEBHOOK_SECRET).toBeUndefined();
  });
});
