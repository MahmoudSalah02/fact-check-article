"use client";

import { useState } from "react";

import type { Finding, Verdict } from "@/lib/contracts";

const VERDICT_META: Record<Verdict, { label: string; glyph: string }> = {
  verified: {
    label: "Verified",
    glyph: "✓",
  },
  outdated: {
    label: "Outdated",
    glyph: "↻",
  },
  contradicted: {
    label: "Contradicted",
    glyph: "×",
  },
  unsupported: {
    label: "Unsupported",
    glyph: "?",
  },
  needs_context: {
    label: "Needs context",
    glyph: "+",
  },
  unresolved: {
    label: "Unresolved",
    glyph: "?",
  },
  opinion: {
    label: "Opinion",
    glyph: "≈",
  },
};

export function getVerdictLabel(verdict: Verdict) {
  return VERDICT_META[verdict].label;
}

type FindingDotProps = {
  finding: Finding;
  selected: boolean;
  onSelect: () => void;
};

export function FindingDot({ finding, selected, onSelect }: FindingDotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const verdict = VERDICT_META[finding.verdict];
  const label = `${verdict.label}: ${finding.sourceText}`;

  return (
    <button
      id={`finding-dot-${finding.id}`}
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      className={`relative ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 align-middle text-[10px] leading-none font-medium outline-none transition-all duration-200 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/70 ${
        selected
          ? "border-white bg-white text-[#171717]"
          : "border-white/10 bg-white/[0.04] text-[#b4b4b4] hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <span aria-hidden="true">{verdict.glyph}</span>
      {showTooltip ? (
        <span
          role="tooltip"
          className="pulsecheck-tooltip-enter pointer-events-none absolute right-0 bottom-full z-20 mb-1 w-max max-w-64 rounded-md border border-[#444] bg-[#2f2f2f] px-2 py-1 text-left text-xs text-[#ececec] shadow-xl"
        >
          {verdict.label}
        </span>
      ) : null}
    </button>
  );
}
