import Link from "next/link";
import type { ReactNode } from "react";

type ProductShellProps = {
  children: ReactNode;
};

type IconProps = {
  path: string;
};

function Icon({ path }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

const PRODUCT_NAV = [
  {
    label: "ChatGPT",
    path: "M8.5 8.5h7v7h-7zM12 3.5a4.5 4.5 0 0 1 4.34 3.3 4.5 4.5 0 0 1 2.86 7.54 4.5 4.5 0 0 1-6.06 5.9 4.5 4.5 0 0 1-7.48-3.04A4.5 4.5 0 0 1 5.3 9.66 4.5 4.5 0 0 1 12 3.5Z",
  },
  {
    label: "Codex",
    path: "m8.25 8.25-3.75 3.75 3.75 3.75m7.5-7.5 3.75 3.75-3.75 3.75M14 4.5l-4 15",
  },
] as const;

const PULSECHECK_ICON =
  "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z";

export function ProductShell({ children }: ProductShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0d0d0d] text-[#ececec] md:flex-row">
      <aside
        aria-label="Product sidebar"
        className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111111] px-3 py-2.5 md:w-[232px] md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:px-3 md:py-4"
      >
        <p className="px-2 text-xs font-medium tracking-wide text-[#8e8ea0] uppercase md:mb-3">
          Product concepts
        </p>

        <nav
          aria-label="Product navigation"
          className="flex items-center gap-1 md:flex-col md:items-stretch"
        >
          {PRODUCT_NAV.map((item) => (
            <span
              key={item.label}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#9b9b9b]"
            >
              <Icon path={item.path} />
              <span>{item.label}</span>
            </span>
          ))}

          <Link
            href="/"
            aria-current="page"
            className="flex items-center gap-2.5 rounded-lg bg-[#2a2a2a] px-2.5 py-2 text-sm font-medium text-[#f3f3f3] outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Icon path={PULSECHECK_ICON} />
            PulseCheck
          </Link>
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}

        <p className="px-4 pt-3 pb-4 text-center text-xs text-[#8e8ea0]">
          Concept prototype; not an official OpenAI product.
        </p>
      </div>
    </div>
  );
}
