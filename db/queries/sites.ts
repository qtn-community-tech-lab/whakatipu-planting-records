/** Sites and their areas. */
import { db } from "@/db/client";
import { areaPins, areaTotals, siteTotals } from "./views";
import type { CreateSiteInput, EditSiteInput, CreatePlantingAreaInput, EditPlantingAreaInput } from "@/db/types";

/** The active register, including sites without planting history. */
export async function listSites() {
  const { data } = await (await db())
    .from("sites")
    .select("slug, name, is_scheme")
    .is("deactivated_at", null)
    .order("name")
    .throwOnError();
  return data;
}

export async function readSite(slug: string) {
  const { data } = await (await db())
    .from("sites")
    .select("slug, name, description, is_scheme, updated_at")
    .eq("slug", slug)
    .is("deactivated_at", null)
    .maybeSingle()
    .throwOnError();
  return data;
}

export async function createSite(values: CreateSiteInput) {
  return (await db())
    .from("sites")
    .insert({ slug: values.slug, name: values.name, description: values.description })
    .select("slug")
    .single();
}

export async function updateSite(slug: string, values: EditSiteInput) {
  return (await db())
    .from("sites")
    .update({ name: values.name, description: values.description })
    .eq("slug", slug)
    .select("slug")
    .single();
}

/** The complete active area register, including areas awaiting their first planting. */
export async function listPlantingAreas(site: string) {
  const { data } = await (await db())
    .from("areas")
    .select("slug, site, name, description, updated_at")
    .eq("site", site)
    .is("deactivated_at", null)
    .order("name")
    .throwOnError();
  return data;
}

export async function readPlantingArea(site: string, slug: string) {
  const { data } = await (await db())
    .from("areas")
    .select("slug, site, name, description, updated_at")
    .eq("site", site)
    .eq("slug", slug)
    .is("deactivated_at", null)
    .maybeSingle()
    .throwOnError();
  return data;
}

export async function createPlantingArea(site: string, values: CreatePlantingAreaInput) {
  return (await db())
    .from("areas")
    .insert({ slug: values.slug, name: values.name, description: values.description, site })
    .select("slug")
    .single();
}

export async function updatePlantingArea(site: string, slug: string, values: EditPlantingAreaInput) {
  return (await db())
    .from("areas")
    .update({ name: values.name, description: values.description })
    .eq("site", site)
    .eq("slug", slug)
    .select("slug")
    .single();
}

/** Every site with recorded plants, most first, or just the `limit` most planted. */
export async function listSiteTotals(limit?: number) {
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
