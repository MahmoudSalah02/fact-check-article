import { NextResponse } from "next/server";

// TODO(M4): Permanently delete an authenticated user's document and related data.
// Acceptance: deletion cascades safely and cannot target another user's records.
export async function DELETE() {
  return NextResponse.json(
    { error: "Document deletion is not implemented until M4" },
    { status: 501 },
  );
}
