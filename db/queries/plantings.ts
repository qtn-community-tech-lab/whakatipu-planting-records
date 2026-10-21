/**
 * Planting events and their lines. Reads come from the line_details view, one flat row
 * per species. Saving a new planting day is the one database function, because an
 * event and its lines must land together. Every later edit is one line at a time.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantingDayForm } from "../zod";

/** Lines matching any mix of site, area, species, season and year, oldest season first. */
export async function findLines(
  supabase: SupabaseClient,
  filter: { site?: string; area?: string; species?: string; season?: string; year?: number },
) {
  let query = supabase
    .from("line_details")
    .select("line_id, event_id, season_label, site_name, area_name, maori_name, scientific_name, quantity, needs_review, legacy_code");
  for (const [column, value] of Object.entries(filter)) {
    if (value !== undefined) query = query.eq(column, value);
  }
  const { data } = await query.order("season_order").order("area_name").throwOnError();
  return data;
}

/** One planting event: every line in it, one row per species. */
export async function eventLines(supabase: SupabaseClient, eventId: number) {
  const { data } = await supabase
    .from("line_details")
    .select("line_id, season_label, planting_date, site_name, area_name, maori_name, scientific_name, quantity, needs_review")
    .eq("event_id", eventId)
    .order("scientific_name")
    .throwOnError();
  return data;
}

/** Totals by season, with the needs-review split. */
export async function seasonTotals(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("totals_by_season")
    .select("season, season_label, plants, plants_resolved, plants_needs_review, sites, species")
    .order("season_order")
    .throwOnError();
  return data;
}

/** Record a planting day: the event and all its lines, in one go. Returns the new event's id. */
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

/** Add one species to an event that already exists. */
export async function addLine(supabase: SupabaseClient, eventId: number, speciesId: number, quantity: number | null) {
  const { data } = await supabase
    .from("planting_lines")
    .insert({ event_id: eventId, species_id: speciesId, quantity })
    .select("id")
    .single()
    .throwOnError();
  return data.id as number;
}

/** Correct a count. Null means not counted yet, never 0. */
export async function setQuantity(supabase: SupabaseClient, lineId: number, quantity: number | null) {
  await supabase.from("planting_lines").update({ quantity }).eq("id", lineId).throwOnError();
}

/** Take a species off an event. The line is retired, not deleted. */
export async function retireLine(supabase: SupabaseClient, lineId: number) {
  await supabase
    .from("planting_lines")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", lineId)
    .throwOnError();
}
