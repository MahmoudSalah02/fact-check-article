import { NextResponse } from "next/server";
import OpenAI from "openai";

import { completeOpenAiRun } from "@/lib/server/analysis-completion";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-server";

export const runtime = "nodejs";

type UnwrapWebhookEvent = Awaited<ReturnType<OpenAI["webhooks"]["unwrap"]>>;

function responseIdFromEvent(event: UnwrapWebhookEvent): string | null {
  if (!event.type.startsWith("response.")) return null;
  const data = (event as { data?: { id?: unknown } }).data;
  return typeof data?.id === "string" ? data.id : null;
}

export async function POST(request: Request) {
  const secret = process.env.OPENAI_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  }

  // Signature verification needs the exact raw body, so read it as text.
  const rawBody = await request.text();

  let event: UnwrapWebhookEvent;
  try {
    event = await new OpenAI().webhooks.unwrap(
      rawBody,
      request.headers,
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const responseId = responseIdFromEvent(event);
  if (!responseId) {
    // Not a response lifecycle event — acknowledge and ignore.
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabaseClient();

  const { data: run } = await admin
    .from("analysis_runs")
    .select("id")
    .eq("provider_response_id", responseId)
    .maybeSingle();

  // Idempotency gate: the event id is a primary key. A duplicate delivery hits
  // a unique violation and is a no-op.
  const { error: insertError } = await admin.from("webhook_events").insert({
    event_id: event.id,
    run_id: run?.id ?? null,
    event_type: event.type,
  });
  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ ok: true });
    return NextResponse.json(
      { error: "Unable to record webhook event" },
      { status: 500 },
    );
  }

  if (run) {
    await completeOpenAiRun(admin, run.id);
  }

  return NextResponse.json({ ok: true });
}
