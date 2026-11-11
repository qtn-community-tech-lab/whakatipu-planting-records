/** Sites and their areas. */
import { db } from "@/db/client";
import { areaPins, areaTotals, siteAreaSeasons, siteAreaSpecies, siteTotals } from "./views";
import type { CreateSiteInput, EditSiteInput } from "@/db/types";

/** The register by lifecycle state, including sites without planting history. */
export async function listSites(state: "active" | "deactivated" = "active") {
  const query = (await db())
    .from("sites")
    .select("slug, name, is_scheme")
    .order("name");
  const { data } = await (
    state === "deactivated"
      ? query.not("deactivated_at", "is", null)
      : query.is("deactivated_at", null)
  ).throwOnError();
  return data;
}

export async function readSite(slug: string) {
  const { data } = await (await db())
    .from("sites")
    .select("slug, name, description, is_scheme, updated_at, deactivated_at")
    .eq("slug", slug)
    .maybeSingle()
    .throwOnError();
  return data;
}

export async function createSite(values: CreateSiteInput) {
  return (await db()).from("sites").insert(values).select("slug").single();
}

export async function updateSite(slug: string, values: EditSiteInput) {
  return (await db())
    .from("sites")
    .update(values)
    .eq("slug", slug)
    .select("slug")
    .single();
}

/** Every site with recorded plants, most first, or just the `limit` most planted. */
export async function listSiteTotals(limit?: number) {
  const query = siteTotals(await db());
  const { data } = await (
    limit === undefined ? query : query.limit(limit)
  ).throwOnError();
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

/** Preserve the site key and every historical association. */
export async function deactivateSite(slug: string) {
  return (await db())
    .from("sites")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("slug")
    .single();
}

/** A site's `limit` most planted species, or one area's (by WRT number). */
export async function listSiteSpecies(site: string, wrtNumber: string | null, limit: number) {
  const query = siteAreaSpecies(await db())
    .eq("site", site)
    .lte("rank", limit);
  const { data } = await (wrtNumber ? query.eq("wrt_number", wrtNumber) : query.is("area", null)).throwOnError();
  return data;
}

/** A site's `limit` most recent seasons with plants, or one area's (by WRT number), newest first. */
export async function listSiteSeasons(site: string, wrtNumber: string | null, limit: number) {
  const query = siteAreaSeasons(await db())
    .eq("site", site)
    .gt("plants", 0)
    .limit(limit);
  const { data } = await (wrtNumber ? query.eq("wrt_number", wrtNumber) : query.is("area", null)).throwOnError();
  return data;
}

/** Each of a site's areas with plants in a season: a row per area and season, for counting the sites planted each season. */
export async function listPlantedAreasBySeason(site: string) {
  const { data } = await siteAreaSeasons(await db())
    .eq("site", site)
    .not("area", "is", null)
    .gt("plants", 0)
    .throwOnError();
  return data;
}

/** A site's active areas, by name: to list and edit them, and (by WRT number) to save a planting event against one. */
export async function listPlantingAreas(site: string) {
  const { data } = await (await db())
    .from("areas")
    .select("slug, site, name, description, updated_at, wrt_number")
    .eq("site", site)
    .is("deactivated_at", null)
    .order("name")
    .throwOnError();
  return data;
}
