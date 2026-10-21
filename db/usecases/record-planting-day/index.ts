/**
 * Record a planting day. The event and its lines land together through the one
 * database function, save_planting_day. Every later change is one line at a time.
 */
import { retired, type Db } from "@/db/types";
import type { PlantingDay, PlantingLine } from "./types";

export * from "./types";

/** Returns the new event's id. */
export async function savePlantingDay(db: Db, day: PlantingDay) {
  const { data } = await db
    .rpc("save_planting_day", { day })
    .throwOnError();
  return data;
}

/** Add one species to a day already saved. */
export async function addLine(db: Db, eventId: number, line: PlantingLine) {
  const { data } = await db
    .from("planting_lines")
    .insert({ event_id: eventId, ...line })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

/** Correct a count. Null means not counted yet, never 0. */
export async function setQuantity(db: Db, lineId: number, quantity: PlantingLine["quantity"]) {
  await db
    .from("planting_lines")
    .update({ quantity })
    .eq("id", lineId)
    .throwOnError();
}

/** Take a species off a day. The line is retired, not deleted. */
export async function retireLine(db: Db, lineId: number) {
  await db
    .from("planting_lines")
    .update(retired())
    .eq("id", lineId)
    .throwOnError();
}
