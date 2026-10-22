/** Move a pin, set its radius, or retire it. Each call parses its input and throws on anything the form would reject. */
import { retired, type Db } from "@/db/types";
import { pinChanges } from "./types";

export * from "./types";

/** Returns the saved pin, or null when it is missing, retired or not yours to change. */
export async function updatePin(db: Db, slug: string, input: unknown) {
  const changes = pinChanges.parse(input);
  const { data } = await db
    .from("site_locations")
    .update(changes)
    .eq("slug", slug)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a pin. Returns it, or null when it is missing, already retired or not yours. */
export async function retirePin(db: Db, slug: string) {
  const { data } = await db
    .from("site_locations")
    .update(retired())
    .eq("slug", slug)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}
