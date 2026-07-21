import { useMemo } from "react";

import { FindingDot } from "@/components/finding-dot";
import type { EditDecision, Finding } from "@/lib/contracts";
import { deriveUpdatedText } from "@/lib/domain/derive-updated-text";
import { toRenderSegments } from "@/lib/domain/render-segments";

type ArticleViewProps = {
  originalText: string;
  findings: Finding[];
  decisions: EditDecision[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
};

function latestDecisionByFinding(decisions: EditDecision[]) {
  const latest = new Map<string, EditDecision>();
  for (const decision of decisions) {
    const current = latest.get(decision.findingId);
    if (
      !current ||
      Date.parse(decision.decidedAt) >= Date.parse(current.decidedAt)
    ) {
      latest.set(decision.findingId, decision);
    }
  }
  return latest;
}

export function ArticleView({
  originalText,
  findings,
  decisions,
  selectedFindingId,
  onSelectFinding,
}: ArticleViewProps) {
  const segments = useMemo(
    () => toRenderSegments(originalText, findings),
    [findings, originalText],
  );
  const decisionsByFinding = useMemo(
    () => latestDecisionByFinding(decisions),
    [decisions],
  );
  const updatedText = useMemo(
    () => deriveUpdatedText(originalText, findings, decisions),
    [decisions, findings, originalText],
  );
  return (
    <section aria-label="Checked article" className="min-h-0">
      <div
        data-testid="article-text"
        data-version="current"
        data-updated-text={updatedText}
        className="text-[15px] leading-8 whitespace-pre-wrap text-[#d8d8d8]"
      >
        {segments.map((segment, index) => {
          if (segment.kind === "unchanged") {
            return <span key={`unchanged-${index}`}>{segment.text}</span>;
          }

          const { finding } = segment;
          const decision = decisionsByFinding.get(finding.id)?.decision;
          const accepted =
            decision === "accepted" && finding.replacement !== null;
          const renderedText = accepted ? (
            <>
              <del className="text-red-300 decoration-red-400/80">
                {segment.text}
              </del>
              <ins className="ml-1 text-emerald-300 no-underline">
                {finding.replacement}
              </ins>
            </>
          ) : (
            segment.text
          );

          return (
            <span key={finding.id}>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Inspect evidence: ${finding.sourceText}`}
                onClick={() => onSelectFinding(finding.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectFinding(finding.id);
                  }
                }}
                className={`cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  selectedFindingId === finding.id
                    ? "bg-white/10 ring-1 ring-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                {renderedText}
              </span>
              <FindingDot
                finding={finding}
                selected={selectedFindingId === finding.id}
                onSelect={() => onSelectFinding(finding.id)}
              />
            </span>
          );
        })}
      </div>
    </section>
  );
}
