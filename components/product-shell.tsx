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
  codex:
    "m8.25 8.25-3.75 3.75 3.75 3.75m7.5-7.5 3.75 3.75-3.75 3.75M14 4.5l-4 15",
  library:
    "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  projects:
    "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
  scheduled: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  plugins:
    "M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  history:
    "M3.75 12a8.25 8.25 0 1 0 2.416-5.834L3.75 8.582M3.75 3.75v4.832h4.832M12 7.5V12l3 1.5",
} as const;

const SECONDARY_NAV = [
  { label: "Codex", icon: ICON_PATHS.codex },
  { label: "Library", icon: ICON_PATHS.library },
  { label: "Projects", icon: ICON_PATHS.projects },
  { label: "Scheduled", icon: ICON_PATHS.scheduled },
  { label: "Plugins", icon: ICON_PATHS.plugins },
] as const;

export function ProductShell({ children }: ProductShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#0d0d0d] text-[#ececec]">
      <aside
        aria-label="Product sidebar"
        className="pulsecheck-sidebar-divider hidden w-[260px] shrink-0 flex-col bg-[#0d0d0d] md:flex"
      >
        <div className="px-4 pt-4 pb-3">
          <span className="text-lg font-semibold tracking-tight text-[#ececec]">
            ChatGPT
          </span>
        </div>

        <nav
          aria-label="Product navigation"
          className="flex-1 overflow-y-auto px-2 pb-4"
        >
          <span className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#ececec] transition-colors duration-200 hover:bg-white/[0.06]">
            <span className="text-[#b4b4b4]">
              <Icon path={ICON_PATHS.newChat} />
            </span>
            New chat
          </span>

          <Link
            href="/"
            aria-current="page"
            className="flex items-center gap-2.5 rounded-lg bg-[#212121] px-2.5 py-2 text-sm font-medium text-[#f3f3f3] shadow-[0_8px_24px_rgba(0,0,0,0.16)] outline-none transition-all duration-200 hover:bg-[#292929] focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="text-[#ececec]">
              <Icon path={ICON_PATHS.pulseCheck} />
            </span>
            PulseCheck
          </Link>

          {SECONDARY_NAV.map((item) => (
            <span
              key={item.label}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#d4d4d4] transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              <span className="text-[#b4b4b4]">
                <Icon path={item.icon} />
              </span>
              {item.label}
            </span>
          ))}

          <span className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#d4d4d4] transition-colors duration-200 hover:bg-white/[0.06] hover:text-white">
            <span className="text-[#b4b4b4]">
              <Icon path={ICON_PATHS.more} strokeWidth={2.5} />
            </span>
            More
          </span>

          <p className="px-2.5 pt-6 pb-2 text-xs font-medium text-[#8e8ea0]">
            Recents
          </p>
          <div className="mx-1 rounded-xl bg-white/[0.025] px-3 py-3.5">
            <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-[#9b9b9b]">
              <Icon path={ICON_PATHS.history} />
            </span>
            <p className="text-sm font-medium text-[#d7d7d7]">
              No recent checks yet
            </p>
            <p className="mt-1 text-xs leading-5 text-[#777780]">
              Completed analyses will appear here.
            </p>
          </div>
        </nav>

        <div
          role="group"
          aria-label="PulseCheck workspace"
          className="pulsecheck-footer-divider flex items-center gap-2.5 px-4 py-3.5"
        >
          <span
            aria-hidden="true"
            className="pulsecheck-workspace-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_0_24px_rgba(255,255,255,0.08)]"
          >
            <Icon path={ICON_PATHS.pulseCheck} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-[#ececec]">
              PulseCheck
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#8e8ea0]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
              />
              Evidence workspace
            </span>
          </span>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.065),transparent_38%)]">
        {children}

        <p className="mt-auto px-4 pb-4 text-center text-xs text-[#8e8ea0]">
          Concept prototype; not an official OpenAI product.
        </p>
      </div>
    </div>
  );
}
