import type { Finding } from "@/lib/contracts";

export type RenderSegment =
  | { kind: "unchanged"; text: string }
  | { kind: "finding"; text: string; finding: Finding };

export function toRenderSegments(
  originalText: string,
  findings: Finding[],
): RenderSegment[] {
  const sortedFindings = [...findings].sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.id.localeCompare(right.id),
  );
  const segments: RenderSegment[] = [];
  let cursor = 0;

  for (const finding of sortedFindings) {
    if (
      finding.startOffset < cursor ||
      finding.endOffset <= finding.startOffset ||
      finding.endOffset > originalText.length ||
      finding.endOffset !== finding.startOffset + finding.sourceText.length ||
      originalText.slice(finding.startOffset, finding.endOffset) !==
        finding.sourceText
    ) {
      throw new Error(
        `Finding "${finding.id}" has an invalid or overlapping span`,
      );
    }

    if (finding.startOffset > cursor) {
      segments.push({
        kind: "unchanged",
        text: originalText.slice(cursor, finding.startOffset),
      });
    }
    segments.push({ kind: "finding", text: finding.sourceText, finding });
    cursor = finding.endOffset;
  }

  if (cursor < originalText.length) {
    segments.push({ kind: "unchanged", text: originalText.slice(cursor) });
  }

  return segments;
}
