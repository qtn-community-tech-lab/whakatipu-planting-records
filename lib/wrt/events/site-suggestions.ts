/**
 * The species most planted at each site, for the map view's step 2: each
 * with its all-time recorded plants there and a reference photo.
 *
 * Uses getWrtAll(), like eventFormOptions: what was planted at a site should
 * not depend on the reader's "show records needing review" switch.
 */
import "server-only";
import { speciesBySite } from "../queries";
import { getWrtAll } from "../server";
import { getSpeciesPhoto } from "../species-photos";

export interface SpeciesSuggestion {
  /** Matches SpeciesOption.id in the form options. */
  speciesId: string;
  /** All-time recorded plants of this species at the site. */
  here: number;
  /** Names for the picker's rows: common, Māori and scientific (with macrons). */
  common: string | null;
  maori: string | null;
  scientific: string;
  photo: { src: string; focalPoint: string; credit: string } | null;
}

/** Every site's most planted species, by site slug: one query, so switching sites in the form is instant. */
export async function siteSpeciesSuggestions(limit = 12): Promise<Record<string, SpeciesSuggestion[]>> {
  const { rows } = await getWrtAll().records({});
  return Object.fromEntries([...speciesBySite(rows)].map(([slug, site]) => [slug, [...site.species.values()]
    .sort((a, b) => b.split.total - a.split.total)
    .slice(0, limit)
    .map(({ species, split }) => {
      const p = getSpeciesPhoto(species.id);
      return {
        speciesId: species.id,
        here: split.total,
        common: species.commonName,
        maori: species.maoriName,
        scientific: species.scientificName,
        // The 330px thumbnail is plenty for a 44px photo.
        photo: p ? { src: p.src.replace("/960px-", "/330px-"), focalPoint: p.focalPoint, credit: `Photo: ${p.author} · ${p.license}` } : null,
      };
    })]));
}
