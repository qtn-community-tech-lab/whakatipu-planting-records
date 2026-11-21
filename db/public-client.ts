/** Supabase as a signed-out visitor; public history never uses a staff session. */
import { createClient } from "@supabase/supabase-js";
import type { Database, Db } from "@/db/types";

export function publicDb(): Db {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    },
  );
}
