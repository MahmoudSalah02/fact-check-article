import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import demoExpected from "@/fixtures/demo-expected.json";
import { FixtureAnalysisProvider } from "@/lib/analysis/fixture-provider";
import { CreateRunInputSchema } from "@/lib/contracts";
import { AuthenticationError, requireUser } from "@/lib/server/auth";
import { prepareFixtureFindings } from "@/lib/server/fixture-findings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-server";
import {
  completeDurableRun,
  createDurableRun,
  failDurableRun,
  PersistenceUnavailableError,
} from "@/lib/supabase/persistence";

export async function POST(request: Request) {
  let runId: string | undefined;
  try {
    const { client } = await requireUser(request);
    const input = CreateRunInputSchema.parse(await request.json());
    const demoArticle = (
      await readFile(join(process.cwd(), "fixtures/demo-article.txt"), "utf8")
    ).trim();
    if (input.text !== demoArticle) {
      return NextResponse.json(
        {
          error:
            "M2 supports the prepared demo article until live analysis is enabled",
        },
        { status: 422 },
      );
    }

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
  } catch (error) {
    if (runId) {
      await failDurableRun(
        createAdminSupabaseClient(),
        runId,
        "fixture_analysis_failed",
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
    { error: "Unable to analyze the prepared article" },
    { status: 500 },
  );
}
