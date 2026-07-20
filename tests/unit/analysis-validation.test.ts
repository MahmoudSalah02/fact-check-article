import { describe, expect, it } from "vitest";

import {
  parseAndValidateAnalysisOutput,
  type AvailableEvidenceUrl,
  type SelectedCitation,
} from "@/lib/analysis/validate-output";
import { AnalysisOutputSchema, type AnalysisOutput } from "@/lib/contracts";
import { RECORDED_F4_CASES } from "@/tests/fixtures/f4-recorded-cases";

const recordedCase = RECORDED_F4_CASES[1];

type MutableValidationInput = {
  articleText: string;
  checkedAt: string;
  rawOutput: AnalysisOutput;
  evidence: {
    availableUrls: AvailableEvidenceUrl[];
    selectedCitations: SelectedCitation[];
  };
};

function validInput(): MutableValidationInput {
  return {
    articleText: recordedCase.articleText,
    checkedAt: recordedCase.checkedAt,
    rawOutput: AnalysisOutputSchema.parse(recordedCase.rawOutput),
    evidence: {
      availableUrls: recordedCase.evidence.availableUrls.map((item) => ({
        ...item,
      })),
      selectedCitations: recordedCase.evidence.selectedCitations.map(
        (item) => ({ ...item }),
      ),
    },
  };
}

describe("parseAndValidateAnalysisOutput", () => {
  it("accepts a cited, uniquely anchored finding", () => {
    const input = validInput();
    input.evidence.availableUrls[0]!.url += "#current-holder";
    input.evidence.selectedCitations[0]!.url += "#citation";

    const output = parseAndValidateAnalysisOutput(input);

    expect(output).toEqual(recordedCase.rawOutput);
    expect(output).not.toBe(recordedCase.rawOutput);
  });

  it("rejects malformed structured output, including provider offsets", () => {
    const input = validInput();
    const finding = input.rawOutput.findings[0]!;
    Object.assign(finding, { startOffset: 19 });

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow();
  });

  it("rejects an evidence-backed verdict without a source", () => {
    const input = validInput();
    input.rawOutput.findings[0]!.sources = [];
    input.rawOutput.findings[0]!.replacement = null;
    input.evidence = { availableUrls: [], selectedCitations: [] };

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /requires cited evidence/,
    );
  });

  it("rejects a source absent from response evidence metadata", () => {
    const input = validInput();
    input.evidence.availableUrls = [];

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /not present in search or citation metadata/,
    );
  });

  it("rejects a consulted URL that was not selected as support", () => {
    const input = validInput();
    input.evidence.selectedCitations = [];

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /consulted but not selected/,
    );
  });

  it("rejects citation support that the explanation does not state", () => {
    const input = validInput();
    input.evidence.selectedCitations[0]!.supports =
      "announces a different infrastructure budget";

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /explanation does not state/,
    );
  });

  it("rejects citation selections not attached to their finding", () => {
    const input = validInput();
    input.evidence.availableUrls.push({
      url: "https://cabinet.example.gov/unrelated",
      surface: "url_citation",
    });
    input.evidence.selectedCitations.push({
      findingId: "transport-secretary",
      url: "https://cabinet.example.gov/unrelated",
      supports: "unrelated",
    });

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /not attached to finding/,
    );
  });

  it("rejects a citation selection for an unknown finding", () => {
    const input = validInput();
    input.evidence.selectedCitations[0]!.findingId = "missing";

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /unknown finding/,
    );
  });

  it("rejects ambiguous exact quotes instead of guessing offsets", () => {
    expect(() =>
      parseAndValidateAnalysisOutput({
        articleText: "Repeat claim. Repeat claim.",
        checkedAt: "2026-07-20",
        rawOutput: {
          findings: [
            {
              id: "repeat",
              sourceText: "Repeat claim",
              prefixText: null,
              suffixText: ".",
              claimType: "fact",
              verdict: "unsupported",
              forecastStatus: null,
              confidence: "low",
              explanation: "No complete evidence was available.",
              replacement: null,
              sources: [],
            },
          ],
        },
        evidence: { availableUrls: [], selectedCitations: [] },
      }),
    ).toThrow(/ambiguous/);
  });

  it("rejects a forecast without a separate forecast status", () => {
    const input = validInput();
    input.rawOutput.findings[0]!.claimType = "forecast";

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow(
      /requires a forecastStatus/,
    );
  });

  it("rejects low-confidence and whole-article corrections", () => {
    const lowConfidence = validInput();
    lowConfidence.rawOutput.findings[0]!.confidence = "low";
    expect(() => parseAndValidateAnalysisOutput(lowConfidence)).toThrow();

    const wholeArticle = validInput();
    wholeArticle.rawOutput.findings[0]!.replacement = wholeArticle.articleText;
    expect(() => parseAndValidateAnalysisOutput(wholeArticle)).toThrow(
      /rewrites the entire article/,
    );
  });

  it("rejects forecast lifecycle words used as verdicts", () => {
    const input = validInput();
    (
      input.rawOutput.findings[0] as unknown as {
        verdict: string;
      }
    ).verdict = "revised";

    expect(() => parseAndValidateAnalysisOutput(input)).toThrow();
  });
});
