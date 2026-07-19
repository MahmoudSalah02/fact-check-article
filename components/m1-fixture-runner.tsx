"use client";

import { useMemo, useState } from "react";

import type { RunView } from "@/lib/contracts";
import { createFixtureRunClient } from "@/lib/client/create-fixture-run-client";

type Props = {
  demoArticle: string;
  demoExpected: unknown;
};

export function M1FixtureRunner({ demoArticle, demoExpected }: Props) {
  const [article, setArticle] = useState("");
  const [runView, setRunView] = useState<RunView | null>(null);
  const [status, setStatus] = useState<
    "empty" | "ready" | "checking" | "completed" | "error"
  >("empty");
  const [error, setError] = useState<string | null>(null);

  const runClient = useMemo(
    () => createFixtureRunClient(demoArticle, demoExpected),
    [demoArticle, demoExpected],
  );

  function loadDemo() {
    setArticle(demoArticle);
    setRunView(null);
    setError(null);
    setStatus("ready");
  }

  async function checkArticle() {
    setStatus("checking");
    setError(null);
    try {
      const created = await runClient.createRun({
        text: article,
        title: "M1 demo",
      });
      setRunView(await runClient.getRun(created.runId));
      setStatus("completed");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to check the article",
      );
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-zinc-500">
          Concept prototype · M1 fixture mode
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          PulseCheck
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-600">
          The typed fake vertical slice is live. F1 will replace this temporary
          interface with the article-first product experience.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="article"
          className="mb-3 block text-sm font-medium text-zinc-700"
        >
          Article
        </label>
        <textarea
          id="article"
          value={article}
          onChange={(event) => {
            setArticle(event.target.value);
            setStatus(event.target.value.length > 0 ? "ready" : "empty");
          }}
          placeholder="Load the deterministic demo article…"
          className="min-h-56 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 leading-7 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDemo}
            className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium text-zinc-800 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            Load demo article
          </button>
          <button
            type="button"
            onClick={checkArticle}
            disabled={article.length === 0 || status === "checking"}
            className="rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {status === "checking" ? "Checking…" : "Check article"}
          </button>
          <span aria-live="polite" className="text-sm text-zinc-500">
            {status === "completed"
              ? `${runView?.findings?.length ?? 0} findings loaded`
              : null}
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      {runView ? (
        <section aria-labelledby="result-heading" className="space-y-3">
          <h2
            id="result-heading"
            className="text-xl font-semibold text-zinc-900"
          >
            Typed fixture result
          </h2>
          <pre className="max-h-[36rem] overflow-auto rounded-2xl bg-zinc-950 p-5 text-xs leading-6 text-zinc-100">
            {JSON.stringify(runView.findings, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
