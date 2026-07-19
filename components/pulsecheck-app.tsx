"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArticleComposer,
  MAX_ARTICLE_LENGTH,
} from "@/components/article-composer";
import { FindingsPreview } from "@/components/findings-preview";
import { ProductShell } from "@/components/product-shell";
import { createFixtureRunClient } from "@/lib/client/create-fixture-run-client";
import { HttpRunClient, RunClientError } from "@/lib/client/http-run-client";
import type { RunClient, RunView } from "@/lib/contracts";
import { getAnonymousAccessToken } from "@/lib/supabase/browser";

type PulseCheckAppProps = {
  demoArticle: string;
  demoExpected: unknown;
  backend?: "fake" | "supabase";
  runClient?: RunClient;
};

type AppStatus = "empty" | "ready" | "checking" | "completed" | "error";

const FILTER_CHIPS = ["All", "Facts", "Forecasts", "Opinions"] as const;

function getErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("prepared demo article")
  ) {
    return "This prototype can only check the prepared demo article. Load the demo article to continue.";
  }

  return "We couldn't check the article. Please try again.";
}

function getRestoreErrorMessage(error: unknown) {
  if (error instanceof RunClientError && error.status === 404) {
    return "We couldn't find that saved analysis.";
  }

  return "We couldn't load that saved analysis.";
}

function readRunParam() {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("run");
}

function writeRunParam(runId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (runId) {
    url.searchParams.set("run", runId);
  } else {
    url.searchParams.delete("run");
  }
  window.history.replaceState(null, "", url);
}

function SuggestionIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

const SUGGESTION_ICONS = {
  bolt: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  news: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z",
  history: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
} as const;

export function PulseCheckApp({
  demoArticle,
  demoExpected,
  backend = "fake",
  runClient: providedRunClient,
}: PulseCheckAppProps) {
  const [article, setArticle] = useState("");
  const [runView, setRunView] = useState<RunView | null>(null);
  const [status, setStatus] = useState<AppStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const [durableClient, setDurableClient] = useState<RunClient | null>(null);

  const fixtureRunClient = useMemo(
    () => createFixtureRunClient(demoArticle, demoExpected),
    [demoArticle, demoExpected],
  );

  const usesDurableBackend = backend === "supabase" && !providedRunClient;
  const runClient =
    providedRunClient ??
    (usesDurableBackend ? durableClient : fixtureRunClient);

  // In supabase mode, start an anonymous session and restore any run named in
  // the URL so a completed analysis survives a refresh. Tests inject their own
  // client, so this effect never runs under jsdom.
  useEffect(() => {
    if (!usesDurableBackend) return;
    let cancelled = false;

    async function initialize() {
      try {
        await getAnonymousAccessToken();
        const client = new HttpRunClient(getAnonymousAccessToken);
        if (cancelled) return;
        setDurableClient(client);

        const runId = readRunParam();
        if (!runId) return;
        setStatus("checking");
        const restored = await client.getRun(runId);
        if (cancelled) return;
        setArticle(restored.document.originalText);
        setRunView(restored);
        setStatus("completed");
      } catch (caught) {
        if (cancelled) return;
        setError(getRestoreErrorMessage(caught));
        setStatus("error");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [usesDurableBackend]);

  function handleArticleChange(nextArticle: string) {
    setArticle(nextArticle);
    setRunView(null);
    setError(null);
    setStatus(nextArticle.length === 0 ? "empty" : "ready");
  }

  function handleLoadDemo() {
    setArticle(demoArticle);
    setRunView(null);
    setError(null);
    setStatus("ready");
  }

  function handleReset() {
    setArticle("");
    setRunView(null);
    setError(null);
    setStatus("empty");
    if (usesDurableBackend) writeRunParam(null);
  }

  async function handleCheckArticle() {
    if (article.length === 0 || article.length > MAX_ARTICLE_LENGTH) {
      return;
    }

    if (!runClient) {
      setError("Preparing your secure session. Try again in a moment.");
      setStatus("error");
      return;
    }

    setStatus("checking");
    setError(null);
    setRunView(null);

    try {
      const created = await runClient.createRun({ text: article, title: null });
      if (usesDurableBackend) writeRunParam(created.runId);
      const completedRun = await runClient.getRun(created.runId);
      setRunView(completedRun);
      setStatus("completed");
    } catch (caught) {
      setError(getErrorMessage(caught));
      setStatus("error");
    }
  }

  const findings = runView?.findings ?? [];
  const isCompleted = status === "completed" && runView !== null;

  return (
    <ProductShell>
      {isCompleted ? (
        <main className="flex min-h-0 flex-1 flex-col px-5 pt-8 pb-2 sm:px-8">
          <div className="rise-in mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#f3f3f3]">
                  PulseCheck
                </h1>
                <p role="status" className="mt-0.5 text-sm text-[#8e8ea0]">
                  {findings.length}{" "}
                  {findings.length === 1 ? "finding" : "findings"} ready to
                  review.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0d0d0d] outline-none transition hover:bg-[#ececec] focus-visible:ring-2 focus-visible:ring-white/60"
              >
                New check
              </button>
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              {FILTER_CHIPS.map((chip, index) => (
                <span
                  key={chip}
                  className={`cursor-default rounded-full px-3.5 py-1.5 text-sm transition ${
                    index === 0
                      ? "bg-[#2f2f2f] font-medium text-[#f3f3f3]"
                      : "text-[#9b9b9b] hover:bg-white/5"
                  }`}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-5 max-h-[26vh] shrink-0 overflow-y-auto border-b border-white/10 pb-5 pr-1 text-[15px] leading-7 whitespace-pre-wrap text-[#c6c6c6]">
              {runView.document.originalText}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <FindingsPreview findings={findings} />
            </div>
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5">
          <div className="w-full max-w-[720px] pb-16">
            <h1 className="text-center text-[28px] font-medium tracking-tight text-[#f3f3f3] sm:text-[32px]">
              What still holds up today?
            </h1>

            <div className="mt-8">
              <ArticleComposer
                article={article}
                isChecking={status === "checking"}
                onArticleChange={handleArticleChange}
                onLoadDemo={handleLoadDemo}
                onCheckArticle={handleCheckArticle}
              />
            </div>

            <p className="mt-3 text-center text-xs leading-5 text-[#8e8ea0]">
              Your article is sent to OpenAI for research. Do not paste secrets
              or information you are not authorized to process.
            </p>

            {status === "checking" ? (
              <p
                role="status"
                aria-live="polite"
                className="shimmer-text mt-8 text-center text-[15px]"
              >
                Researching and validating claims…
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="mt-8 text-center text-sm text-red-400">
                {error}
              </p>
            ) : null}

            {article.length === 0 && status !== "checking" && !error ? (
              <div className="mx-auto mt-10 flex max-w-[420px] flex-col">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-[#e3e3e3] outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span className="text-[#b4b4b4]">
                    <SuggestionIcon path={SUGGESTION_ICONS.bolt} />
                  </span>
                  Load the demo article
                </button>
                <span className="flex cursor-default items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-[#e3e3e3]">
                  <span className="text-[#b4b4b4]">
                    <SuggestionIcon path={SUGGESTION_ICONS.news} />
                  </span>
                  Verify facts in a news story
                </span>
                <span className="flex cursor-default items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-[#e3e3e3]">
                  <span className="text-[#b4b4b4]">
                    <SuggestionIcon path={SUGGESTION_ICONS.history} />
                  </span>
                  Re-check an aging blog post
                </span>
              </div>
            ) : null}
          </div>
        </main>
      )}
    </ProductShell>
  );
}
