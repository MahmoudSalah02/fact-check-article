import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AnalysisRunSchema,
  CreateRunResultSchema,
  DocumentSchema,
  FindingSchema,
  GetRunResultSchema,
  type CreateRunInput,
  type Finding,
  type GetRunResult,
} from "@/lib/contracts";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import { toIsoUtc } from "@/lib/supabase/timestamps";

export { toIsoUtc };

type UserClient = SupabaseClient<Database>;

export class PersistenceUnavailableError extends Error {}

export async function createDurableRun(
  client: UserClient,
  input: CreateRunInput,
  checkedAt: string,
) {
  const args = {
    p_original_text: input.text,
    p_checked_at: checkedAt,
    ...(input.title === null ? {} : { p_title: input.title }),
  };
  const { data, error } = await client.rpc("create_analysis_run", args);
  const created = data?.[0];
  if (error || !created) {
    throw new PersistenceUnavailableError("Unable to create analysis run");
  }
  return {
    documentId: created.document_id,
    result: CreateRunResultSchema.parse({
      runId: created.run_id,
      status: created.status,
      createdAt: toIsoUtc(created.created_at),
    }),
  };
}

export async function completeDurableRun(
  client: UserClient,
  runId: string,
  providerResponseId: string,
  findings: Finding[],
  model = "fixture",
) {
  const { error } = await client.rpc("complete_analysis_run", {
    p_run_id: runId,
    p_model: model,
    p_provider_response_id: providerResponseId,
    p_findings: findings as unknown as Json,
  });
  if (error) {
    // P0002: the run was already terminal (a concurrent webhook/poll won the
    // race). Completion is idempotent, so treat that as a benign no-op.
    if (error.code === "P0002") return;
    throw new PersistenceUnavailableError("Unable to complete analysis run");
  }
}

export async function markRunInProgress(
  client: UserClient,
  runId: string,
  providerResponseId: string,
) {
  const { error } = await client
    .from("analysis_runs")
    .update({
      status: "in_progress",
      provider_response_id: providerResponseId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", "queued");
  if (error) {
    throw new PersistenceUnavailableError("Unable to start analysis run");
  }
}

export async function failDurableRun(
  client: UserClient,
  runId: string,
  errorCode: string,
) {
  // Only fail a still-running run so a late failure never clobbers a completed
  // one (webhook and poll reconciliation can race).
  await client
    .from("analysis_runs")
    .update({
      status: "failed",
      error_code: errorCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .in("status", ["queued", "in_progress"]);
}

export async function getDurableRun(
  client: UserClient,
  runId: string,
): Promise<GetRunResult | null> {
  const { data: runRow, error: runError } = await client
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runError) throw new PersistenceUnavailableError("Unable to read run");
  if (!runRow) return null;

  const { data: documentRow, error: documentError } = await client
    .from("documents")
    .select("*")
    .eq("id", runRow.document_id)
    .maybeSingle();
  if (documentError) {
    throw new PersistenceUnavailableError("Unable to read document");
  }
  if (!documentRow) return null;

  let findings: Finding[] | null = null;
  if (runRow.status === "completed") {
    const { data: findingRows, error: findingsError } = await client
      .from("findings")
      .select("*, sources(*)")
      .eq("run_id", runId)
      .order("start_offset");
    if (findingsError) {
      throw new PersistenceUnavailableError("Unable to read findings");
    }
    findings = findingRows.map((row) => mapFinding(row, runRow.checked_at));
  }

  return GetRunResultSchema.parse({
    run: mapRun(runRow),
    document: mapDocument(documentRow),
    findings,
  });
}

export function mapDocument(row: Tables<"documents">) {
  return DocumentSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    originalText: row.original_text,
    createdAt: toIsoUtc(row.created_at),
  });
}

export function mapRun(row: Tables<"analysis_runs">) {
  return AnalysisRunSchema.parse({
    id: row.id,
    documentId: row.document_id,
    status: row.status,
    checkedAt: row.checked_at,
    model: row.model,
    providerResponseId: row.provider_response_id,
    errorCode: row.error_code,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  });
}

type FindingWithSources = Tables<"findings"> & {
  sources: Tables<"sources">[];
};

export function mapFinding(row: FindingWithSources, checkedAt: string) {
  return FindingSchema.parse({
    id: row.id,
    sourceText: row.source_text,
    prefixText: row.prefix_text,
    suffixText: row.suffix_text,
    claimType: row.claim_type,
    verdict: row.verdict,
    forecastStatus: row.forecast_status,
    confidence: row.confidence,
    explanation: row.explanation,
    replacement: row.replacement,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    checkedAt,
    sources: [...row.sources]
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((source) => ({
        url: source.url,
        title: source.title,
        publisher: source.publisher,
        publishedAt: source.published_at,
      })),
  });
}
