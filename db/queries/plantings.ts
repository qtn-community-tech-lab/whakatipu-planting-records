/**
 * Planting events and their lines, read from the line_details view, one flat row
 * per species. Recording and correcting a day: db/usecases/record-planting-day.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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

