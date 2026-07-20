import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  liveAnalysisEvaluationsEnabled,
  runAnalysisEvaluation,
} from "@/lib/analysis/evaluation";
import { parseDemoFixture } from "@/lib/analysis/fixture-provider";
import { RecordedAnalysisProvider } from "@/lib/analysis/recorded-provider";
import { parseAndValidateAnalysisOutput } from "@/lib/analysis/validate-output";
import type { Verdict } from "@/lib/contracts";
import { resolveFindingSpans } from "@/lib/domain/resolve-spans";
import demoExpected from "@/fixtures/demo-expected.json";
import { RECORDED_F4_CASES } from "@/tests/fixtures/f4-recorded-cases";

describe("F4 recorded analysis evaluations", () => {
  it.each(RECORDED_F4_CASES)("$expected.scenario", async (recordedCase) => {
    const provider = new RecordedAnalysisProvider([recordedCase]);
    const output = await runAnalysisEvaluation(provider, {
      runId: `eval-${recordedCase.id}`,
      articleText: recordedCase.articleText,
      checkedAt: recordedCase.checkedAt,
    });
    const [finding] = output.findings;

    expect(finding).toMatchObject({
      id: recordedCase.expected.findingId,
      claimType: recordedCase.expected.claimType,
      verdict: recordedCase.expected.verdict,
      forecastStatus: recordedCase.expected.forecastStatus,
      confidence: recordedCase.expected.confidence,
      replacement: recordedCase.expected.replacement,
    });
    expect(finding?.sources).toHaveLength(recordedCase.expected.sourceCount);

    const [resolved] = resolveFindingSpans(
      recordedCase.articleText,
      output.findings,
      recordedCase.checkedAt,
    );
    expect(
      recordedCase.articleText.slice(
        resolved?.startOffset,
        resolved?.endOffset,
      ),
    ).toBe(finding?.sourceText);
    expect(finding).not.toHaveProperty("startOffset");
    expect(finding).not.toHaveProperty("endOffset");

    if (finding?.replacement !== null) {
      expect(finding?.confidence).toBe("high");
      expect(finding?.sources.length).toBeGreaterThan(0);
      expect(finding?.replacement).not.toBe(finding?.sourceText);
      expect(finding?.replacement).not.toBe(recordedCase.articleText);
    }
  });

  it("covers every normalized verdict and keeps forecast lifecycle separate", () => {
    const verdicts = new Set(
      RECORDED_F4_CASES.flatMap(({ rawOutput }) =>
        rawOutput.findings.map(({ verdict }) => verdict),
      ),
    );
    const expectedVerdicts = new Set<Verdict>([
      "verified",
      "outdated",
      "contradicted",
      "unsupported",
      "needs_context",
      "unresolved",
      "opinion",
    ]);

    expect(verdicts).toEqual(expectedVerdicts);
    expect(
      RECORDED_F4_CASES.find(
        ({ expected }) => expected.scenario === "revised forecast",
      )?.expected,
    ).toMatchObject({ verdict: "outdated", forecastStatus: "revised" });
    expect(
      RECORDED_F4_CASES.find(
        ({ expected }) => expected.scenario === "unsupported precision",
      )?.expected,
    ).toMatchObject({ verdict: "needs_context", forecastStatus: "pending" });
  });

  it("leaves a verified claim unchanged", async () => {
    const recordedCase = RECORDED_F4_CASES[0]!;
    const output = await runAnalysisEvaluation(
      new RecordedAnalysisProvider([recordedCase]),
      {
        runId: "verified-no-change",
        articleText: recordedCase.articleText,
        checkedAt: recordedCase.checkedAt,
      },
    );

    expect(output.findings[0]).toMatchObject({
      verdict: "verified",
      replacement: null,
    });
  });

  it("keeps the nine-finding demo fixture valid under F4 invariants", async () => {
    const articleText = (
      await readFile(
        join(process.cwd(), "fixtures", "demo-article.txt"),
        "utf8",
      )
    ).trim();
    const fixture = parseDemoFixture(demoExpected);
    const sourceUrls = new Set(
      fixture.output.findings.flatMap(({ sources }) =>
        sources.map(({ url }) => url),
      ),
    );
    const validated = parseAndValidateAnalysisOutput({
      articleText,
      checkedAt: fixture.asOfDate,
      rawOutput: fixture.output,
      evidence: {
        availableUrls: [...sourceUrls].map((url) => ({
          url,
          surface: "web_search_source" as const,
        })),
        selectedCitations: fixture.output.findings.flatMap((finding) =>
          finding.sources.map(({ url }) => ({
            findingId: finding.id,
            url,
            supports: finding.explanation,
          })),
        ),
      },
    });

    expect(validated).toEqual(fixture.output);
    expect(validated.findings).toHaveLength(9);
  });
});

describe("RecordedAnalysisProvider contract", () => {
  it("rejects unknown requests and submissions", async () => {
    const provider = new RecordedAnalysisProvider([RECORDED_F4_CASES[0]!]);

    await expect(
      provider.start({
        runId: "unknown",
        articleText: "Different article",
        checkedAt: "2026-07-20",
      }),
    ).rejects.toThrow(/No recorded analysis case/);
    await expect(provider.retrieve("recorded:missing")).rejects.toThrow(
      /Unknown recorded analysis submission/,
    );
  });

  it("rejects duplicate case identifiers and request keys", () => {
    const first = RECORDED_F4_CASES[0]!;
    const second = RECORDED_F4_CASES[1]!;

    expect(() => new RecordedAnalysisProvider([first, first])).toThrow(
      /Duplicate recorded analysis case/,
    );
    expect(
      () =>
        new RecordedAnalysisProvider([
          first,
          {
            ...second,
            articleText: first.articleText,
            checkedAt: first.checkedAt,
          },
        ]),
    ).toThrow(/unique article\/check-date pairs/);
  });

  it("returns isolated output copies", async () => {
    const recordedCase = RECORDED_F4_CASES[0]!;
    const provider = new RecordedAnalysisProvider([recordedCase]);
    const submission = await provider.start({
      runId: "copy-check",
      articleText: recordedCase.articleText,
      checkedAt: recordedCase.checkedAt,
    });
    const first = await provider.retrieve(submission.providerRunId);
    first.findings[0]!.explanation = "mutated";

    const second = await provider.retrieve(submission.providerRunId);
    expect(second.findings[0]?.explanation).not.toBe("mutated");
  });
});

describe("live evaluation opt-in", () => {
  it("is disabled by default and enabled only by an explicit value", () => {
    expect(liveAnalysisEvaluationsEnabled({})).toBe(false);
    expect(
      liveAnalysisEvaluationsEnabled({ RUN_LIVE_ANALYSIS_EVALS: "0" }),
    ).toBe(false);
    expect(
      liveAnalysisEvaluationsEnabled({ RUN_LIVE_ANALYSIS_EVALS: "true" }),
    ).toBe(false);
    expect(
      liveAnalysisEvaluationsEnabled({ RUN_LIVE_ANALYSIS_EVALS: "1" }),
    ).toBe(true);
  });
});
