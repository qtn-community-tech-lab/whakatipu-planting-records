/** Sites and their areas. */
import { db } from "@/db/client";
import { areaPins, areaTotals, placeSeasons, placeSpecies, siteTotals } from "./views";

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

/** A site's `limit` most planted species, or one area's (by WRT number). */
export async function listSiteSpecies(site: string, wrtNumber: string | null, limit: number) {
  const query = placeSpecies(await db())
    .eq("site", site)
    .lte("rank", limit);
  const { data } = await (wrtNumber ? query.eq("wrt_number", wrtNumber) : query.is("area", null)).throwOnError();
  return data;
}

/** A site's `limit` most recent seasons with plants, or one area's (by WRT number), newest first. */
export async function listSiteSeasons(site: string, wrtNumber: string | null, limit: number) {
  const query = placeSeasons(await db())
    .eq("site", site)
    .gt("plants", 0)
    .limit(limit);
  const { data } = await (wrtNumber ? query.eq("wrt_number", wrtNumber) : query.is("area", null)).throwOnError();
  return data;
}
