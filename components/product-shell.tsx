import Link from "next/link";
import type { ReactNode } from "react";

type ProductShellProps = {
  children: ReactNode;
};

type IconProps = {
  path: string;
  strokeWidth?: number;
};

function Icon({ path, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

const ICON_PATHS = {
  newChat:
    "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
  pulseCheck: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  library:
    "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  projects:
    "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
  scheduled: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  plugins:
    "M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364",
  more: "M6 12h.01M12 12h.01M18 12h.01",
} as const;

const SECONDARY_NAV = [
  { label: "Library", icon: ICON_PATHS.library },
  { label: "Projects", icon: ICON_PATHS.projects },
  { label: "Scheduled", icon: ICON_PATHS.scheduled },
  { label: "Plugins", icon: ICON_PATHS.plugins },
] as const;

const RECENTS = [
  "Draft launch announcement",
  "Summarize sprint retro notes",
  "Compare vector databases",
  "Refactor auth middleware plan",
  "Plan team offsite agenda",
  "Debug flaky end-to-end run",
  "Write Q3 release notes",
  "Brainstorm onboarding ideas",
  "Explain RLS to a new hire",
  "Trip packing checklist",
] as const;

export function ProductShell({ children }: ProductShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#0d0d0d] text-[#ececec]">
      <aside
        aria-label="Product sidebar"
        className="hidden w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#0d0d0d] md:flex"
      >
        <div className="px-4 pt-4 pb-2">
          <span className="text-lg font-semibold tracking-tight text-[#ececec]">
            ChatGPT
          </span>
        </div>

        <nav
          aria-label="Product navigation"
          className="flex-1 overflow-y-auto px-2 pb-4"
        >
          <span className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#ececec] transition hover:bg-white/5">
            <span className="text-[#b4b4b4]">
              <Icon path={ICON_PATHS.newChat} />
            </span>
            New chat
          </span>

          <Link
            href="/"
            aria-current="page"
            className="flex items-center gap-2.5 rounded-lg bg-[#212121] px-2.5 py-2 text-sm font-medium text-[#f3f3f3] outline-none transition hover:bg-[#2a2a2a] focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="text-[#ececec]">
              <Icon path={ICON_PATHS.pulseCheck} />
            </span>
            PulseCheck
          </Link>

          {SECONDARY_NAV.map((item) => (
            <span
              key={item.label}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#ececec] transition hover:bg-white/5"
            >
              <span className="text-[#b4b4b4]">
                <Icon path={item.icon} />
              </span>
              {item.label}
            </span>
          ))}

          <span className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#ececec] transition hover:bg-white/5">
            <span className="text-[#b4b4b4]">
              <Icon path={ICON_PATHS.more} strokeWidth={2.5} />
            </span>
            More
          </span>

          <p className="px-2.5 pt-6 pb-1 text-xs font-medium text-[#8e8ea0]">
            Recents
          </p>
          <ul>
            {RECENTS.map((item) => (
              <li key={item}>
                <span className="block cursor-default truncate rounded-lg px-2.5 py-1.5 text-sm text-[#d1d1d1] transition hover:bg-white/5">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 border-t border-white/5 px-4 py-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 text-xs font-semibold text-white"
          >
            MS
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-[#ececec]">
              Mahmoud Salah
            </span>
            <span className="block text-xs text-[#8e8ea0]">Plus</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex justify-center px-4 pt-4">
          <span className="flex items-center rounded-full bg-white/5 p-1 text-sm">
            <span className="cursor-default rounded-full bg-[#2f2f2f] px-4 py-1.5 font-medium text-[#f3f3f3]">
              Chat
            </span>
            <span className="cursor-default rounded-full px-4 py-1.5 text-[#9b9b9b]">
              Work
            </span>
          </span>
        </header>

        {children}

        <p className="mt-auto px-4 pb-4 text-center text-xs text-[#8e8ea0]">
          Concept prototype; not an official OpenAI product.
        </p>
      </div>
    </div>
  );
}
