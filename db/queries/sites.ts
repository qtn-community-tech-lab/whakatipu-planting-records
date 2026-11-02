/** Sites and their areas. */
import { db } from "@/db/client";
import { areaPins, areaTotals, siteTotals } from "./views";

/** Every site with recorded plants, most first. For the sites list. */
export async function listSites() {
  const { data } = await siteTotals(await db())
    .throwOnError();
  return data;
}

/** The few most planted sites. For the home page. */
export async function topSites(limit = 5) {
  const { data } = await siteTotals(await db())
    .limit(limit)
    .throwOnError();
  return data;
}

/** Every area with its totals, or just one site's. */
export async function listAreaTotals(site?: string) {
  const query = areaTotals(await db());
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}

/** Every area with its pin, or just one site's. For the map. */
export async function listAreaPins(site?: string) {
  const query = areaPins(await db());
  const { data } = await (site ? query.eq("site", site) : query).throwOnError();
  return data;
}
