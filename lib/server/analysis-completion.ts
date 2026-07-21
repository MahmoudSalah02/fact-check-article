import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AnalysisEvidence } from "@/lib/analysis/validate-output";
import {
  AnalysisFindingSchema,
  FindingSchema,
  type AnalysisFinding,
  type Finding,
} from "@/lib/contracts";
import { resolveFindingSpanLenient } from "@/lib/domain/resolve-spans";
import {
  createOpenAiTransport,
  type OpenAiTransport,
} from "@/lib/server/openai/transport";
import type { Database } from "@/lib/supabase/database.types";
import {
  completeDurableRun,
  failDurableRun,
  getDurableRun,
  PersistenceUnavailableError,
} from "@/lib/supabase/persistence";

type AdminClient = SupabaseClient<Database>;

const MAX_FINDINGS = 25;
const EDITABLE_VERDICTS = new Set([
  "outdated",
  "contradicted",
  "needs_context",
]);
const EVIDENCE_REQUIRED_VERDICTS = new Set([
  "verified",
  "outdated",
  "contradicted",
  "needs_context",
]);

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Host-level evidence check. The model reformats cited URLs (e.g. arxiv `abs`
 * vs `html`), so byte-exact matching against the search sources drops most real
 * findings. Instead we require every cited source to live on a domain the
 * web_search tool actually consulted — enough to reject a fabricated domain
 * while tolerating path/format differences. Evidence-bearing verdicts must cite
 * at least one source.
 */
function findingEvidenceOk(
  finding: AnalysisFinding,
  searchedHosts: Set<string>,
): boolean {
  if (
    EVIDENCE_REQUIRED_VERDICTS.has(finding.verdict) &&
    finding.sources.length === 0
  ) {
    return false;
  }
  return finding.sources.every((source) => {
    const host = hostOf(source.url);
    return host !== null && searchedHosts.has(host);
  });
}

/**
 * Drop replacements the model shouldn't have proposed. The replacement policy
 * (high confidence + editable verdict + cited) is a cross-field rule Structured
 * Outputs can't enforce, so the model occasionally suggests an edit on a
 * medium/low-confidence finding. We null the unsafe edit and keep the finding as
 * a flag — exactly what the policy intends.
 */
export function normalizeReplacements(rawOutput: unknown): unknown {
  if (typeof rawOutput !== "object" || rawOutput === null) return rawOutput;
  const record = rawOutput as Record<string, unknown>;
  if (!Array.isArray(record.findings)) return rawOutput;

  return {
    ...record,
    findings: record.findings.map((raw) => {
      if (typeof raw !== "object" || raw === null) return raw;
      const finding = raw as Record<string, unknown>;
      if (finding.replacement == null) return finding;
      const allowed =
        finding.confidence === "high" &&
        typeof finding.verdict === "string" &&
        EDITABLE_VERDICTS.has(finding.verdict) &&
        Array.isArray(finding.sources) &&
        finding.sources.length > 0;
      return allowed ? finding : { ...finding, replacement: null };
    }),
  };
}

function rawFindingsOf(rawOutput: unknown): unknown[] | null {
  if (typeof rawOutput !== "object" || rawOutput === null) return null;
  const findings = (rawOutput as { findings?: unknown }).findings;
  return Array.isArray(findings) ? findings : null;
}

/**
 * Resolve untrusted model findings into durable records, one at a time. LLM
 * output is slightly messy, so a finding that is invalid, uncited, or unlocatable
 * is dropped rather than failing the whole batch. Overlapping spans keep the
 * earliest. Returns the persistable, offset-resolved findings.
 */
export function resolveModelFindings(
  articleText: string,
  checkedAt: string,
  rawFindings: unknown[],
  evidence: AnalysisEvidence,
): Finding[] {
  const searchedHosts = new Set(
    evidence.availableUrls
      .map(({ url }) => hostOf(url))
      .filter((host): host is string => host !== null),
  );

  const seenIds = new Set<string>();
  const resolved: Finding[] = [];

  for (const raw of rawFindings) {
    const parsed = AnalysisFindingSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[M3] drop finding: invalid schema");
      continue;
    }
    const finding = parsed.data;

    if (seenIds.has(finding.id)) continue;
    seenIds.add(finding.id);

    // Anti-hallucination: every cited source must be on a searched domain.
    if (!findingEvidenceOk(finding, searchedHosts)) {
      console.warn(
        `[M3] drop finding ${finding.id}: sources not on a searched domain`,
      );
      continue;
    }

    const span = resolveFindingSpanLenient(articleText, finding);
    if (!span) {
      console.warn(
        `[M3] drop finding ${finding.id}: quote could not be located`,
      );
      continue;
    }

    const record = FindingSchema.safeParse({
      ...finding,
      sourceText: span.sourceText,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      checkedAt,
    });
    if (!record.success) {
      console.warn(`[M3] drop finding ${finding.id}: invalid record`);
      continue;
    }

    resolved.push({ ...record.data, id: crypto.randomUUID() });
  }

  // Drop overlaps deterministically (keep the earliest span) so rendering stays
  // well-formed.
  resolved.sort(
    (a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset,
  );
  const kept: Finding[] = [];
  let lastEnd = -1;
  for (const finding of resolved) {
    if (finding.startOffset >= lastEnd) {
      kept.push(finding);
      lastEnd = finding.endOffset;
    }
  }
  return kept.slice(0, MAX_FINDINGS);
}

/**
 * Bring an OpenAI-backed run to a terminal state from its stored
 * `provider_response_id`. Status-guarded and safe to run twice (webhook + GET
 * reconciliation both call it). Individual model imperfections degrade
 * individual findings; the run only fails when the output is unusable.
 */
export async function completeOpenAiRun(
  admin: AdminClient,
  runId: string,
  transport: OpenAiTransport = createOpenAiTransport(),
): Promise<void> {
  const current = await getDurableRun(admin, runId);
  if (!current) return;

  const { run, document } = current;
  if (run.status === "completed" || run.status === "failed") return;
  if (!run.providerResponseId) return;

  const result = await transport.fetchResult(run.providerResponseId);
  if (result.status === "pending") return;
  if (result.status === "failed") {
    await failDurableRun(admin, runId, result.errorCode);
    return;
  }

  const rawFindings = rawFindingsOf(normalizeReplacements(result.rawOutput));
  if (rawFindings === null) {
    console.error("[M3] analysis output was not usable", { runId });
    await failDurableRun(admin, runId, "invalid_analysis_output");
    return;
  }

  const findings = resolveModelFindings(
    document.originalText,
    run.checkedAt,
    rawFindings,
    result.evidence,
  );

  if (rawFindings.length > 0 && findings.length === 0) {
    console.error("[M3] no findings survived validation/resolution", { runId });
    await failDurableRun(admin, runId, "no_usable_findings");
    return;
  }

  try {
    await completeDurableRun(
      admin,
      runId,
      run.providerResponseId,
      findings,
      process.env.OPENAI_MODEL ?? "openai",
    );
  } catch (error) {
    if (error instanceof PersistenceUnavailableError) throw error;
    console.error("[M3] run completion failed", { runId, error });
    await failDurableRun(admin, runId, "completion_failed");
  }
}
