/** Sites and their areas. */
import { db } from "@/db/client";
import { areaPins, areaTotals, siteTotals } from "./views";

/** Every site with recorded plants, most first, or just the `limit` most planted. */
export async function listSites(limit?: number) {
  const query = siteTotals(await db());
  const { data } = await (limit === undefined ? query : query.limit(limit)).throwOnError();
  return data;
}

/** Every area with its totals, or just one site's. */
export async function listPlantingAreaTotals(site?: string) {
  const query = areaTotals(await db());
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}

/** Every area with its pin, or just one site's. For the map. */
export async function listPlantingAreaPins(site?: string) {
  const query = areaPins(await db());
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}
