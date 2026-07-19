import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import { parseDemoFixture } from "@/lib/analysis/fixture-provider";

const articlePath = join(process.cwd(), "fixtures", "demo-article.txt");

describe("demo fixture", () => {
  it("contains nine uniquely anchored findings", async () => {
    const article = (await readFile(articlePath, "utf8")).trim();
    const fixture = parseDemoFixture(demoExpected);
    const ids = new Set<string>();

    expect(fixture.asOfDate).toBe("2026-07-18");
    expect(fixture.output.findings).toHaveLength(9);
    for (const finding of fixture.output.findings) {
      expect(ids.has(finding.id)).toBe(false);
      ids.add(finding.id);

      const start = article.indexOf(finding.sourceText);
      expect(start, finding.id).toBeGreaterThanOrEqual(0);
      expect(article.lastIndexOf(finding.sourceText), finding.id).toBe(start);
      expect(
        finding.prefixText === null ||
          article.slice(start - finding.prefixText.length, start) ===
            finding.prefixText,
        `${finding.id} prefix`,
      ).toBe(true);

      const end = start + finding.sourceText.length;
      expect(
        finding.suffixText === null ||
          article.slice(end, end + finding.suffixText.length) ===
            finding.suffixText,
        `${finding.id} suffix`,
      ).toBe(true);

      if (finding.replacement !== null) {
        expect(finding.confidence, finding.id).toBe("high");
        expect(
          ["outdated", "contradicted", "needs_context"],
          finding.id,
        ).toContain(finding.verdict);
        expect(finding.sources.length, finding.id).toBeGreaterThan(0);
      }
    }
  });
});
