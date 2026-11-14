"use server";
/**
 * What a site, or one part of it, has had planted, for the planting event page's overview:
 * its most planted trees and its most recent seasons, from the site_area_species and
 * site_area_seasons views.
 */
import { listPlantingAreaSeasons, listSiteSeasons, listSiteSpecies } from "@/db/queries/sites";
import { listSpecies } from "@/db/queries/species";
import { SLUG } from "@/lib/wrt/text";

const TREES_SHOWN = 5;
const SEASONS_SHOWN = 6;

export interface SitePlantings {
  trees: { id: string; name: string; italic: boolean; here: number; photo: { src: string } | null }[];
  /** `parts`: how many of the site's parts had plants that season (the whole site's seasons only; 1 for a part's). */
  seasons: { slug: string; label: string; plants: number; parts: number }[];
  /** A part with nothing recorded shows the whole site's instead. */
  wholeSite: boolean;
}

// Trust boundary: server actions are public endpoints.
const valid = (slug: string, partId: string | null) => SLUG.test(slug) && (partId === null || partId.length <= 80);
const toSeason = (x: { season: string | null; season_label: string | null; plants: number | null }, parts?: Map<string, number>) =>
  ({ slug: x.season ?? "", label: x.season_label ?? "", plants: x.plants ?? 0, parts: parts?.get(x.season ?? "") ?? 1 });

/** How many of a site's parts had plants in each season, by season slug. */
async function partsPerSeason(slug: string) {
  const out = new Map<string, number>();
  for (const x of await listPlantingAreaSeasons(slug)) if (x.season) out.set(x.season, (out.get(x.season) ?? 0) + 1);
  return out;
}

/** `partId` is the part's WRT number, as in the form's parts. */
export async function loadSiteOverview(slug: string, partId: string | null): Promise<SitePlantings | null> {
  if (!valid(slug, partId)) return null;
  const read = (part: string | null) => Promise.all([listSiteSpecies(slug, part, TREES_SHOWN), listSiteSeasons(slug, part, SEASONS_SHOWN)]);
  const [register, [first, firstSeasons], parts] = await Promise.all([listSpecies(), read(partId), partsPerSeason(slug)]);
  let [species, seasons] = [first, firstSeasons];
  const wholeSite = !partId || species.length === 0;
  if (partId && wholeSite) [species, seasons] = await read(null);

  const photos = new Map(register.map((s) => [s.slug, s.photos[0]]));
  return {
    trees: species.map((x) => {
      const p = photos.get(x.species ?? "");
      return {
        id: x.species ?? "", name: x.common_name ?? x.scientific_name ?? "", italic: !x.common_name, here: x.plants ?? 0,
        photo: p ? { src: p.src } : null,
      };
    }),
    seasons: seasons.map((x) => toSeason(x, wholeSite ? parts : undefined)),
    wholeSite,
  };
}

