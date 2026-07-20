import { describe, expect, it } from "vitest";

import type { AnalysisFinding, EditDecision } from "@/lib/contracts";
import { deriveUpdatedText } from "@/lib/domain/derive-updated-text";
import { resolveFindingSpans } from "@/lib/domain/resolve-spans";

const editable = (
  id: string,
  sourceText: string,
  replacement: string,
): AnalysisFinding => ({
  id,
  sourceText,
  prefixText: null,
  suffixText: null,
  claimType: "fact",
  verdict: "contradicted",
  forecastStatus: null,
  confidence: "high",
  explanation: "A supported correction exists.",
  replacement,
  sources: [
    {
      url: "https://example.com/source",
      title: "Source",
      publisher: "Example",
      publishedAt: null,
    },
  ],
});

const decision = (
  findingId: string,
  value: EditDecision["decision"],
  decidedAt: string,
): EditDecision => ({ findingId, decision: value, decidedAt });

describe("deriveUpdatedText", () => {
  it("applies accepted edits right-to-left without mutating inputs", () => {
    const original = "alpha middle omega";
    const findings = resolveFindingSpans(
      original,
      [editable("alpha", "alpha", "A"), editable("omega", "omega", "the end")],
      "2026-07-18",
    );
    const findingsSnapshot = structuredClone(findings);
    const decisions = [
      decision("alpha", "accepted", "2026-07-18T10:00:00.000Z"),
      decision("omega", "accepted", "2026-07-18T10:00:01.000Z"),
    ];
    const decisionsSnapshot = structuredClone(decisions);

    expect(deriveUpdatedText(original, findings, decisions)).toBe(
      "A middle the end",
    );
    expect(findings).toEqual(findingsSnapshot);
    expect(decisions).toEqual(decisionsSnapshot);
  });

  it("uses the chronologically latest decision regardless of array order", () => {
    const findings = resolveFindingSpans(
      "old",
      [editable("edit", "old", "new")],
      "2026-07-18",
    );
    expect(
      deriveUpdatedText("old", findings, [
        decision("edit", "restored", "2026-07-18T11:00:00.000Z"),
        decision("edit", "accepted", "2026-07-18T10:00:00.000Z"),
      ]),
    ).toBe("old");
  });

  it.each(["rejected", "restored"] as const)(
    "%s recreates the exact original including whitespace and Unicode",
    (value) => {
      const original = "  e\u0301 😀 old\n";
      const findings = resolveFindingSpans(
        original,
        [editable("edit", "old", "new")],
        "2026-07-18",
      );
      expect(
        deriveUpdatedText(original, findings, [
          decision("edit", "accepted", "2026-07-18T10:00:00.000Z"),
          decision("edit", value, "2026-07-18T11:00:00.000Z"),
        ]),
      ).toBe(original);
    },
  );

  it("leaves undecided and null-replacement findings unchanged", () => {
    const [finding] = resolveFindingSpans(
      "verified",
      [
        {
          ...editable("verified", "verified", "ignored"),
          verdict: "verified",
          replacement: null,
          sources: [],
        },
      ],
      "2026-07-18",
    );
    expect(
      deriveUpdatedText("verified", finding ? [finding] : [], [
        decision("verified", "accepted", "2026-07-18T10:00:00.000Z"),
      ]),
    ).toBe("verified");
  });

  it("rejects accepted out-of-bounds and mismatched spans", () => {
    const [valid] = resolveFindingSpans(
      "old",
      [editable("edit", "old", "new")],
      "2026-07-18",
    );
    if (!valid) throw new Error("test setup failed");
    const accepted = [decision("edit", "accepted", "2026-07-18T10:00:00.000Z")];

    expect(() =>
      deriveUpdatedText(
        "old",
        [{ ...valid, startOffset: 4, endOffset: 7 }],
        accepted,
      ),
    ).toThrow(/invalid span/);
    expect(() => deriveUpdatedText("changed", [valid], accepted)).toThrow(
      /invalid span/,
    );
  });
});
