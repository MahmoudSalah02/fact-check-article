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

describe("RunClient adapter contract", () => {
  it("creates a run and returns an atomic completed view", async () => {
    const client = createClient();
    const created = await client.createRun({
      text: article,
      title: "Contract test",
    });
    const result = await client.getRun(created.runId);

    expect(created.status).toBe("completed");
    expect(result.run.status).toBe("completed");
    expect(result.document.originalText).toBe(article);
    expect(result.findings).toHaveLength(9);
    expect(
      result.findings?.every(
        (finding) => finding.endOffset > finding.startOffset,
      ),
    ).toBe(true);
  });

  it("rejects non-fixture text without fabricating findings", async () => {
    await expect(
      createClient().createRun({ text: "A different article.", title: null }),
    ).rejects.toThrow(/only supports/);
  });
});
