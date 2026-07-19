import { describe, expect, it } from "vitest";

import { readServerConfig } from "@/lib/server/config";

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
});
