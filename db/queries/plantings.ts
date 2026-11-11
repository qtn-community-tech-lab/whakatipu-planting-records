/** Planting lines and season totals. */
import { db } from "@/db/client";
import type { Tables } from "@/db/types";
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
    .insert(lines.map((line) => ({ ...line, planting_event: plantingEvent })))
    .select("id");
}
