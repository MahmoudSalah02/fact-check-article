import {
  EditDecisionSchema,
  FindingSchema,
  type EditDecision,
  type Finding,
} from "@/lib/contracts";

export function deriveUpdatedText(
  originalText: string,
  findings: Finding[],
  decisions: EditDecision[],
): string {
  const validatedFindings = validateFindingSpans(originalText, findings);
  const latestDecisions = new Map<
    string,
    { decision: EditDecision; timestamp: number }
  >();
  for (const untrustedDecision of decisions) {
    const decision = EditDecisionSchema.parse(untrustedDecision);
    const timestamp = Date.parse(decision.decidedAt);
    const current = latestDecisions.get(decision.findingId);
    if (!current || timestamp >= current.timestamp) {
      latestDecisions.set(decision.findingId, { decision, timestamp });
    }
  }

  const accepted = validatedFindings
    .filter(
      (finding) =>
        finding.replacement !== null &&
        latestDecisions.get(finding.id)?.decision.decision === "accepted",
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

function validateFindingSpans(
  originalText: string,
  findings: Finding[],
): Finding[] {
  const validated = findings.map((finding) => FindingSchema.parse(finding));
  validated.sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.id.localeCompare(right.id),
  );

  const ids = new Set<string>();
  let previous: Finding | undefined;
  for (const finding of validated) {
    if (ids.has(finding.id)) {
      throw new Error(`Duplicate finding ID: ${finding.id}`);
    }
    ids.add(finding.id);
    assertFindingCoversOriginal(originalText, finding);
    if (previous && finding.startOffset < previous.endOffset) {
      throw new Error(
        `Finding spans overlap: "${previous.id}" and "${finding.id}"`,
      );
    }
    previous = finding;
  }

  return validated;
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
