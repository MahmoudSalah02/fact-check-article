// TODO(M2): Verify the Supabase bearer token and return the authenticated user ID.
// Acceptance: user-facing routes retain RLS and never use the service-role client.
export async function requireUserId(): Promise<never> {
  throw new Error("Authentication is not implemented until M2");
}
