"use client";

import { useEffect, useRef } from "react";

import { getVerdictLabel, getVerdictTextClass } from "@/components/finding-dot";
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
      className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#212121] p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#8e8ea0]">
          Finding {position} of {total}
        </p>
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`text-sm font-semibold ${getVerdictTextClass(finding.verdict)}`}
        >
          {getVerdictLabel(finding.verdict)}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize text-[#b4b4b4]">
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
                  className="block rounded-lg p-2 text-sm text-[#d8d8d8] outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60"
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

      {hasEdit ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onDecision("accepted")}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0d0d0d] outline-none hover:bg-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onDecision("rejected")}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#ececec] outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
          >
            Reject
          </button>
          {decision ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDecision("restored")}
              className="rounded-full px-3 py-2 text-sm text-[#9b9b9b] outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
            >
              Restore
            </button>
          ) : null}
        </div>
      ) : null}

      {decision ? (
        <p role="status" className="mt-3 text-xs capitalize text-[#9b9b9b]">
          Decision: {decision}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={total < 2}
          className="rounded-lg px-3 py-2 text-sm text-[#b4b4b4] outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={total < 2}
          className="rounded-lg px-3 py-2 text-sm text-[#b4b4b4] outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </aside>
  );
}
