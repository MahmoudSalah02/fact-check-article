/**
 * Normalizes a Postgres timestamptz string into an ISO-8601 UTC instant.
 *
 * Kept dependency-free (no `server-only`, Supabase, or contract imports) so
 * route handlers can format persistence timestamps without pulling the full
 * persistence module graph into their bundle.
 */
export function toIsoUtc(timestamp: string) {
  return new Date(timestamp).toISOString();
}
