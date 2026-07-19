import { describe, expect, it } from "vitest";

import type { RunClient } from "@/lib/contracts";

type RunClientHarness = {
  article: string;
  createClient: () => RunClient;
};

export function runRunClientContract(
  adapterName: string,
  getHarness: () => RunClientHarness,
) {
  describe(`${adapterName} RunClient contract`, () => {
    it("creates a run and returns an atomic completed view", async () => {
      const { article, createClient } = getHarness();
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
  });
}
