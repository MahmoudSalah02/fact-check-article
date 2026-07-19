import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import type { RunClient } from "@/lib/contracts";
import { FixtureAnalysisProvider } from "@/lib/analysis/fixture-provider";
import { FakeRunClient } from "@/lib/server/fake-run-client";
import {
  InMemoryDocumentRepository,
  InMemoryRunRepository,
} from "@/lib/server/repositories";
import { runRunClientContract } from "@/tests/contract/run-client-contract";

let article: string;

beforeAll(async () => {
  article = (
    await readFile(join(process.cwd(), "fixtures", "demo-article.txt"), "utf8")
  ).trim();
});

function createClient(): RunClient {
  const provider = new FixtureAnalysisProvider(article, demoExpected);
  return new FakeRunClient(
    new InMemoryDocumentRepository(),
    new InMemoryRunRepository(),
    provider,
    provider.checkedAt,
  );
}

runRunClientContract("FakeRunClient", () => ({ article, createClient }));

describe("fixture adapter behavior", () => {
  it("rejects non-fixture text without fabricating findings", async () => {
    await expect(
      createClient().createRun({ text: "A different article.", title: null }),
    ).rejects.toThrow(/only supports/);
  });
});
