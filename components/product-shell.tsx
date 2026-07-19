import Link from "next/link";
import type { ReactNode } from "react";

type ProductShellProps = {
  children: ReactNode;
};

export function ProductShell({ children }: ProductShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-900">
      <header className="border-b border-zinc-200 bg-[#f7f7f5]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 px-5 sm:min-h-16 sm:flex-nowrap sm:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <span className="shrink-0 text-sm font-semibold tracking-tight text-zinc-950">
              OpenAI
            </span>
            <nav
              aria-label="Product navigation"
              className="flex items-center gap-0.5 sm:gap-1"
            >
              <span className="rounded-md px-1.5 py-1.5 text-xs text-zinc-500 sm:px-2.5 sm:text-sm">
                ChatGPT
              </span>
              <span className="rounded-md px-1.5 py-1.5 text-xs text-zinc-500 sm:px-2.5 sm:text-sm">
                Codex
              </span>
              <Link
                href="/"
                aria-current="page"
                className="flex min-h-11 items-center rounded-md bg-white px-1.5 py-1.5 text-xs font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 sm:px-2.5 sm:text-sm"
              >
                PulseCheck
              </Link>
            </nav>
          </div>
          <p className="order-3 mt-2 w-full border-t border-zinc-200 py-2 text-xs leading-5 text-zinc-500 sm:order-none sm:ml-auto sm:mt-0 sm:w-auto sm:border-0 sm:py-0 sm:text-right">
            Concept prototype; not an official OpenAI product.
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
