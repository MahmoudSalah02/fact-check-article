// TODO(M2): Create the browser Supabase client using only publishable configuration.
// Acceptance: anonymous sessions persist locally and no secret key enters the client bundle.
export function createBrowserSupabaseClient(): never {
  throw new Error("Supabase browser client is not implemented until M2");
}
