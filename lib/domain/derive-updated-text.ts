import type { EditDecision, Finding } from "@/lib/contracts";

export function deriveUpdatedText(
  originalText: string,
  findings: Finding[],
  decisions: EditDecision[],
): string {
  const latestDecisions = new Map<string, EditDecision>();
  for (const decision of decisions) {
    const current = latestDecisions.get(decision.findingId);
    if (!current || decision.decidedAt > current.decidedAt) {
      latestDecisions.set(decision.findingId, decision);
    }
  }

  const accepted = findings
    .filter(
      (finding) =>
        finding.replacement !== null &&
        latestDecisions.get(finding.id)?.decision === "accepted",
    )
    .sort((left, right) => right.startOffset - left.startOffset);

  let updatedText = originalText;
  for (const finding of accepted) {
    assertFindingCoversOriginal(originalText, finding);
    updatedText =
      updatedText.slice(0, finding.startOffset) +
      finding.replacement +
      updatedText.slice(finding.endOffset);
  }

  return updatedText;
}

function assertFindingCoversOriginal(
  originalText: string,
  finding: Finding,
): void {
  if (
    finding.startOffset < 0 ||
    finding.endOffset <= finding.startOffset ||
    finding.endOffset > originalText.length ||
    finding.endOffset !== finding.startOffset + finding.sourceText.length ||
    originalText.slice(finding.startOffset, finding.endOffset) !==
      finding.sourceText
  ) {
    throw new Error(`Finding "${finding.id}" has an invalid span`);
  }
}
