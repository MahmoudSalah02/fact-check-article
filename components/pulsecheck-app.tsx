"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArticleComposer,
  MAX_ARTICLE_LENGTH,
} from "@/components/article-composer";
import { ArticleView } from "@/components/article-view";
import { EvidencePanel } from "@/components/evidence-panel";
import { ProductShell } from "@/components/product-shell";
import { createFixtureRunClient } from "@/lib/client/create-fixture-run-client";
import { HttpRunClient, RunClientError } from "@/lib/client/http-run-client";
import {
  SetDecisionResultSchema,
  type EditDecision,
  type Finding,
  type RunClient,
  type RunView,
} from "@/lib/contracts";
import {
  createBrowserSupabaseClient,
  getAnonymousAccessToken,
} from "@/lib/supabase/browser";

type PulseCheckAppProps = {
  demoArticle: string;
  demoExpected: unknown;
  backend?: "fake" | "supabase";
  runClient?: RunClient;
};

type AppStatus = "empty" | "ready" | "checking" | "completed" | "error";
type FindingFilter = "all" | Finding["claimType"];

const FINDING_FILTERS: Array<{ id: FindingFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "fact", label: "Facts" },
  { id: "forecast", label: "Forecasts" },
  { id: "opinion", label: "Opinions" },
];

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

async function loadPersistedDecisions(
  restoredFindings: Finding[],
): Promise<EditDecision[]> {
  if (restoredFindings.length === 0) return [];
  const client = createBrowserSupabaseClient();
  const { data, error } = await client
    .from("edit_decisions")
    .select("finding_id, decision, decided_at")
    .in(
      "finding_id",
      restoredFindings.map(({ id }) => id),
    );
  if (error) throw error;
  return data.map((row) =>
    SetDecisionResultSchema.parse({
      findingId: row.finding_id,
      decision: row.decision,
      decidedAt: new Date(row.decided_at).toISOString(),
    }),
  );
}

function latestDecisionForFinding(
  findingId: string,
  decisions: EditDecision[],
) {
  let latest: EditDecision | undefined;
  for (const decision of decisions) {
    if (
      decision.findingId === findingId &&
      (!latest ||
        Date.parse(decision.decidedAt) >= Date.parse(latest.decidedAt))
    ) {
      latest = decision;
    }
  }
  return latest?.decision ?? null;
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
  const [decisions, setDecisions] = useState<EditDecision[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null,
  );
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [savingFindingId, setSavingFindingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FindingFilter>("all");

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
        if (restored.findings) {
          setDecisions(await loadPersistedDecisions(restored.findings));
        }
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
    setDecisions([]);
    setSelectedFindingId(null);
    setActiveFilter("all");
    setStatus(nextArticle.length === 0 ? "empty" : "ready");
  }

  function handleLoadDemo() {
    setArticle(demoArticle);
    setRunView(null);
    setError(null);
    setDecisions([]);
    setSelectedFindingId(null);
    setActiveFilter("all");
    setStatus("ready");
  }

  function handleReset() {
    setArticle("");
    setRunView(null);
    setError(null);
    setDecisions([]);
    setSelectedFindingId(null);
    setDecisionError(null);
    setActiveFilter("all");
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
      setDecisions([]);
      setSelectedFindingId(null);
      setActiveFilter("all");
      setStatus("completed");
    } catch (caught) {
      setError(getErrorMessage(caught));
      setStatus("error");
    }
  }

  const findings = runView?.findings ?? [];
  const isCompleted = status === "completed" && runView !== null;
  const visibleFindings = findings.filter(
    (finding) => activeFilter === "all" || finding.claimType === activeFilter,
  );
  const visibleFindingIds = new Set(
    visibleFindings.map((finding) => finding.id),
  );
  const selectedFinding =
    visibleFindings.find(({ id }) => id === selectedFindingId) ?? null;
  const selectedIndex = selectedFinding
    ? visibleFindings.findIndex(({ id }) => id === selectedFinding.id)
    : -1;
  const selectedDecision = selectedFinding
    ? latestDecisionForFinding(selectedFinding.id, decisions)
    : null;

  async function handleDecision(decision: EditDecision["decision"]) {
    if (!selectedFinding) return;
    setSavingFindingId(selectedFinding.id);
    setDecisionError(null);

    try {
      let savedDecision: EditDecision;
      if (usesDurableBackend) {
        const token = await getAnonymousAccessToken();
        const response = await fetch(
          `/api/findings/${encodeURIComponent(selectedFinding.id)}/decision`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ decision }),
          },
        );
        if (!response.ok) throw new Error("Decision request failed");
        savedDecision = SetDecisionResultSchema.parse(await response.json());
      } else {
        savedDecision = {
          findingId: selectedFinding.id,
          decision,
          decidedAt: new Date().toISOString(),
        };
      }
      setDecisions((current) => [...current, savedDecision]);
    } catch {
      setDecisionError("We couldn't save this decision. Please try again.");
    } finally {
      setSavingFindingId(null);
    }
  }

  function selectRelativeFinding(offset: number) {
    if (visibleFindings.length === 0) return;
    const nextIndex =
      (selectedIndex + offset + visibleFindings.length) %
      visibleFindings.length;
    setSelectedFindingId(visibleFindings[nextIndex]?.id ?? null);
    setDecisionError(null);
  }

  function handleFilterChange(filter: FindingFilter) {
    setActiveFilter(filter);
    setDecisionError(null);
    if (
      selectedFindingId &&
      !findings.some(
        (finding) =>
          finding.id === selectedFindingId &&
          (filter === "all" || finding.claimType === filter),
      )
    ) {
      setSelectedFindingId(null);
    }
  }

  function closeEvidencePanel() {
    const findingId = selectedFindingId;
    setSelectedFindingId(null);
    setDecisionError(null);
    if (findingId) {
      window.setTimeout(() => {
        document.getElementById(`finding-dot-${findingId}`)?.focus();
      }, 0);
    }
  }

  return (
    <ProductShell>
      {isCompleted ? (
        <main className="flex min-h-0 flex-1 flex-col px-5 pt-8 pb-2 sm:px-8">
          <div className="rise-in mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#f3f3f3]">
                  PulseCheck
                </h1>
                <p role="status" className="mt-0.5 text-sm text-[#8e8ea0]">
                  {activeFilter === "all"
                    ? `${findings.length} ${findings.length === 1 ? "finding" : "findings"} ready to review.`
                    : `${visibleFindings.length} of ${findings.length} ${FINDING_FILTERS.find(({ id }) => id === activeFilter)?.label.toLowerCase()} shown.`}
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

            <div
              role="group"
              aria-label="Filter findings"
              className="mt-5 flex flex-wrap items-center gap-1.5"
            >
              {FINDING_FILTERS.map(({ id, label }) => {
                const count =
                  id === "all"
                    ? findings.length
                    : findings.filter(({ claimType }) => claimType === id)
                        .length;
                return (
                  <button
                    type="button"
                    key={id}
                    aria-label={`${label}: ${count} ${count === 1 ? "finding" : "findings"}`}
                    aria-pressed={activeFilter === id}
                    onClick={() => handleFilterChange(id)}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-white/60 ${
                      activeFilter === id
                        ? "bg-[#2f2f2f] font-medium text-[#f3f3f3]"
                        : "text-[#9b9b9b] hover:bg-white/5"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className={`text-xs ${
                        activeFilter === id
                          ? "text-[#c6c6c6]"
                          : "text-[#6f6f78]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={`mt-5 grid min-h-0 flex-1 gap-5 ${
                selectedFinding
                  ? "lg:grid-cols-[minmax(0,1fr)_340px]"
                  : "grid-cols-1"
              }`}
            >
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-white/5 bg-[#151515] p-5 sm:p-7">
                <ArticleView
                  originalText={runView.document.originalText}
                  findings={findings}
                  visibleFindingIds={visibleFindingIds}
                  decisions={decisions}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={(findingId) => {
                    setSelectedFindingId(findingId);
                    setDecisionError(null);
                  }}
                />
              </div>

              {selectedFinding ? (
                <EvidencePanel
                  finding={selectedFinding}
                  decision={selectedDecision}
                  position={selectedIndex + 1}
                  total={visibleFindings.length}
                  isSaving={savingFindingId === selectedFinding.id}
                  error={decisionError}
                  onDecision={(decision) => void handleDecision(decision)}
                  onPrevious={() => selectRelativeFinding(-1)}
                  onNext={() => selectRelativeFinding(1)}
                  onClose={closeEvidencePanel}
                />
              ) : null}
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
