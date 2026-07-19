import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TODO(M3): Verify the raw webhook body and complete runs idempotently.
// Acceptance: duplicate events are safe and all writes commit in one database transaction.
export async function POST() {
  return NextResponse.json(
    { error: "OpenAI webhook is not implemented until M3" },
    { status: 501 },
  );
}
