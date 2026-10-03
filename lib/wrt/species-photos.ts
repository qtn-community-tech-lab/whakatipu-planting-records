/** Reviewed Wiki references, keyed to WRT names without merging contested taxa. */
import catalogue from "@/data/species-photos.json";
import type { SpeciesSummary } from "./queries";
import { SPECIES_PROFILE_LIMIT } from "./species-profiles";

export interface SpeciesPhoto {
  speciesId: string;
  scientificName: string;
  sourceName: "Wikimedia Commons" | "iNaturalist";
  observationUrl?: string;
  src: string;
  width: number;
  height: number;
  caption: string;
  focalPoint: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  articleUrl: string;
  retrievedAt: string;
}

export const speciesPhotos = catalogue as readonly SpeciesPhoto[];
const byId = new Map<string, SpeciesPhoto[]>();
for (const photo of speciesPhotos) {
  const set = byId.get(photo.speciesId) ?? [];
  set.push(photo);
  byId.set(photo.speciesId, set);
}
export const getSpeciesPhotos = (speciesId: string): readonly SpeciesPhoto[] => byId.get(speciesId) ?? [];
export const getSpeciesPhoto = (speciesId: string) => getSpeciesPhotos(speciesId)[0];

/** Rank recorded quantities, including those needing review; ties use botanical names. */
export function topPlantedSpecies(rows: readonly SpeciesSummary[], limit = SPECIES_PROFILE_LIMIT) {
  return [...rows].sort((a, b) => b.split.total - a.split.total ||
    a.item.scientificName.localeCompare(b.item.scientificName)).slice(0, limit);
}
