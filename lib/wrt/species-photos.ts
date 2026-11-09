/** Reviewed Wiki references, keyed to WRT names without merging contested taxa. */
import type { SpeciesSummary } from "./queries";

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
  articleLabel?: string;
  retrievedAt: string;
}

/** Rank recorded quantities, including those needing review; ties use botanical names. */
export function topPlantedSpecies(rows: readonly SpeciesSummary[]) {
  return [...rows].sort((a, b) => b.split.total - a.split.total ||
    a.item.scientificName.localeCompare(b.item.scientificName));
}
