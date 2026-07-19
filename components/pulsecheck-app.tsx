"use client";

import { useMemo, useState } from "react";

import {
  ArticleEditor,
  MAX_ARTICLE_LENGTH,
  type ArticleEditorStatus,
} from "@/components/article-editor";
import { ProductShell } from "@/components/product-shell";
import { createFixtureRunClient } from "@/lib/client/create-fixture-run-client";
import type { RunClient, RunView } from "@/lib/contracts";

type PulseCheckAppProps = {
  demoArticle: string;
  demoExpected: unknown;
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

export function PulseCheckApp({
  demoArticle,
  demoExpected,
  runClient: providedRunClient,
}: PulseCheckAppProps) {
  const [article, setArticle] = useState("");
  const [runView, setRunView] = useState<RunView | null>(null);
  const [status, setStatus] = useState<ArticleEditorStatus>("empty");
  const [error, setError] = useState<string | null>(null);

  const fixtureRunClient = useMemo(
    () => createFixtureRunClient(demoArticle, demoExpected),
    [demoArticle, demoExpected],
  );
  const runClient = providedRunClient ?? fixtureRunClient;

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

    setStatus("checking");
    setError(null);
    setRunView(null);

    try {
      const created = await runClient.createRun({ text: article, title: null });
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
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl">
            PulseCheck
          </h1>
          <p className="mt-4 text-xl font-medium tracking-tight text-zinc-800 sm:text-2xl">
            Check what still holds up.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            PulseCheck researches factual claims in your article and returns the
            smallest evidence-backed changes for your review.
          </p>
        </div>

        <div className="mt-10">
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
            className="mt-6 border-t border-zinc-200 pt-6"
          >
            <h2
              id="results-heading"
              className="text-base font-semibold text-zinc-950"
            >
              Analysis ready
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              The fixture analysis completed successfully. Your article remains
              unchanged.
            </p>
          </section>
        ) : null}
      </main>
    </ProductShell>
  );
}
