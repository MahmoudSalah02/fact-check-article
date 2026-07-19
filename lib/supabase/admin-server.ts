// TODO(M2): Create the server-only administrative client for signed callbacks.
// Acceptance: this module cannot be imported by client components or user-facing repositories.
export function createAdminSupabaseClient(): never {
  throw new Error("Supabase admin client is not implemented until M2");
}
