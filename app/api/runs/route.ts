import { NextResponse } from "next/server";

// TODO(M3): Validate auth/input, create a durable run, and start a background Response.
// Acceptance: quota enforcement and run creation are atomic.
export async function POST() {
  return NextResponse.json(
    { error: "Run API is not implemented until M3" },
    { status: 501 },
  );
}
