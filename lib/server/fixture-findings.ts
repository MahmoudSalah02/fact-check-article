import {
  FindingSchema,
  type AnalysisFinding,
  type Finding,
} from "@/lib/contracts";

export function prepareFixtureFindings(
  articleText: string,
  checkedAt: string,
  findings: AnalysisFinding[],
): Finding[] {
  return findings.map((finding) => {
    const startOffset = articleText.indexOf(finding.sourceText);
    if (
      startOffset < 0 ||
      articleText.lastIndexOf(finding.sourceText) !== startOffset
    ) {
      throw new Error(
        `Fixture sourceText must resolve exactly once: ${finding.id}`,
      );
    }

    if (
      finding.prefixText !== null &&
      articleText.slice(
        startOffset - finding.prefixText.length,
        startOffset,
      ) !== finding.prefixText
    ) {
      throw new Error(`Fixture prefix does not match: ${finding.id}`);
    }

    const endOffset = startOffset + finding.sourceText.length;
    if (
      finding.suffixText !== null &&
      articleText.slice(endOffset, endOffset + finding.suffixText.length) !==
        finding.suffixText
    ) {
      throw new Error(`Fixture suffix does not match: ${finding.id}`);
    }

    return FindingSchema.parse({
      ...finding,
      startOffset,
      endOffset,
      checkedAt,
    });
  });
}
