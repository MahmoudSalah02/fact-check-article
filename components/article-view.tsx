import { useMemo, useState } from "react";

import { FindingDot } from "@/components/finding-dot";
import type { EditDecision, Finding } from "@/lib/contracts";
import { deriveUpdatedText } from "@/lib/domain/derive-updated-text";
import { toRenderSegments } from "@/lib/domain/render-segments";

type ArticleViewProps = {
  originalText: string;
  findings: Finding[];
  visibleFindingIds: ReadonlySet<string>;
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
  visibleFindingIds,
  decisions,
  selectedFindingId,
  onSelectFinding,
}: ArticleViewProps) {
  const [requestedView, setRequestedView] = useState<"original" | "updated">(
    "updated",
  );
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
  const acceptedCount = findings.filter(
    (finding) =>
      finding.replacement !== null &&
      decisionsByFinding.get(finding.id)?.decision === "accepted",
  ).length;
  const view = acceptedCount === 0 ? "original" : requestedView;

  return (
    <section aria-label="Checked article" className="min-h-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Article version"
          className="flex rounded-full bg-white/5 p-1 text-xs"
        >
          {(["original", "updated"] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={view === option}
              aria-describedby={
                option === "updated" ? "updated-version-status" : undefined
              }
              disabled={option === "updated" && acceptedCount === 0}
              onClick={() => setRequestedView(option)}
              className={`rounded-full px-3 py-1.5 capitalize outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40 ${
                view === option
                  ? "bg-[#2f2f2f] text-white"
                  : "text-[#8e8ea0] hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="text-right text-xs leading-5 text-[#8e8ea0]">
          <p>
            {visibleFindingIds.size === 0
              ? "No findings in this category"
              : "Select a colored dot to inspect evidence"}
          </p>
          <p id="updated-version-status" aria-live="polite">
            {acceptedCount === 0
              ? "Accept a correction to create the Updated version"
              : `${acceptedCount} accepted ${acceptedCount === 1 ? "edit" : "edits"} in Updated`}
          </p>
        </div>
      </div>

      <div
        data-testid="article-text"
        data-version={view}
        data-updated-text={updatedText}
        className="text-[15px] leading-8 whitespace-pre-wrap text-[#d8d8d8]"
      >
        {segments.map((segment, index) => {
          if (segment.kind === "unchanged") {
            return <span key={`unchanged-${index}`}>{segment.text}</span>;
          }

          const { finding } = segment;
          const visible = visibleFindingIds.has(finding.id);
          const decision = decisionsByFinding.get(finding.id)?.decision;
          const accepted =
            view === "updated" &&
            decision === "accepted" &&
            finding.replacement !== null;
          const passive =
            finding.verdict === "unsupported" ||
            finding.verdict === "unresolved" ||
            finding.verdict === "opinion" ||
            finding.confidence === "low";
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

          if (!visible) {
            return <span key={finding.id}>{renderedText}</span>;
          }

          return (
            <span
              key={finding.id}
              className={passive ? "decoration-dotted underline-offset-4" : ""}
            >
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
