/** Move a pin, set its radius, or retire it. */
import type { Db } from "@/db/types";
import type { PinChanges } from "./types";

export * from "./types";

/** Returns the saved pin, or null when it is missing or not the caller's to change. */
export async function updatePin(supabase: Db, slug: string, changes: PinChanges) {
  const { data } = await supabase.from("site_locations").update(changes).eq("slug", slug).select().maybeSingle().throwOnError();
  return data;
}

/** Retire a pin. Nothing is ever deleted. */
export async function retirePin(supabase: Db, slug: string) {
  await supabase.from("site_locations").update({ deactivated_at: new Date().toISOString() }).eq("slug", slug).throwOnError();
}
