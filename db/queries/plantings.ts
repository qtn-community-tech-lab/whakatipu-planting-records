/** Planting lines and season totals. */
import { db } from "@/db/client";
import type { Tables, PlantingEventEdit } from "@/db/types";
import { lines, PAGE_SIZE, seasonSites, seasonSpecies, seasonTotals } from "./views";

export { PAGE_SIZE };

type LineFilter = Partial<Pick<Tables<"line_details">, "planting_id" | "site" | "area" | "species" | "season" | "year">>;

/** One page of lines matching any mix of planting, site, area, species, season and year. Page 0 is first. */
export async function findPlantingLines(filter: LineFilter, page = 0) {
  let query = lines(await db());
  for (const [column, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null) query = query.eq(column as keyof LineFilter, value);
  }
  const { data } = await query
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .throwOnError();
  return data;
}

/** Every line in one season, in one request: the largest season has 410. */
export async function listSeasonPlantingLines(season: string) {
  const { data } = await lines(await db())
    .eq("season", season)
    .throwOnError();
  return data;
}

/** A site's lines in one season, or one area's (by WRT number), area by area and most planted first. */
export async function listSiteSeasonPlantingLines(site: string, season: string, wrtNumber: string | null) {
  const query = (await db())
    .from("line_details")
    .select("line_id, planting_id, area_name, wrt_number, planted_on, source, species, register_code, scientific_name, common_name, maori_name, quantity")
    .eq("site", site)
    .eq("season", season);
  const { data } = await (wrtNumber ? query.or(`wrt_number.eq.${JSON.stringify(wrtNumber)},area.eq.${JSON.stringify(wrtNumber)}`) : query)
    .order("area_name")
    .order("quantity", { ascending: false })
    .throwOnError();
  return data;
}

/** Event details for the season reader/editor; line_details' notes are line review notes. */
export async function listPlantingEvents(ids: number[]) {
  const { data } = await (await db())
    .from("planting_events")
    .select("id, notes, type, updated_at, deactivated_at, areas(slug, site, sites(name))")
    .in("id", ids)
    .throwOnError();
  return data;
}

/** Active locations for corrections; retained historical locations come from the event. */
export async function listPlantingEventLocations() {
  const { data } = await (await db())
    .from("sites")
    .select("slug, name, areas(slug, name, deactivated_at)")
    .is("deactivated_at", null)
    .order("name")
    .throwOnError();
  return data.map((site) => ({ ...site, areas: site.areas.filter((area) => !area.deactivated_at) }));
}

/** Every season in planting order, with the needs-review split and the workbook's TOTAL cell. */
export async function listSeasons() {
  const { data } = await seasonTotals(await db())
    .throwOnError();
  return data;
}

/** The most planted species and sites in every season, `limit` of each. */
export async function listSeasonLeaders(limit = 3) {
  const client = await db();
  const [species, sites] = await Promise.all([
    seasonSpecies(client)
      .lte("rank", limit)
      .throwOnError(),
    seasonSites(client)
      .lte("rank", limit)
      .throwOnError(),
  ]);
  return { species: species.data, sites: sites.data };
}

/** A season's id by slug, e.g. "autumn-2026". Null when there is no such season. */
export async function readSeason(slug: string) {
  const { data } = await (await db())
    .from("seasons")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
    .throwOnError();
  return data;
}

/** A new planting event. Its plants are added with createPlantingLines. */
export async function createPlantingEvent(values: { area: string; season: number; planted_on: string; notes: string }) {
  return (await db())
    .from("planting_events")
    .insert(values)
    .select("id")
    .single();
}

/** All of one planting event's lines in one insert, so they are saved together or not at all. */
export async function createPlantingLines(plantingEvent: number, lines: { species: string; quantity: number }[]) {
  return (await db())
    .from("planting_lines")
    .insert(lines.map((line) => ({ ...line, planting_event: plantingEvent })));
}

/** A planting event's season slug (e.g. "autumn-2021") and stored date, to check an edited date against. Null when there is no such event. */
export async function readPlantingEventSeason(id: number) {
  const { data } = await (await db())
    .from("planting_events")
    .select("planted_on, seasons(slug)")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data?.seasons?.slug ? { season: data.seasons.slug, plantedOn: data.planted_on } : null;
}

/** A planting event's active lines: each one's id, species slug and quantity. */
export async function listPlantingEventLines(plantingEvent: number) {
  const { data } = await (await db())
    .from("planting_lines")
    .select("id, species, quantity, species_info:species(scientific_name, common_name, maori_name, register_code)")
    .eq("planting_event", plantingEvent)
    .is("deactivated_at", null)
    .throwOnError();
  return data;
}

/** Replace an event's writable values and lines atomically, under the caller's RLS. */
export async function updatePlantingEvent(id: number, values: PlantingEventEdit) {
  // Generated RPC argument types omit SQL nullability. Assertions preserve the
  // validated nulls sent to PostgreSQL for unknown/optional fields.
  return (await db())
    .rpc("update_planting_event", {
      event_id: id,
      site_slug: values.site,
      area_slug: values.area!,
      planted_on: values.plantedOn!,
      planting_type: values.type!,
      notes: values.notes,
      lines: values.lines,
    })
    .single();
}

/** Exclude the whole event from counted history, preserving every stored line. */
export async function deactivatePlantingEvent(id: number) {
  return (await db())
    .from("planting_events")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
}

/** One line's quantity, only within its own planting event. */
export async function updatePlantingLine(plantingEvent: number, id: number, values: { quantity: number }) {
  return (await db())
    .from("planting_lines")
    .update(values)
    .eq("id", id)
    .eq("planting_event", plantingEvent)
    .select("id")
    .single();
}

/** Deactivate lines taken off a planting event, only within that event. */
export async function deactivatePlantingLines(plantingEvent: number, ids: number[]) {
  return (await db())
    .from("planting_lines")
    .update({ deactivated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("planting_event", plantingEvent);
}

/** Resolve a planting event's location and season for a deep link. */
export async function readPlantingEvent(id: number) {
  const { data } = await (await db())
    .from("planting_events")
    .select("id, updated_at, deactivated_at, planted_on, source, areas(slug, site, name, wrt_number), seasons(slug, label)")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data;
}
