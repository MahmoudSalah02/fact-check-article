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
  type RecentRun,
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
  recentRuns?: RecentRun[];
  onSelectRun?: (runId: string) => void;
  onRunCompleted?: () => void;
  startupError?: string | null;
};

type AppStatus =
  "empty" | "ready" | "checking" | "restoring" | "completed" | "error";
type FindingFilter = "all" | Finding["claimType"];

const FINDING_FILTERS: Array<{ id: FindingFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "fact", label: "Facts" },
  { id: "forecast", label: "Forecasts" },
  { id: "opinion", label: "Opinions" },
];

const CAPABILITIES = [
  "Fact-check claims",
  "Refresh old facts",
  "Validate forecasts",
] as const;

function ViewerLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col px-5 pt-8 pb-2 sm:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#f3f3f3]">
            PulseCheck
          </h1>
          <p role="status" className="mt-0.5 text-sm text-[#8e8ea0]">
            Opening check…
          </p>
        </div>
        <div className="mt-5 flex gap-2" aria-hidden="true">
          <span className="h-8 w-16 rounded-full bg-white/[0.07]" />
          <span className="h-8 w-20 rounded-full bg-white/[0.04]" />
          <span className="h-8 w-24 rounded-full bg-white/[0.04]" />
        </div>
        <div className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-[#242424] bg-[#151515] p-7">
            <div className="space-y-4" aria-hidden="true">
              <div className="h-3 w-2/5 rounded-full bg-white/[0.08]" />
              <div className="h-3 w-full rounded-full bg-white/[0.06]" />
              <div className="h-3 w-11/12 rounded-full bg-white/[0.06]" />
              <div className="h-3 w-4/5 rounded-full bg-white/[0.06]" />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="rounded-2xl border border-[#303030] bg-[#212121]"
          />
        </div>
      </div>
    </main>
  );
}

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

function firstReviewFindingId(findings: Finding[] | null) {
  if (!findings || findings.length === 0) return null;
  return (
    findings.find((finding) => finding.replacement !== null)?.id ??
    findings[0]?.id ??
    null
  );
}

export function PulseCheckApp({
  demoArticle,
  demoExpected,
  runClient: providedRunClient,
  restoreRunId = null,
  onRunIdChange,
  recentRuns,
  onSelectRun,
  onRunCompleted,
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fixtureRunClient = useMemo(
    () => createFixtureRunClient(demoArticle, demoExpected),
    [demoArticle, demoExpected],
  );

  const runClient =
    providedRunClient === undefined ? fixtureRunClient : providedRunClient;
  const usesDurableBackend = onRunIdChange !== undefined;

  useEffect(() => {
    if (status !== "checking") return;
    const interval = window.setInterval(() => {
      setAnalysisProgress((current) => {
        if (current >= 92) return 92;
        const step = current < 45 ? 3.5 : current < 75 ? 2 : 0.8;
        return Math.min(92, current + step);
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!runClient || !restoreRunId) return;
    const client = runClient;
    const runId = restoreRunId;
    let cancelled = false;

    async function restoreRun() {
      try {
        setStatus("restoring");
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
          setAnalysisProgress(0);
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
        setSelectedFindingId(firstReviewFindingId(restored.findings));
        setAnalysisProgress(100);
        setStatus("completed");
        onRunCompleted?.();
      } catch (caught) {
        if (cancelled) return;
        setError(getRestoreErrorMessage(caught));
        setAnalysisProgress(0);
        setStatus("error");
      }
    }

    void restoreRun();
    return () => {
      cancelled = true;
    };
  }, [onRunCompleted, restoreRunId, runClient, usesDurableBackend]);

  function handleArticleChange(nextArticle: string) {
    setArticle(nextArticle);
    setRunView(null);
    setError(null);
    setDecisions([]);
    setSelectedFindingId(null);
    setActiveFilter("all");
    setAnalysisProgress(0);
    setStatus(nextArticle.length === 0 ? "empty" : "ready");
  }

  function handleLoadDemo() {
    setArticle(demoArticle);
    setRunView(null);
    setError(null);
    setDecisions([]);
    setSelectedFindingId(null);
    setActiveFilter("all");
    setAnalysisProgress(0);
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
    setAnalysisProgress(0);
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

    setAnalysisProgress(6);
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
        setAnalysisProgress(0);
        setStatus("error");
        return;
      }
      setRunView(finished);
      setDecisions([]);
      setSelectedFindingId(firstReviewFindingId(finished.findings));
      setActiveFilter("all");
      setAnalysisProgress(100);
      setStatus("completed");
      onRunCompleted?.();
    } catch (caught) {
      setError(getErrorMessage(caught));
      setAnalysisProgress(0);
      setStatus("error");
    }
  }

  const findings = runView?.findings ?? [];
  const currentStatus = startupError ? "error" : status;
  const currentError = startupError ?? error;
  const showRunView =
    runView !== null &&
    (currentStatus === "completed" || currentStatus === "restoring");
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
    <ProductShell
      recentRuns={recentRuns}
      activeRunId={
        currentStatus === "restoring"
          ? restoreRunId
          : (runView?.run.id ?? restoreRunId)
      }
      onSelectRun={onSelectRun}
    >
      {showRunView && runView ? (
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
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#242424] bg-[#151515] p-5 sm:p-7">
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
                  key={selectedFinding.id}
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
      ) : currentStatus === "restoring" ? (
        <ViewerLoading />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5">
          <div className="w-full max-w-[720px] pb-16">
            <h1 className="text-center text-[28px] font-medium tracking-tight text-[#f3f3f3] sm:text-[32px]">
              Make any article current.
            </h1>

            <p className="mt-2 text-center text-sm text-[#9b9b9b]">
              Verify claims, update what changed, and cite every edit.
            </p>

            <div className="mt-6">
              <ArticleComposer
                article={article}
                isChecking={currentStatus === "checking"}
                isReady={runClient !== null}
                onArticleChange={handleArticleChange}
                onLoadDemo={handleLoadDemo}
                onCheckArticle={handleCheckArticle}
                onReset={handleReset}
              />
            </div>

            <ul
              aria-label="PulseCheck capabilities"
              className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#8e8ea0]"
            >
              {CAPABILITIES.map((capability) => (
                <li key={capability} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-[#b4b4b4]"
                  />
                  {capability}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-center text-xs leading-5 text-[#777780]">
              Checks are public. Don&apos;t paste sensitive information.
            </p>

            {currentStatus === "checking" ? (
              <div className="mt-8" aria-live="polite">
                <div
                  role="progressbar"
                  aria-label="Analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(analysisProgress)}
                  className="h-1 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    className="pulsecheck-progress-fill h-full rounded-full bg-[#d8d8d8] transition-[width] duration-500 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p
                  role="status"
                  className="mt-3 flex items-center justify-between text-sm text-[#9b9b9b]"
                >
                  <span>
                    {analysisProgress < 35
                      ? "Finding claims to verify…"
                      : analysisProgress < 70
                        ? "Checking current sources…"
                        : "Preparing cited edits…"}
                  </span>
                  <span className="tabular-nums text-[#6f6f78]">
                    {Math.round(analysisProgress)}%
                  </span>
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
