import { NextResponse } from "next/server";

import { completeOpenAiRun } from "@/lib/server/analysis-completion";
import { AuthenticationError, requireUser } from "@/lib/server/auth";
import { readServerConfig } from "@/lib/server/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-server";
import {
  getDurableRun,
  PersistenceUnavailableError,
} from "@/lib/supabase/persistence";

type Context = { params: Promise<{ id: string }> };

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(request: Request, context: Context) {
  try {
    const config = readServerConfig();
    const { client } = await requireUser(request);
    const { id } = await context.params;

    let view = await getDurableRun(client, id);
    if (!view) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404, headers: NO_STORE },
      );
    }

    // Reconcile a stuck OpenAI run in case its webhook was missed. The read
    // above already enforced RLS ownership, so we only ever reconcile the
    // caller's own run. Transient upstream failures are swallowed so polling
    // keeps working.
    const isPending =
      view.run.status === "queued" || view.run.status === "in_progress";
    if (config.ANALYSIS_PROVIDER === "openai" && isPending) {
      try {
        await completeOpenAiRun(createAdminSupabaseClient(), id);
        view = (await getDurableRun(client, id)) ?? view;
      } catch {
        // Leave the run pending; the next poll retries.
      }
    }

    return NextResponse.json(view, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401, headers: NO_STORE },
      );
    }
    if (error instanceof PersistenceUnavailableError) {
      return NextResponse.json(
        { error: "PulseCheck storage is temporarily unavailable" },
        { status: 503, headers: NO_STORE },
      );
    }
    return NextResponse.json(
      { error: "Unable to read run" },
      { status: 500, headers: NO_STORE },
    );
  }
}
