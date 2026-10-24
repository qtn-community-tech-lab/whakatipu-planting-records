/**
 * Supabase for server components and server actions. It acts as the signed-in
 * person, so the access rules in the database decide what they can read and change.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/db/types";

export async function createClient() {
  const cookieStore = await cookies();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to read planting records.");
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
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
