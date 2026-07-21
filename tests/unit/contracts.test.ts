import { describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import {
  AnalysisFindingSchema,
  AnalysisRunSchema,
  AnalysisOutputSchema,
  FindingSchema,
  ListRecentRunsResultSchema,
  SourceSchema,
} from "@/lib/contracts";
import { parseDemoFixture } from "@/lib/analysis/fixture-provider";

const validFinding = parseDemoFixture(demoExpected).output.findings[1];

describe("finding contracts", () => {
  it("accepts the audited demo fixture", () => {
    expect(parseDemoFixture(demoExpected).output.findings).toHaveLength(9);
  });

  it("rejects forecast status on a non-forecast", () => {
    expect(() =>
      AnalysisFindingSchema.parse({
        ...validFinding,
        forecastStatus: "pending",
      }),
    ).toThrow(/forecastStatus/);
  });

  it("rejects unknown verdict and forecast-status values", () => {
    expect(() =>
      AnalysisFindingSchema.parse({ ...validFinding, verdict: "mostly_true" }),
    ).toThrow();
    expect(() =>
      AnalysisFindingSchema.parse({
        ...validFinding,
        claimType: "forecast",
        forecastStatus: "completed",
      }),
    ).toThrow();
  });

  it("rejects an authoritative replacement without high confidence", () => {
    expect(() =>
      AnalysisFindingSchema.parse({ ...validFinding, confidence: "medium" }),
    ).toThrow(/replacement/);
  });

  it("rejects replacements for unsupported findings", () => {
    expect(() =>
      AnalysisFindingSchema.parse({
        ...validFinding,
        verdict: "unsupported",
        replacement: "An invented answer",
      }),
    ).toThrow(/replacement/);
  });

  it("rejects an authoritative replacement without a citation", () => {
    expect(() =>
      AnalysisFindingSchema.parse({ ...validFinding, sources: [] }),
    ).toThrow(/replacement/);
  });

  it("rejects non-HTTPS sources", () => {
    expect(() =>
      SourceSchema.parse({
        url: "http://example.com/source",
        title: "Unsafe source",
        publisher: null,
        publishedAt: null,
      }),
    ).toThrow(/HTTPS/);
  });

  it("rejects malformed source URLs", () => {
    expect(() =>
      SourceSchema.parse({
        url: "not-a-url",
        title: "Malformed source",
        publisher: null,
        publishedAt: null,
      }),
    ).toThrow();
  });

  it("keeps server-owned dates and offsets out of provider output", () => {
    expect(() =>
      AnalysisFindingSchema.parse({
        ...validFinding,
        checkedAt: "2026-07-18",
        startOffset: 0,
        endOffset: validFinding.sourceText.length,
      }),
    ).toThrow();
  });

  it("rejects duplicate finding IDs", () => {
    expect(() =>
      AnalysisOutputSchema.parse({ findings: [validFinding, validFinding] }),
    ).toThrow(/unique/);
  });

  it("rejects offsets that do not exactly cover the quote", () => {
    expect(() =>
      FindingSchema.parse({
        ...validFinding,
        startOffset: 10,
        endOffset: 11,
        checkedAt: "2026-07-18",
      }),
    ).toThrow(/Offsets/);
  });

  it("requires error codes only for failed runs", () => {
    const baseRun = {
      id: crypto.randomUUID(),
      documentId: crypto.randomUUID(),
      status: "failed",
      checkedAt: "2026-07-18",
      model: null,
      providerResponseId: null,
      errorCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(() => AnalysisRunSchema.parse(baseRun)).toThrow(/error code/);
    expect(() =>
      AnalysisRunSchema.parse({
        ...baseRun,
        status: "completed",
        errorCode: "unexpected",
      }),
    ).toThrow(/Only failed/);
  });

  it("validates the bounded recent-run gallery payload", () => {
    expect(
      ListRecentRunsResultSchema.parse({
        runs: [
          {
            id: crypto.randomUUID(),
            title: "A shared check",
            createdAt: new Date().toISOString(),
          },
        ],
      }).runs,
    ).toHaveLength(1);
    expect(() =>
      ListRecentRunsResultSchema.parse({
        runs: Array.from({ length: 11 }, () => ({
          id: crypto.randomUUID(),
          title: "Too many",
          createdAt: new Date().toISOString(),
        })),
      }),
    ).toThrow();
  });
});
