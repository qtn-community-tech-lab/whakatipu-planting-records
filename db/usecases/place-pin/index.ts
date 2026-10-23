/** Move a pin, set its radius, or retire it. Each call parses its input and throws on anything the form would reject. */
import { retired, type Db } from "@/db/types";
import { domainId, type DomainId } from "@/db/ids";
import { pinChanges } from "./types";

export * from "./types";

/** Returns the saved pin, or null when it is missing, retired or not yours to change. */
export async function updatePin(db: Db, id: DomainId, input: unknown) {
  id = domainId.parse(id);
  const changes = pinChanges.parse(input);
  const { data } = await db
    .from("locations")
    .update(changes)
    .eq("id", id)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Retire a pin. Returns it, or null when it is missing, already retired or not yours. */
export async function retirePin(db: Db, id: DomainId) {
  id = domainId.parse(id);
  const { data } = await db
    .from("locations")
    .update(retired())
    .eq("id", id)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}
