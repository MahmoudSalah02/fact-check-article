import { useLayoutEffect, useMemo, useRef, useState } from "react";

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
  const [view, setView] = useState<"original" | "updated">("updated");
  const articleRef = useRef<HTMLDivElement>(null);
  const findingRefs = useRef(new Map<string, HTMLSpanElement>());
  const [dotPositions, setDotPositions] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      findings.map((finding, index) => [finding.id, index * 20]),
    ),
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

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) {
      return;
    }

    const measure = () => {
      const articleRect = article.getBoundingClientRect();
      const desired = findings
        .map((finding, index) => {
          const element = findingRefs.current.get(finding.id);
          const rects = element ? Array.from(element.getClientRects()) : [];
          const rect = rects.at(-1);

          return {
            id: finding.id,
            index,
            top: rect
              ? rect.top - articleRect.top + rect.height / 2 - 10
              : index * 20,
          };
        })
        .sort(
          (left, right) => left.top - right.top || left.index - right.index,
        );

      const maxTop = Math.max(0, article.scrollHeight - 20);
      const gap =
        desired.length > 1 ? Math.min(20, maxTop / (desired.length - 1)) : 0;
      let previous = -gap;
      const resolved = desired.map((item) => {
        const top = Math.max(0, Math.min(item.top, maxTop));
        const collisionFreeTop = Math.max(top, previous + gap);
        previous = collisionFreeTop;
        return { id: item.id, top: collisionFreeTop };
      });
      const overflow = Math.max(0, (resolved.at(-1)?.top ?? 0) - maxTop);

      setDotPositions(
        Object.fromEntries(
          resolved.map((item) => [item.id, Math.max(0, item.top - overflow)]),
        ),
      );
    };

    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(article);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [findings, updatedText, view]);

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
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1.5 capitalize outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                view === option
                  ? "bg-[#2f2f2f] text-white"
                  : "text-[#8e8ea0] hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#8e8ea0]">
          Select a dot to inspect evidence
        </p>
      </div>

      <div
        ref={articleRef}
        data-testid="article-text"
        data-version={view}
        data-updated-text={updatedText}
        className="relative pr-8 text-[15px] leading-8 whitespace-pre-wrap text-[#d8d8d8]"
      >
        {segments.map((segment, index) => {
          if (segment.kind === "unchanged") {
            return <span key={`unchanged-${index}`}>{segment.text}</span>;
          }

          const { finding } = segment;
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

          return (
            <span
              key={finding.id}
              className={passive ? "decoration-dotted underline-offset-4" : ""}
            >
              <span
                ref={(element) => {
                  if (element) {
                    findingRefs.current.set(finding.id, element);
                  } else {
                    findingRefs.current.delete(finding.id);
                  }
                }}
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
                {accepted ? (
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
                )}
              </span>
              <FindingDot
                finding={finding}
                selected={selectedFindingId === finding.id}
                top={dotPositions[finding.id] ?? 0}
                onSelect={() => onSelectFinding(finding.id)}
              />
            </span>
          );
        })}
      </div>
    </section>
  );
}
