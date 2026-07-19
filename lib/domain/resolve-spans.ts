import type { AnalysisFinding, Finding } from "@/lib/contracts";

// TODO(F2): Implement unique quote+anchor resolution, UTF-16 offsets, and overlap rejection.
// Acceptance: ambiguity remains visible as unresolved and never creates an edit.
export function resolveFindingSpans(
  articleText: string,
  findings: AnalysisFinding[],
  checkedAt: string,
): Finding[] {
  void articleText;
  void findings;
  void checkedAt;
  throw new Error("General span resolution is not implemented until F2");
}
