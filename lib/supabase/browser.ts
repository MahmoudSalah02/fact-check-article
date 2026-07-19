import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | undefined;

function readBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase browser configuration is missing");
  }
  return { url, publishableKey };
}

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, publishableKey } = readBrowserConfig();
    browserClient = createClient<Database>(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}

export async function getAnonymousAccessToken(): Promise<string> {
  const client = createBrowserSupabaseClient();
  const { data: current, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session) return current.session.access_token;

  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) {
    throw error ?? new Error("Anonymous sign-in did not return a session");
  }
  return data.session.access_token;
}
