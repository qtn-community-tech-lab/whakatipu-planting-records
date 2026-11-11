"use server";
/**
 * What a site, or one part of it, has had planted, for the planting event page's overview:
 * its most planted trees and its most recent seasons, from the site_area_species and
 * site_area_seasons views.
 */
import { listSiteSeasons, listSiteSpecies } from "@/db/queries/sites";
import { listSpecies } from "@/db/queries/species";
import { SLUG } from "@/lib/wrt/text";

const TREES_SHOWN = 5;
const SEASONS_SHOWN = 6;

export interface SitePlantings {
  trees: { id: string; name: string; italic: boolean; here: number; photo: { src: string } | null }[];
  seasons: { slug: string; label: string; plants: number }[];
  /** A part with nothing recorded shows the whole site's instead. */
  wholeSite: boolean;
}

/** `parcelId` is the part's WRT number, as in the form's parts. */
export async function sitePlantings(slug: string, parcelId: string | null): Promise<SitePlantings | null> {
  // Trust boundary: server actions are public endpoints.
  if (!SLUG.test(slug) || (parcelId !== null && parcelId.length > 80)) return null;
  const read = (part: string | null) => Promise.all([listSiteSpecies(slug, part, TREES_SHOWN), listSiteSeasons(slug, part, SEASONS_SHOWN)]);
  const [register, [first, firstSeasons]] = await Promise.all([listSpecies(), read(parcelId)]);
  let [species, seasons] = [first, firstSeasons];
  const wholeSite = !parcelId || species.length === 0;
  if (parcelId && wholeSite) [species, seasons] = await read(null);

  const photos = new Map(register.map((s) => [s.slug, s.photos[0]]));
  return {
    trees: species.map((x) => {
      const p = photos.get(x.species ?? "");
      return {
        id: x.species ?? "", name: x.common_name ?? x.scientific_name ?? "", italic: !x.common_name, here: x.plants ?? 0,
        photo: p ? { src: p.src } : null,
      };
    }),
    seasons: seasons.map((x) => ({ slug: x.season ?? "", label: x.season_label ?? "", plants: x.plants ?? 0 })),
    wholeSite,
  };
}
