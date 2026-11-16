import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { loginHref } from "@/lib/auth/redirect";
import { db } from "@/db/client";
import type { Database } from "@/db/types";

/** Checked per request. The database maps this Auth identity to an active approved staff row. */
export const isAuthenticated = cache(async () => {
  const client = await db();
  const { data: claims, error: claimsError } = await client.auth.getClaims();
  if (claimsError || !claims?.claims.sub) return false;
  const { data, error } = await client.rpc("current_app_user_id");
  return !error && data !== null;
});

/** Send unauthenticated visitors to sign-in, preserving their destination. */
export async function requireAuthenticated(next: string): Promise<void> {
  if (!(await isAuthenticated())) redirect(loginHref(next));
}

/** Check the private staff allowlist before requesting an email, including for existing Auth identities. */
export async function hasActiveStaffEmail(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey)
    throw new Error("Staff email lookup is not configured.");

  const client = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  const { data, error } = await client
    .from("users")
    .select("id")
    .eq("email", email)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Ask Supabase Auth to email a magic link; its signup hook enforces the allowlist. */
export async function sendMagicLink(email: string, emailRedirectTo: string) {
  return (await db()).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  });
}

/** Verify a Supabase email token hash and write the session into the request cookies. */
export async function verifyMagicLink(tokenHash: string) {
  return (await db()).auth.verifyOtp({ token_hash: tokenHash, type: "email" });
}

export async function signOut() {
  return (await db()).auth.signOut({ scope: "local" });
}
