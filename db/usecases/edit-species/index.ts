/** Change or retire a species. */
import type { Db } from "@/db/types";
import type { SpeciesChanges } from "./types";

export * from "./types";

/** Returns the saved row, or null when the species is missing or not the caller's to change. */
export async function updateSpecies(supabase: Db, slug: string, changes: SpeciesChanges) {
  const { data } = await supabase.from("species").update(changes).eq("slug", slug).select().maybeSingle().throwOnError();
  return data;
}

/** Retire a species. Nothing is ever deleted; its history stays. */
export async function retireSpecies(supabase: Db, slug: string) {
  await supabase.from("species").update({ deactivated_at: new Date().toISOString() }).eq("slug", slug).throwOnError();
}
