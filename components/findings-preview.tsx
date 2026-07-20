import type { Finding, Verdict } from "@/lib/contracts";

const VERDICT_META: Record<Verdict, { label: string; dot: string }> = {
  verified: { label: "Verified", dot: "bg-emerald-400" },
  outdated: { label: "Outdated", dot: "bg-amber-300" },
  contradicted: { label: "Contradicted", dot: "bg-red-400" },
  unsupported: { label: "Unsupported", dot: "bg-orange-300" },
  needs_context: { label: "Needs context", dot: "bg-sky-300" },
  unresolved: { label: "Unresolved", dot: "bg-zinc-400" },
  opinion: { label: "Opinion", dot: "bg-violet-300" },
};

type FindingsPreviewProps = {
  findings: Finding[];
};

export function FindingsPreview({ findings }: FindingsPreviewProps) {
  return (
    <ul aria-label="Findings">
      {findings.map((finding) => {
        const verdict = VERDICT_META[finding.verdict];
        return (
          <li
            key={finding.id}
            className="flex gap-3.5 border-b border-white/5 py-4 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={`mt-[9px] h-2 w-2 shrink-0 rounded-full ${verdict.dot}`}
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] leading-6 text-[#ececec]">
                “{finding.sourceText}”
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#9b9b9b]">
                {finding.explanation}
              </p>
            </div>
            <span className="mt-0.5 shrink-0 self-start rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#b4b4b4]">
              {verdict.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
