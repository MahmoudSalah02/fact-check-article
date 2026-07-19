import { describe, expect, it } from "vitest";

import type { Finding } from "@/lib/contracts";
import type {
  DocumentRepository,
  RunRepository,
} from "@/lib/server/repositories";

type RepositoryHarness = {
  documents: DocumentRepository;
  runs: RunRepository;
};

const checkedAt = "2026-07-18";
const originalText = "Original article";

const finding: Finding = {
  id: "repository-contract-finding",
  sourceText: originalText,
  prefixText: null,
  suffixText: null,
  claimType: "fact",
  verdict: "verified",
  forecastStatus: null,
  confidence: "high",
  explanation: "A deterministic repository contract finding.",
  replacement: null,
  sources: [
    {
      url: "https://example.com/source",
      title: "Contract source",
      publisher: "Example",
      publishedAt: null,
    },
  ],
  startOffset: 0,
  endOffset: originalText.length,
  checkedAt,
};

export function runRepositoryContract(
  adapterName: string,
  createHarness: () => RepositoryHarness | Promise<RepositoryHarness>,
) {
  describe(`${adapterName} repository contract`, () => {
    it("preserves the immutable original document", async () => {
      const { documents } = await createHarness();
      const created = await documents.create({
        userId: "contract-user",
        title: null,
        originalText,
      });

      created.originalText = "Mutated outside the repository";

      expect((await documents.getById(created.id))?.originalText).toBe(
        originalText,
      );
    });

    it("persists an atomic completed run and defensive finding copies", async () => {
      const { documents, runs } = await createHarness();
      const document = await documents.create({
        userId: "contract-user",
        title: "Contract",
        originalText,
      });
      const run = await runs.create(document.id, checkedAt);

      expect(run.status).toBe("queued");
      expect(await runs.getFindings(run.id)).toBeNull();

      const inProgress = await runs.markInProgress(run.id, "provider-run-id");
      expect(inProgress.status).toBe("in_progress");

      const completed = await runs.complete(run.id, [finding]);
      const storedFindings = await runs.getFindings(run.id);
      expect(completed.status).toBe("completed");
      expect(storedFindings).toEqual([finding]);

      if (storedFindings) storedFindings[0].explanation = "External mutation";
      expect((await runs.getFindings(run.id))?.[0].explanation).toBe(
        finding.explanation,
      );
    });

    it("represents failed runs without exposing partial findings", async () => {
      const { documents, runs } = await createHarness();
      const document = await documents.create({
        userId: "contract-user",
        title: null,
        originalText,
      });
      const run = await runs.create(document.id, checkedAt);

      const failed = await runs.fail(run.id, "fixture_analysis_failed");

      expect(failed.status).toBe("failed");
      expect(failed.errorCode).toBe("fixture_analysis_failed");
      expect(await runs.getFindings(run.id)).toBeNull();
    });
  });
}
