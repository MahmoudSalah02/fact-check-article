import { NextResponse } from "next/server";

// TODO(M3): Return an authenticated run snapshot and reconcile stale provider state.
// Acceptance: responses are owner-scoped, private, and never expose partial findings.
export async function GET() {
  return NextResponse.json(
    { error: "Run status API is not implemented until M3" },
    { status: 501 },
  );
}
