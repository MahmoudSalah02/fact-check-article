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
  runClient?: RunClient | null;
  restoreRunId?: string | null;
  onRunIdChange?: (runId: string | null) => void;
  startupError?: string | null;
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

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll a run until it reaches a terminal state. HTTP success is not analysis
 * completion: the OpenAI path returns `in_progress`, and only the backend run
 * status is authoritative. The fixture path already returns `completed`, so the
 * first read exits the loop immediately.
 */
async function pollRunUntilTerminal(
  client: RunClient,
  runId: string,
  shouldStop: () => boolean,
): Promise<RunView | null> {
  const startedAt = Date.now();
  let view = await client.getRun(runId);
  while (view.run.status === "queued" || view.run.status === "in_progress") {
    if (shouldStop() || Date.now() - startedAt >= POLL_TIMEOUT_MS) break;
    await sleep(POLL_INTERVAL_MS);
    view = await client.getRun(runId);
  }
  return shouldStop() ? null : view;
}

function getRunFailureMessage(errorCode: string | null) {
  switch (errorCode) {
    case "invalid_analysis_output":
    case "no_usable_findings":
      return "We couldn't extract verifiable findings from this article. Please try again.";
    default:
      return "We couldn't complete the analysis. Please try again.";
  }
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

  const runClient =
    providedRunClient === undefined ? fixtureRunClient : providedRunClient;
  const usesDurableBackend = onRunIdChange !== undefined;

  useEffect(() => {
    if (!runClient || !restoreRunId) return;
    const client = runClient;
    const runId = restoreRunId;
    let cancelled = false;

    async function restoreRun() {
      try {
        setStatus("checking");
        const restored = await pollRunUntilTerminal(
          client,
          runId,
          () => cancelled,
        );
        if (!restored || cancelled) return;
        if (restored.run.status !== "completed") {
          setError(
            restored.run.status === "failed"
              ? getRunFailureMessage(restored.run.errorCode)
              : "This is taking longer than expected. Please refresh.",
          );
          setStatus("error");
          return;
        }
        const restoredDecisions =
          restored.findings && usesDurableBackend
            ? await loadPersistedDecisions(restored.findings)
            : [];
        if (cancelled) return;
        setArticle(restored.document.originalText);
        setRunView(restored);
        setDecisions(restoredDecisions);
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
  }, [restoreRunId, runClient, usesDurableBackend]);

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
      const finished = await pollRunUntilTerminal(
        runClient,
        created.runId,
        () => false,
      );
      if (!finished) return;
      if (finished.run.status !== "completed") {
        setError(
          finished.run.status === "failed"
            ? getRunFailureMessage(finished.run.errorCode)
            : "This is taking longer than expected. Please try again.",
        );
        setStatus("error");
        return;
      }
      setRunView(finished);
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
  const currentStatus = startupError ? "error" : status;
  const currentError = startupError ?? error;
  const isCompleted = currentStatus === "completed" && runView !== null;
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
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
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
