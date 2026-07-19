import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createUserSupabaseClient } from "@/lib/supabase/user-server";

export class AuthenticationError extends Error {}

export type AuthenticatedUser = {
  user: User;
  client: SupabaseClient<Database>;
};

export async function requireUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthenticationError("Authentication required");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError("Authentication required");

  const client = createUserSupabaseClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthenticationError("Invalid or expired session");
  }

  return { user: data.user, client };
}
