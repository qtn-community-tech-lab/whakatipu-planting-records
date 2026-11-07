/** Sites and their areas. */
import type { Db } from "@/db/types";
import { areas, siteTotals } from "./views";

/** Every site with recorded plants, most first. Pass a limit for the few most planted, as on the home page. */
export async function listSites(db: Db, limit?: number) {
  const query = siteTotals(db);
  const { data } = await (limit ? query.limit(limit) : query).throwOnError();
  return data;
}

/** Every area with its pin, or just one site's. For the map. */
export async function listPlantingAreas(db: Db, site?: string) {
  const query = areas(db);
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}
