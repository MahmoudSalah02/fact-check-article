import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import demoExpected from "@/fixtures/demo-expected.json";
import { FixtureAnalysisProvider } from "@/lib/analysis/fixture-provider";
import { CreateRunInputSchema } from "@/lib/contracts";
import { AuthenticationError, requireUser } from "@/lib/server/auth";
import { readServerConfig } from "@/lib/server/config";
import { prepareFixtureFindings } from "@/lib/server/fixture-findings";
import { createOpenAiTransport } from "@/lib/server/openai/transport";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-server";
import {
  completeDurableRun,
  createDurableRun,
  failDurableRun,
  markRunInProgress,
  PersistenceUnavailableError,
} from "@/lib/supabase/persistence";

async function readDemoArticle() {
  return (
    await readFile(join(process.cwd(), "fixtures/demo-article.txt"), "utf8")
  ).trim();
}

export async function POST(request: Request) {
  const config = readServerConfig();
  let runId: string | undefined;
  try {
    const { client } = await requireUser(request);
    const input = CreateRunInputSchema.parse(await request.json());
    const demoArticle = await readDemoArticle();
    const isDemo = input.text === demoArticle;

    // The prepared demo runs on the deterministic fixture in every mode, so the
    // canned pitch demo stays free and stable even when OpenAI is enabled.
    if (isDemo) {
      const provider = new FixtureAnalysisProvider(demoArticle, demoExpected);
      const created = await createDurableRun(client, input, provider.checkedAt);
      runId = created.result.runId;
      const submission = await provider.start({
        runId,
        articleText: input.text,
        checkedAt: provider.checkedAt,
      });
      const output = await provider.retrieve(submission.providerRunId);
      const findings = prepareFixtureFindings(
        input.text,
        provider.checkedAt,
        output.findings,
      ).map((finding) => ({ ...finding, id: crypto.randomUUID() }));
      await completeDurableRun(
        createAdminSupabaseClient(),
        runId,
        submission.providerRunId,
        findings,
      );
      return NextResponse.json({ ...created.result, status: "completed" });
    }

    // Real analysis: submit a background Response and complete out-of-band via
    // the webhook or GET reconciliation. The run is returned still in progress.
    if (config.ANALYSIS_PROVIDER === "openai") {
      const checkedAt = new Date().toISOString().slice(0, 10);
      const created = await createDurableRun(client, input, checkedAt);
      runId = created.result.runId;
      const submission = await createOpenAiTransport().submit(
        input.text,
        checkedAt,
      );
      await markRunInProgress(
        createAdminSupabaseClient(),
        runId,
        submission.responseId,
      );
      return NextResponse.json({ ...created.result, status: "in_progress" });
    }

    return NextResponse.json(
      { error: "This prototype only supports the prepared demo article" },
      { status: 422 },
    );
  } catch (error) {
    if (runId) {
      await failDurableRun(
        createAdminSupabaseClient(),
        runId,
        "analysis_submit_failed",
      );
    }
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid run request" }, { status: 400 });
  }
  if (error instanceof PersistenceUnavailableError) {
    return NextResponse.json(
      { error: "PulseCheck storage is temporarily unavailable" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Unable to analyze the article" },
    { status: 500 },
  );
}
