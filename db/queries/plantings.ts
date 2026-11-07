/** Planting lines and season totals. */
import { db } from "@/db/client";
import type { Tables } from "@/db/types";
import { lines, PAGE_SIZE, seasonTotals } from "./views";

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

/** Every season in planting order, with the needs-review split and the workbook's TOTAL cell. */
export async function listSeasons() {
  const { data } = await seasonTotals(await db())
    .throwOnError();
  return data;
}
