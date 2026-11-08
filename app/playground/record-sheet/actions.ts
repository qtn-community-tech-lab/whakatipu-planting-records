"use server";
/**
 * What a site, or one part of it, has had planted, for the record sheet's overview:
 * its most planted trees and its most recent seasons, from the place_species and
 * place_seasons views.
 */
import { listSiteSeasons, listSiteSpecies } from "@/db/queries/sites";
import { getSpeciesPhoto } from "@/lib/wrt/species-photos";
import { SLUG } from "@/lib/wrt/text";

const TREES = 5;
const SEASONS = 6;

export interface PlacePlantings {
  trees: { id: string; name: string; italic: boolean; here: number; photo: { src: string; focalPoint: string } | null }[];
  seasons: { slug: string; label: string; plants: number }[];
  /** A part with nothing recorded shows the whole site's instead. */
  wholeSite: boolean;
}

/** `parcelId` is the part's WRT number, as in the form's parts. */
export async function placePlantings(slug: string, parcelId: string | null): Promise<PlacePlantings | null> {
  // Trust boundary: server actions are public endpoints.
  if (!SLUG.test(slug) || (parcelId !== null && parcelId.length > 80)) return null;
  const read = (part: string | null) => Promise.all([listSiteSpecies(slug, part, TREES), listSiteSeasons(slug, part, SEASONS)]);
  let [species, seasons] = await read(parcelId);
  const wholeSite = !parcelId || species.length === 0;
  if (parcelId && wholeSite) [species, seasons] = await read(null);

  return {
    trees: species.map((x) => {
      const p = x.register_code ? getSpeciesPhoto(x.register_code) : undefined;
      return {
        id: x.species ?? "", name: x.common_name ?? x.scientific_name ?? "", italic: !x.common_name, here: x.plants ?? 0,
        // The 330px thumbnail is plenty for a 32px photo.
        photo: p ? { src: p.src.replace("/960px-", "/330px-"), focalPoint: p.focalPoint } : null,
      };
    }),
    seasons: seasons.map((x) => ({ slug: x.season ?? "", label: x.season_label ?? "", plants: x.plants ?? 0 })),
    wholeSite,
  };
}
