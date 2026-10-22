/**
 * Record a planting day. The event and its lines land together through the one
 * database function, save_planting_day. Every later change is one line at a time.
 * Each call parses its input and throws on anything the form would reject.
 */
import { retired, type Db } from "@/db/types";
import { plantingDay, plantingLine } from "./types";

export * from "./types";

/** Returns the new event's id. */
export async function savePlantingDay(db: Db, input: unknown) {
  const day = plantingDay.parse(input);
  const { data } = await db
    .rpc("save_planting_day", { day })
    .throwOnError();
  return data;
}

/** Add one species to a day already saved. Returns the new line. */
export async function addLine(db: Db, eventId: number, input: unknown) {
  const line = plantingLine.parse(input);
  const { data } = await db
    .from("planting_lines")
    .insert({ event_id: eventId, ...line })
    .select()
    .single()
    .throwOnError();
  return data;
}

/** Correct a count. Null means not counted yet, never 0. Returns the line, or null when it is missing, retired or not yours. */
export async function setQuantity(db: Db, lineId: number, input: unknown) {
  const quantity = plantingLine.shape.quantity.parse(input);
  const { data } = await db
    .from("planting_lines")
    .update({ quantity })
    .eq("id", lineId)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Take a species off a day. Returns the line, or null when it is missing, already retired or not yours. */
export async function retireLine(db: Db, lineId: number) {
  const { data } = await db
    .from("planting_lines")
    .update(retired())
    .eq("id", lineId)
    .is("deactivated_at", null)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}
