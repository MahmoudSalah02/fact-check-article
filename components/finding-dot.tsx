import type { Finding, Verdict } from "@/lib/contracts";

const VERDICT_META: Record<
  Verdict,
  { label: string; dotClass: string; textClass: string }
> = {
  verified: {
    label: "Verified",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
  },
  outdated: {
    label: "Outdated",
    dotClass: "bg-sky-400",
    textClass: "text-sky-300",
  },
  contradicted: {
    label: "Contradicted",
    dotClass: "bg-red-400",
    textClass: "text-red-300",
  },
  unsupported: {
    label: "Unsupported",
    dotClass: "bg-amber-300",
    textClass: "text-amber-200",
  },
  needs_context: {
    label: "Needs context",
    dotClass: "bg-amber-300",
    textClass: "text-amber-200",
  },
  unresolved: {
    label: "Unresolved",
    dotClass: "bg-amber-300",
    textClass: "text-amber-200",
  },
  opinion: {
    label: "Opinion",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-300",
  },
};

export function getVerdictLabel(verdict: Verdict) {
  return VERDICT_META[verdict].label;
}

export function getVerdictTextClass(verdict: Verdict) {
  return VERDICT_META[verdict].textClass;
}

type FindingDotProps = {
  finding: Finding;
  selected: boolean;
  onSelect: () => void;
};

export function FindingDot({ finding, selected, onSelect }: FindingDotProps) {
  const verdict = VERDICT_META[finding.verdict];
  const label = `${verdict.label}: ${finding.sourceText}`;

  return (
    <button
      id={`finding-dot-${finding.id}`}
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`group relative ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full align-middle outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 ${
        selected ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${verdict.dotClass}`}
      />
      <span className="pointer-events-none absolute right-0 bottom-full z-20 mb-1 hidden w-max max-w-64 rounded-md border border-white/10 bg-[#2f2f2f] px-2 py-1 text-left text-xs text-[#ececec] shadow-xl group-hover:block group-focus-visible:block">
        {verdict.label}
      </span>
    </button>
  );
}
