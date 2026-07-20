import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  AnalysisFindingSchema,
  type AnalysisFinding,
  type Finding,
} from "@/lib/contracts";
import { toRenderSegments } from "@/lib/domain/render-segments";
import { resolveFindingSpans } from "@/lib/domain/resolve-spans";

const analysisFinding = (id: string, sourceText: string): AnalysisFinding => ({
  id,
  sourceText,
  prefixText: null,
  suffixText: null,
  claimType: "fact",
  verdict: "verified",
  forecastStatus: null,
  confidence: "high",
  explanation: "Supported.",
  replacement: null,
  sources: [],
});

describe("toRenderSegments", () => {
  it("round-trips the complete fixture into nine finding segments", () => {
    const original = readFileSync("fixtures/demo-article.txt", "utf8").trim();
    const fixture = JSON.parse(
      readFileSync("fixtures/demo-expected.json", "utf8"),
    ) as { findings: Array<Record<string, unknown>> };
    const analysisFindings = fixture.findings.map((fixtureFinding) => {
      const item = { ...fixtureFinding };
      delete item.checkedAt;
      return AnalysisFindingSchema.parse(item);
    });
    const findings = resolveFindingSpans(
      original,
      analysisFindings,
      "2026-07-18",
    );

    const segments = toRenderSegments(original, findings);

    expect(segments.map(({ text }) => text).join("")).toBe(original);
    expect(segments.filter(({ kind }) => kind === "finding")).toHaveLength(9);
  });

  it("round-trips exact text and sorts findings without mutating them", () => {
    const original = "  😀 alpha\ne\u0301 beta  ";
    const resolved = resolveFindingSpans(
      original,
      [analysisFinding("alpha", "alpha"), analysisFinding("beta", "beta")],
      "2026-07-18",
    );
    const outOfOrder = [...resolved].reverse();

    const segments = toRenderSegments(original, outOfOrder);

    expect(segments.map(({ text }) => text).join("")).toBe(original);
    expect(
      segments.filter(({ kind }) => kind === "finding").map(({ text }) => text),
    ).toEqual(["alpha", "beta"]);
    expect(outOfOrder.map(({ id }) => id)).toEqual(["beta", "alpha"]);
  });

  it("represents adjacent findings without adding empty unchanged segments", () => {
    const findings = resolveFindingSpans(
      "onetwo",
      [
        { ...analysisFinding("one", "one"), suffixText: "two" },
        { ...analysisFinding("two", "two"), prefixText: "one" },
      ],
      "2026-07-18",
    );
    expect(
      toRenderSegments("onetwo", findings).map(({ kind, text }) => ({
        kind,
        text,
      })),
    ).toEqual([
      { kind: "finding", text: "one" },
      { kind: "finding", text: "two" },
    ]);
  });

  it("returns one unchanged segment when there are no findings", () => {
    expect(toRenderSegments("untouched", [])).toEqual([
      { kind: "unchanged", text: "untouched" },
    ]);
    expect(toRenderSegments("", [])).toEqual([]);
  });

  it.each([
    ["zero-length", { startOffset: 1, endOffset: 1, sourceText: "" }],
    ["out-of-bounds", { startOffset: 4, endOffset: 9, sourceText: "claim" }],
    ["mismatched quote", { startOffset: 0, endOffset: 5, sourceText: "other" }],
  ] as const)("rejects a %s span", (_name, span) => {
    const malformed = {
      ...analysisFinding("bad", span.sourceText || "x"),
      ...span,
      checkedAt: "2026-07-18",
    } as Finding;
    expect(() => toRenderSegments("claim", [malformed])).toThrow(
      /invalid or overlapping span/,
    );
  });

  it("rejects overlapping findings", () => {
    const base = {
      ...analysisFinding("left", "abcd"),
      startOffset: 0,
      endOffset: 4,
      checkedAt: "2026-07-18",
    } as Finding;
    const overlapping = {
      ...analysisFinding("right", "cdef"),
      startOffset: 2,
      endOffset: 6,
      checkedAt: "2026-07-18",
    } as Finding;
    expect(() => toRenderSegments("abcdef", [overlapping, base])).toThrow(
      /overlapping span/,
    );
  });

  it("rejects duplicate finding IDs", () => {
    const findings = resolveFindingSpans(
      "one two",
      [analysisFinding("one", "one"), analysisFinding("two", "two")],
      "2026-07-18",
    );
    const duplicateId = findings.map((finding) => ({
      ...finding,
      id: "duplicate",
    }));

    expect(() => toRenderSegments("one two", duplicateId)).toThrow(
      /Duplicate finding ID/,
    );
  });
});
