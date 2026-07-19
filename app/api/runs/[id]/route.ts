import { NextResponse } from "next/server";

import { AuthenticationError, requireUser } from "@/lib/server/auth";
import {
  getDurableRun,
  PersistenceUnavailableError,
} from "@/lib/supabase/persistence";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { client } = await requireUser(request);
    const { id } = await context.params;
    const run = await getDurableRun(client, id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(run);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PersistenceUnavailableError) {
      return NextResponse.json(
        { error: "PulseCheck storage is temporarily unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to read run" }, { status: 500 });
  }
}
