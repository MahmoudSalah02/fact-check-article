// TODO(M2): Create a bearer-token-scoped server client that retains RLS.
// Acceptance: user-facing reads and writes never use administrative credentials.
export function createUserSupabaseClient(): never {
  throw new Error("Supabase user server client is not implemented until M2");
}
