/** Change or retire a species. */
import { retired, type Db } from "@/db/types";
import type { SpeciesChanges } from "./types";

export * from "./types";

/** Returns the saved row, or null when the species is missing or not the caller's to change. */
export async function updateSpecies(db: Db, slug: string, changes: SpeciesChanges) {
  const { data } = await db
    .from("species")
    .update(changes)
    .eq("slug", slug)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a species. Nothing is ever deleted; its history stays. */
export async function retireSpecies(db: Db, slug: string) {
  await db
    .from("species")
    .update(retired())
    .eq("slug", slug)
    .throwOnError();
}
