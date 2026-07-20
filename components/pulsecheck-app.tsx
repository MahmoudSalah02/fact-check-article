"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArticleComposer,
  MAX_ARTICLE_LENGTH,
} from "@/components/article-composer";
import { FindingsPreview } from "@/components/findings-preview";
import { ProductShell } from "@/components/product-shell";
import { createFixtureRunClient } from "@/lib/client/create-fixture-run-client";
import type { RunClient, RunView } from "@/lib/contracts";

type PulseCheckAppProps = {
  demoArticle: string;
  demoExpected: unknown;
  runClient?: RunClient | null;
  restoreRunId?: string | null;
  onRunIdChange?: (runId: string | null) => void;
  startupError?: string | null;
};

type AppStatus = "empty" | "ready" | "checking" | "completed" | "error";

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
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  ) {
    return "We couldn't find that saved analysis.";
  }

  return "We couldn't load that saved analysis.";
}

export function PulseCheckApp({
  demoArticle,
  demoExpected,
  runClient: providedRunClient,
  restoreRunId = null,
  onRunIdChange,
  startupError = null,
}: PulseCheckAppProps) {
  const [article, setArticle] = useState("");
  const [runView, setRunView] = useState<RunView | null>(null);
  const [status, setStatus] = useState<AppStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const fixtureRunClient = useMemo(
    () => createFixtureRunClient(demoArticle, demoExpected),
    [demoArticle, demoExpected],
  );

  const runClient =
    providedRunClient === undefined ? fixtureRunClient : providedRunClient;

  useEffect(() => {
    if (!runClient || !restoreRunId) return;
    let cancelled = false;

    async function restoreRun() {
      try {
        setStatus("checking");
        const restored = await runClient!.getRun(restoreRunId!);
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

    void restoreRun();
    return () => {
      cancelled = true;
    };
  }, [restoreRunId, runClient]);

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
    onRunIdChange?.(null);
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
      onRunIdChange?.(created.runId);
      const completedRun = await runClient.getRun(created.runId);
      setRunView(completedRun);
      setStatus("completed");
    } catch (caught) {
      setError(getErrorMessage(caught));
      setStatus("error");
    }
  }

  const findings = runView?.findings ?? [];
  const currentStatus = startupError ? "error" : status;
  const currentError = startupError ?? error;
  const isCompleted = currentStatus === "completed" && runView !== null;

  return (
    <ProductShell>
      {isCompleted ? (
        <main className="flex min-h-0 flex-1 flex-col px-5 pt-8 pb-2 sm:px-8">
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
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

            <div className="mt-6 max-h-[26vh] shrink-0 overflow-y-auto border-b border-white/10 pb-5 pr-1 text-[15px] leading-7 whitespace-pre-wrap text-[#c6c6c6]">
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
            <h1 className="text-center text-[28px] font-semibold tracking-tight text-[#f3f3f3] sm:text-[32px]">
              PulseCheck
            </h1>
            <p className="mt-2 text-center text-sm text-[#9b9b9b]">
              What still holds up today?
            </p>

            <div className="mt-7">
              <ArticleComposer
                article={article}
                isChecking={currentStatus === "checking"}
                onArticleChange={handleArticleChange}
                onLoadDemo={handleLoadDemo}
                onCheckArticle={handleCheckArticle}
                onReset={handleReset}
              />
            </div>

            <p className="mt-3 text-center text-xs leading-5 text-[#8e8ea0]">
              Your article is sent to OpenAI for research. Do not paste secrets
              or information you are not authorized to process.
            </p>

            {currentStatus === "checking" ? (
              <div className="mt-8">
                <div aria-hidden="true" className="h-px bg-white/10">
                  <div className="h-px w-1/3 bg-[#b4b4b4]" />
                </div>
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-4 text-center text-[15px] text-[#b4b4b4]"
                >
                  Researching and validating claims…
                </p>
              </div>
            ) : null}

            {currentError ? (
              <p role="alert" className="mt-8 text-center text-sm text-red-400">
                {currentError}
              </p>
            ) : null}
          </div>
        </main>
      )}
    </ProductShell>
  );
}
