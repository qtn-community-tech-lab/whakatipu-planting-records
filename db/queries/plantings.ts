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
export async function listSeasonLines(season: string) {
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
