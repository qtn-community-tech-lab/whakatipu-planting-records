/**
 * Supabase for server components and server actions. It acts as the signed-in
 * person, so the access rules in the database decide what they can read and change.
 * There is no backend of our own between the app and Supabase.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        // Server components cannot set cookies; server actions can. Sign-in refreshes them either way.
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {}
      },
    },
  });
}

export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

export function supabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  return key;
}
