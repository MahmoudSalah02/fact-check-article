import {
  AnalysisFindingSchema,
  FindingSchema,
  type AnalysisFinding,
  type Finding,
} from "@/lib/contracts";

export function resolveFindingSpans(
  articleText: string,
  findings: AnalysisFinding[],
  checkedAt: string,
): Finding[] {
  const ids = new Set<string>();

  const resolved = findings.map((untrustedFinding, index) => {
    const finding = AnalysisFindingSchema.parse(untrustedFinding);

    if (ids.has(finding.id)) {
      throw new Error(`Duplicate finding ID: ${finding.id}`);
    }
    ids.add(finding.id);

    const candidates = findOccurrences(articleText, finding.sourceText).filter(
      (startOffset) => anchorsMatch(articleText, startOffset, finding),
    );

    if (candidates.length === 0) {
      throw new Error(
        `Finding "${finding.id}" quote was not found with its supplied anchors`,
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `Finding "${finding.id}" quote is ambiguous (${candidates.length} matches)`,
      );
    }

    const startOffset = candidates[0];
    if (startOffset === undefined) {
      throw new Error(`Finding at index ${index} could not be resolved`);
    }

    return FindingSchema.parse({
      ...finding,
      startOffset,
      endOffset: startOffset + finding.sourceText.length,
      checkedAt,
    });
  });

  resolved.sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.id.localeCompare(right.id),
  );

  for (let index = 1; index < resolved.length; index += 1) {
    const previous = resolved[index - 1];
    const current = resolved[index];
    if (previous && current && current.startOffset < previous.endOffset) {
      throw new Error(
        `Finding spans overlap: "${previous.id}" and "${current.id}"`,
      );
    }
  }

  return resolved;
}

function findOccurrences(text: string, quote: string): number[] {
  const occurrences: number[] = [];
  let fromIndex = 0;

  while (fromIndex <= text.length - quote.length) {
    const match = text.indexOf(quote, fromIndex);
    if (match === -1) break;
    occurrences.push(match);
    fromIndex = match + 1;
  }

  return occurrences;
}

function anchorsMatch(
  articleText: string,
  startOffset: number,
  finding: AnalysisFinding,
): boolean {
  const prefixMatches =
    finding.prefixText === null ||
    articleText.slice(0, startOffset).endsWith(finding.prefixText);
  const endOffset = startOffset + finding.sourceText.length;
  const suffixMatches =
    finding.suffixText === null ||
    articleText.slice(endOffset).startsWith(finding.suffixText);

  return prefixMatches && suffixMatches;
}
