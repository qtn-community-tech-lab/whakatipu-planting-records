/** Planting events and their lines, read from the line_details view: one flat row per species. */
import type { Db, LineDetails } from "@/db/types";

type LineFilter = Partial<Pick<LineDetails, "event_id" | "site" | "area" | "species" | "season" | "year">>;

/** Lines matching any mix of event, site, area, species, season and year, oldest season first. */
export async function findLines(supabase: Db, filter: LineFilter) {
  let query = supabase
    .from("line_details")
    .select("line_id, event_id, season_label, planting_date, site_name, area_name, maori_name, scientific_name, quantity, needs_review, legacy_code");
  for (const [column, value] of Object.entries(filter)) {
    if (value !== undefined) query = query.eq(column as keyof LineFilter, value);
  }
  const { data } = await query.order("season_order").order("area_name").order("scientific_name").throwOnError();
  return data;
}

/** Totals by season, with the needs-review split. */
export async function seasonTotals(supabase: Db) {
  const { data } = await supabase
    .from("totals_by_season")
    .select("season, season_label, plants, plants_resolved, plants_needs_review, sites, species")
    .order("season_order")
    .throwOnError();
  return data;
}
