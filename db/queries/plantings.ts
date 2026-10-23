/** Planting lines and season totals. */
import type { Db, LineDetails } from "@/db/types";
import { lines, seasonTotals } from "./views";

type LineFilter = Partial<Pick<LineDetails, "event_id" | "site" | "area" | "species" | "season" | "year">>;

/** Lines per page. Supabase returns at most 1,000 rows a request, so every unbounded read pages. */
export const PAGE_SIZE = 100;

/** One page of lines matching any mix of event, site, area, species, season and year. Page 0 is first. */
export async function findLines(db: Db, filter: LineFilter, page = 0) {
  let query = lines(db);
  for (const [column, value] of Object.entries(filter)) {
    if (value === null) query = query.is(column as keyof LineFilter, null);
    else if (value !== undefined) query = query.eq(column as keyof LineFilter, value);
  }
  const { data } = await query
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .throwOnError();
  return data;
}

/** Every season in order, with the needs-review split. */
export async function listSeasons(db: Db) {
  const { data } = await seasonTotals(db)
    .throwOnError();
  return data;
}
