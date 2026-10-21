/** Sites and their areas. */
import type { Db } from "@/db/types";
import { areas, siteTotals } from "./views";

/** Every site with recorded plants, most first. For the sites list. */
export async function listSites(db: Db) {
  const { data } = await siteTotals(db)
    .throwOnError();
  return data;
}

/** The few most planted sites. For the home page. */
export async function topSites(db: Db, limit = 5) {
  const { data } = await siteTotals(db)
    .limit(limit)
    .throwOnError();
  return data;
}

/** Every area with its pin, or just one site's. For the map. */
export async function listAreas(db: Db, site?: string) {
  const query = areas(db);
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}
