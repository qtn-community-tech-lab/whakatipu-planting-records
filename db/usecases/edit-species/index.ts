/** Change or retire a species. What may change: types.ts. */
import type { Db } from "@/db/types";
import type { SpeciesChanges } from "./types";

export { speciesChanges, type SpeciesChanges } from "./types";

/** Returns the saved row, or null when the species is missing or not the caller's to change. */
export async function updateSpecies(supabase: Db, slug: string, c: SpeciesChanges) {
  const { data } = await supabase
    .from("species")
    .update({
      common_name: c.commonName,
      maori_name: c.maoriName,
      suggested_spelling: c.suggestedSpelling,
      over_5m: c.over5m,
      threatened: c.threatened,
      threatened_te_kakano: c.threatenedTeKakano,
      register_note: c.registerNote,
    })
    .eq("slug", slug)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a species. Nothing is ever deleted; its history stays. */
export async function retireSpecies(supabase: Db, slug: string) {
  await supabase
    .from("species")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("slug", slug)
    .throwOnError();
}
