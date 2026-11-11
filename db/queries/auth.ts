import { cache } from "react";
import { db } from "@/db/client";

/** Checked per request. The database maps this Auth identity to an active approved staff row. */
export const isAuthenticated = cache(async () => {
  const client = await db();
  const { data: claims, error: claimsError } = await client.auth.getClaims();
  if (claimsError || !claims?.claims.sub) return false;
  const { data, error } = await client.rpc("current_app_user_id");
  return !error && data !== null;
});

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
