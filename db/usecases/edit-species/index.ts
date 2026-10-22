/** Change or retire a species. Each call parses its input and throws on anything the form would reject. */
import { retired, type Db } from "@/db/types";
import { speciesChanges } from "./types";

export * from "./types";

/** Returns the saved species, or null when it is missing, retired or not yours to change. */
export async function updateSpecies(db: Db, slug: string, input: unknown) {
  const changes = speciesChanges.parse(input);
  const { data } = await db
    .from("species")
    .update(changes)
    .eq("slug", slug)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a species; its history stays. Returns it, or null when it is missing, already retired or not yours. */
export async function retireSpecies(db: Db, slug: string) {
  const { data } = await db
    .from("species")
    .update(retired())
    .eq("slug", slug)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}
