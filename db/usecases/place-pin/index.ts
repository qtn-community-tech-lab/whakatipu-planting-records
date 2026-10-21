/** Move a pin, set its radius, or retire it. */
import { retired, type Db } from "@/db/types";
import type { PinChanges } from "./types";

export * from "./types";

/** Returns the saved pin, or null when it is missing or not the caller's to change. */
export async function updatePin(db: Db, slug: string, changes: PinChanges) {
  const { data } = await db
    .from("site_locations")
    .update(changes)
    .eq("slug", slug)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a pin. Nothing is ever deleted. */
export async function retirePin(db: Db, slug: string) {
  await db
    .from("site_locations")
    .update(retired())
    .eq("slug", slug)
    .throwOnError();
}
