/** Planting lines and season totals. */
import type { Db } from "@/db/types";
import { lines, seasonTotals } from "./views";

type LineFilter = {
  event_id?: string;
  site?: string;
  area?: string | null;
  species?: string;
  season?: string;
};
const filterColumns = {
  event_id: "planting_event_id",
  site: "event.site.slug",
  area: "event.area.slug",
  species: "species.slug",
  season: "event.season",
} as const;

/** Lines per page. Supabase returns at most 1,000 rows a request, so every unbounded read pages. */
export const PAGE_SIZE = 100;

/** One page of lines matching any mix of event, site, area, species and season. Page 0 is first. */
export async function findLines(db: Db, filter: LineFilter, page = 0) {
  let query = lines(db);
  for (const [column, value] of Object.entries(filter)) {
    const target = column === "area" && value === null ? "event.planting_area_id" : filterColumns[column as keyof LineFilter];
    if (column === "area" && typeof value === "string") query = query.not("event.area", "is", null);
    if (value === null) query = query.is(target, null);
    else if (value !== undefined) query = query.eq(target, value);
  }
  const { data } = await query
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .throwOnError();
  return data;
}

/** Recorded season labels with their totals. */
export async function listSeasons(db: Db) {
  const { data } = await seasonTotals(db)
    .throwOnError();
  return data;
}
