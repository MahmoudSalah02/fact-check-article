import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { AnalysisFindingSchema, type AnalysisFinding } from "@/lib/contracts";
import { resolveFindingSpans } from "@/lib/domain/resolve-spans";

const checkedAt = "2026-07-18";
const baseFinding: AnalysisFinding = {
  id: "claim",
  sourceText: "claim",
  prefixText: null,
  suffixText: null,
  claimType: "fact",
  verdict: "verified",
  forecastStatus: null,
  confidence: "high",
  explanation: "The claim is supported.",
  replacement: null,
  sources: [],
};

const fixtureArticle = readFileSync("fixtures/demo-article.txt", "utf8").trim();
const fixture = JSON.parse(
  readFileSync("fixtures/demo-expected.json", "utf8"),
) as { findings: Array<Record<string, unknown>> };
const fixtureFindings = fixture.findings.map((fixtureFinding) => {
  const item = { ...fixtureFinding };
  delete item.checkedAt;
  return AnalysisFindingSchema.parse(item);
});

function finding(
  overrides: Partial<AnalysisFinding> &
    Pick<AnalysisFinding, "id" | "sourceText">,
): AnalysisFinding {
  return { ...baseFinding, ...overrides };
}

describe("resolveFindingSpans", () => {
  it("resolves all nine fixture findings to their exact text in article order", () => {
    const resolved = resolveFindingSpans(
      fixtureArticle,
      [...fixtureFindings].reverse(),
      checkedAt,
    );

    expect(resolved).toHaveLength(9);
    expect(resolved.map(({ id }) => id)).toEqual([
      "flat-demand",
      "energy-secretary",
      "lbnl-old-forecast",
      "never-updated",
      "two-percent",
      "fully-funded",
      "exact-consumption",
      "all-operating",
      "biggest-threat",
    ]);
    for (const item of resolved) {
      expect(fixtureArticle.slice(item.startOffset, item.endOffset)).toBe(
        item.sourceText,
      );
      expect(item.endOffset).toBe(item.startOffset + item.sourceText.length);
      expect(item.checkedAt).toBe(checkedAt);
    }
  });

  it.each(
    fixtureFindings.map(
      (fixtureFinding) => [fixtureFinding.id, fixtureFinding] as const,
    ),
  )("resolves demo finding %s independently", (_id, fixtureFinding) => {
    const [resolved] = resolveFindingSpans(
      fixtureArticle,
      [fixtureFinding],
      checkedAt,
    );

    expect(resolved?.sourceText).toBe(fixtureFinding.sourceText);
    expect(
      fixtureArticle.slice(resolved?.startOffset, resolved?.endOffset),
    ).toBe(fixtureFinding.sourceText);
  });

  it.each([
    {
      name: "emoji represented by a surrogate pair",
      article: "Before 😀 claim after",
      quote: "claim",
      expectedStart: 10,
    },
    {
      name: "combining characters",
      article: "Cafe\u0301 claim",
      quote: "claim",
      expectedStart: 6,
    },
  ])("uses UTF-16 indices for $name", ({ article, quote, expectedStart }) => {
    const [resolved] = resolveFindingSpans(
      article,
      [finding({ id: "unicode", sourceText: quote })],
      checkedAt,
    );
    expect(resolved?.startOffset).toBe(expectedStart);
  });

  it("uses immediate prefix and suffix anchors to disambiguate repeats", () => {
    const article = "first repeated phrase; second repeated phrase.";
    const [resolved] = resolveFindingSpans(
      article,
      [
        finding({
          id: "second",
          sourceText: "repeated phrase",
          prefixText: "second ",
          suffixText: ".",
        }),
      ],
      checkedAt,
    );
    expect(resolved?.startOffset).toBe(article.lastIndexOf("repeated phrase"));
  });

  it("accepts adjacent findings and sorts out-of-order input", () => {
    const resolved = resolveFindingSpans(
      "onetwo",
      [
        finding({ id: "two", sourceText: "two", prefixText: "one" }),
        finding({ id: "one", sourceText: "one", suffixText: "two" }),
      ],
      checkedAt,
    );
    expect(
      resolved.map(({ id, startOffset, endOffset }) => ({
        id,
        startOffset,
        endOffset,
      })),
    ).toEqual([
      { id: "one", startOffset: 0, endOffset: 3 },
      { id: "two", startOffset: 3, endOffset: 6 },
    ]);
  });

  it.each([
    [
      "missing quotes",
      "text",
      [finding({ id: "bad", sourceText: "absent" })],
      /not found/,
    ],
    [
      "ambiguous quotes",
      "same same",
      [finding({ id: "repeat", sourceText: "same" })],
      /ambiguous/,
    ],
    [
      "bad anchors",
      "before claim after",
      [finding({ id: "anchor", sourceText: "claim", prefixText: "wrong " })],
      /not found/,
    ],
    [
      "duplicate IDs",
      "one two",
      [
        finding({ id: "duplicate", sourceText: "one" }),
        finding({ id: "duplicate", sourceText: "two" }),
      ],
      /Duplicate finding ID/,
    ],
    [
      "nested spans",
      "nested text",
      [
        finding({ id: "outer", sourceText: "nested text" }),
        finding({ id: "inner", sourceText: "text", prefixText: "nested " }),
      ],
      /overlap/,
    ],
    [
      "partially overlapping spans",
      "abcdef",
      [
        finding({ id: "left", sourceText: "abcd" }),
        finding({ id: "right", sourceText: "cdef" }),
      ],
      /overlap/,
    ],
  ] as const)("rejects %s", (_name, article, findings, message) => {
    expect(() =>
      resolveFindingSpans(article, [...findings], checkedAt),
    ).toThrow(message);
  });

  it("rejects zero-length source text and an invalid checked date", () => {
    expect(() =>
      resolveFindingSpans(
        "text",
        [{ ...baseFinding, sourceText: "" }],
        checkedAt,
      ),
    ).toThrow();
    expect(() =>
      resolveFindingSpans("claim", [baseFinding], "not-a-date"),
    ).toThrow();
  });
});
