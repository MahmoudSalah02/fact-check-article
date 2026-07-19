"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArticleEditor,
  MAX_ARTICLE_LENGTH,
  type ArticleEditorStatus,
} from "@/components/article-editor";
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

function getErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("only supports the prepared demo article")
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

export function PulseCheckApp({
  demoArticle,
  demoExpected,
  backend = "fake",
  runClient: providedRunClient,
}: PulseCheckAppProps) {
  const [article, setArticle] = useState("");
  const [runView, setRunView] = useState<RunView | null>(null);
  const [status, setStatus] = useState<ArticleEditorStatus>("empty");
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
    if (article.length === 0) {
      setError("Paste an article before checking.");
      setStatus("error");
      return;
    }

    if (article.length > MAX_ARTICLE_LENGTH) {
      setError(
        `Articles must be ${MAX_ARTICLE_LENGTH.toLocaleString()} characters or fewer.`,
      );
      setStatus("error");
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

  const findingsCount = runView?.findings?.length ?? null;

  return (
    <ProductShell>
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#ececec] sm:text-4xl">
            PulseCheck
          </h1>
          <p className="mt-3 text-base leading-7 text-[#b4b4b4] sm:text-lg">
            Check what still holds up. PulseCheck researches your article&apos;s
            factual claims and returns the smallest evidence-backed changes.
          </p>
        </div>

        <div className="mt-8">
          <ArticleEditor
            article={article}
            status={status}
            error={error}
            findingsCount={findingsCount}
            onArticleChange={handleArticleChange}
            onLoadDemo={handleLoadDemo}
            onCheckArticle={handleCheckArticle}
            onReset={handleReset}
          />
        </div>

        {status === "completed" ? (
          <section
            aria-labelledby="results-heading"
            className="mt-6 border-t border-white/10 pt-6"
          >
            <h2
              id="results-heading"
              className="text-base font-semibold text-[#ececec]"
            >
              Analysis ready
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b4b4b4]">
              The analysis completed successfully. Your article remains
              unchanged.
            </p>
          </section>
        ) : null}
      </main>
    </ProductShell>
  );
}
