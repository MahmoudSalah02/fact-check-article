import type { EditDecision, Finding } from "@/lib/contracts";

// TODO(F2): Derive updated text from immutable original text and accepted decisions.
// Acceptance: rejecting/restoring every finding reproduces the exact original string.
export function deriveUpdatedText(
  originalText: string,
  findings: Finding[],
  decisions: EditDecision[],
): string {
  void originalText;
  void findings;
  void decisions;
  throw new Error("Updated-text derivation is not implemented until F2");
}
