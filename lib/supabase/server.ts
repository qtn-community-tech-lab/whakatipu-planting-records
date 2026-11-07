/**
 * Supabase for server components and server actions. It acts as the signed-in
 * person, so the access rules in the database decide what they can read and change.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/db/types";

/** Reads are cached for 5 minutes; a write calls revalidateTag(SUPABASE_TAG) to clear them. */
export const SUPABASE_TAG = "supabase";
const READ_CACHE_SECONDS = 300;

/** Caches GET requests (reads) only. Writes always go straight to the database. */
const cachedFetch: typeof fetch = (input, init) =>
  !init?.method || init.method === "GET"
    ? fetch(input, { ...init, next: { revalidate: READ_CACHE_SECONDS, tags: [SUPABASE_TAG] } })
    : fetch(input, init);

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: cachedFetch },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(toSet) {
          // Server components cannot set cookies; server actions can. Sign-in refreshes them either way.
          try {
            for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
          } catch {}
        },
      },
    },
  );
}
