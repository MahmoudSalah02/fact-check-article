"use client";

import { useEffect, useRef } from "react";

import { getVerdictLabel } from "@/components/finding-dot";
import type { EditDecision, Finding } from "@/lib/contracts";

type EvidencePanelProps = {
  finding: Finding;
  decision: EditDecision["decision"] | null;
  position: number;
  total: number;
  isSaving: boolean;
  error: string | null;
  onDecision: (decision: EditDecision["decision"]) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function EvidencePanel({
  finding,
  decision,
  position,
  total,
  isSaving,
  error,
  onDecision,
  onPrevious,
  onNext,
  onClose,
}: EvidencePanelProps) {
  const hasEdit = finding.replacement !== null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <aside
      aria-label="Evidence panel"
      className="pulsecheck-panel-enter min-h-0 overflow-y-auto rounded-2xl border border-[#303030] bg-[#212121] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs text-[#8e8ea0]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={total < 2}
            aria-label="Previous finding"
            className="flex h-7 w-7 items-center justify-center rounded-full outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30"
          >
            ←
          </button>
          <span className="min-w-14 text-center">
            {position} of {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={total < 2}
            aria-label="Next finding"
            className="flex h-7 w-7 items-center justify-center rounded-full outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30"
          >
            →
          </button>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close evidence panel"
          className="rounded-md px-2 py-1 text-lg leading-none text-[#9b9b9b] outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          ×
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-[#ececec]">
          {getVerdictLabel(finding.verdict)}
        </span>
        <span aria-hidden="true" className="text-xs text-[#6f6f78]">
          ·
        </span>
        <span className="text-xs text-[#9b9b9b]">
          {finding.confidence} confidence
        </span>
      </div>

      {finding.claimType === "forecast" && finding.forecastStatus ? (
        <p className="mt-2 text-xs text-sky-300">
          Forecast · {formatLabel(finding.forecastStatus)}
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-[#d8d8d8]">
        {finding.explanation}
      </p>

      {finding.replacement ? (
        <div className="mt-5 rounded-xl border border-white/5 bg-[#2f2f2f] p-3">
          <p className="text-xs font-medium text-[#8e8ea0]">
            Proposed correction
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-300">
            {finding.replacement}
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[#8e8ea0]">
          Sources
        </h2>
        {finding.sources.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {finding.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg p-2 text-sm text-[#d8d8d8] outline-none transition-all duration-200 hover:translate-x-0.5 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span className="block leading-5 text-sky-300">
                    {source.title}
                  </span>
                  <span className="mt-1 block text-xs text-[#8e8ea0]">
                    {[source.publisher, source.publishedAt]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#8e8ea0]">
            No supporting source was established.
          </p>
        )}
      </div>

      <p className="mt-5 text-xs text-[#8e8ea0]">Checked {finding.checkedAt}</p>

      <div className="mt-5 border-t border-[#343434] pt-4">
        <p className="mb-5 text-xs text-[#8e8ea0]">
          {hasEdit
            ? "Apply this proposed correction?"
            : "Does this assessment look right?"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving}
            aria-pressed={decision === "accepted"}
            onClick={() => onDecision("accepted")}
            className={`rounded-full px-4 py-2 text-sm font-medium outline-none transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/60 disabled:translate-y-0 disabled:opacity-50 ${
              decision === "accepted"
                ? "bg-emerald-300 text-emerald-950 shadow-[0_8px_24px_rgba(110,231,183,0.18)]"
                : "bg-[#d4d4d4] text-[#171717] hover:bg-[#e0e0e0]"
            }`}
          >
            {isSaving ? "Saving…" : "Accept"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            aria-pressed={decision === "rejected"}
            onClick={() => onDecision("rejected")}
            className={`rounded-full border px-4 py-2 text-sm outline-none transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/60 disabled:translate-y-0 disabled:opacity-50 ${
              decision === "rejected"
                ? "border-red-300/30 bg-red-300/15 text-red-200"
                : "border-[#484848] text-[#ececec] hover:bg-white/5"
            }`}
          >
            Reject
          </button>
        </div>
      </div>

      {decision ? (
        <p
          key={decision}
          role="status"
          className="pulsecheck-decision-enter mt-3 text-xs capitalize text-[#9b9b9b]"
        >
          Decision: {decision}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </aside>
  );
}
