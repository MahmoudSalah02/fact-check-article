import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  SetDecisionInputSchema,
  SetDecisionResultSchema,
} from "@/lib/contracts";
import { AuthenticationError, requireUser } from "@/lib/server/auth";
import { toIsoUtc } from "@/lib/supabase/timestamps";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { client } = await requireUser(request);
    const { id } = await context.params;
    const input = SetDecisionInputSchema.parse(await request.json());
    const { data, error } = await client.rpc("set_finding_decision", {
      p_finding_id: id,
      p_decision: input.decision,
    });
    if (error) {
      return NextResponse.json(
        { error: "PulseCheck storage is temporarily unavailable" },
        { status: 503 },
      );
    }
    const decision = data?.[0];
    if (!decision) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }
    return NextResponse.json(
      SetDecisionResultSchema.parse({
        findingId: decision.finding_id,
        decision: decision.decision,
        decidedAt: toIsoUtc(decision.decided_at),
      }),
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid decision request" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unable to save decision" },
      { status: 500 },
    );
  }
}
