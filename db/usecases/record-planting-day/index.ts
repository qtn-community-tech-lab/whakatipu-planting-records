/**
 * Record a planting day. The event and its lines are saved together by the one
 * database function, save_planting_day. Every later change is one line at a time.
 * The form shape and its checks: types.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantingDayForm, PlantingLine } from "./types";

export { plantingDayForm, type PlantingDayForm, type PlantingLine } from "./types";

/** Returns the new event's id. */
export async function savePlantingDay(supabase: SupabaseClient, day: PlantingDayForm) {
  const { data } = await supabase
    .rpc("save_planting_day", {
      p_site_area_id: day.siteAreaId,
      p_season_id: day.seasonId,
      p_planting_date: day.plantingDate,
      p_event_type: day.eventType ?? null,
      p_notes: day.notes ?? "",
      p_is_public: day.isPublic ?? false,
      p_lines: day.lines.map((l) => ({ species_id: l.speciesId, quantity: l.quantity })),
    })
    .throwOnError();
  return data as number;
}

/** Add one species to a day already saved. */
export async function addLine(supabase: SupabaseClient, eventId: number, line: PlantingLine) {
  const { data } = await supabase
    .from("planting_lines")
    .insert({ event_id: eventId, species_id: line.speciesId, quantity: line.quantity })
    .select("id")
    .single()
    .throwOnError();
  return data.id as number;
}

/** Correct a count. Null means not counted yet, never 0. */
export async function setQuantity(supabase: SupabaseClient, lineId: number, quantity: PlantingLine["quantity"]) {
  await supabase.from("planting_lines").update({ quantity }).eq("id", lineId).throwOnError();
}

/** Take a species off a day. The line is retired, not deleted. */
export async function retireLine(supabase: SupabaseClient, lineId: number) {
  await supabase
    .from("planting_lines")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", lineId)
    .throwOnError();
}
