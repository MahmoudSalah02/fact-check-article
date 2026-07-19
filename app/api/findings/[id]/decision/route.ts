import { NextResponse } from "next/server";

// TODO(M2): Persist owner-scoped accept, reject, and restore decisions.
// Acceptance: the immutable original document is never overwritten.
export async function PATCH() {
  return NextResponse.json(
    { error: "Edit decisions are not implemented until M2" },
    { status: 501 },
  );
}
