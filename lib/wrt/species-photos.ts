/** Reviewed Wiki references, keyed to WRT names without merging contested taxa. */
import type { SpeciesSummary } from "./queries";

export interface SpeciesPhoto {
  src: string;
  attribution: string;
  sourceUrl: string;
  licenseUrl: string;
}

/** Rank recorded quantities, including those needing review; ties use botanical names. */
export function topPlantedSpecies(rows: readonly SpeciesSummary[]) {
  return [...rows].sort((a, b) => b.split.total - a.split.total ||
    a.item.scientificName.localeCompare(b.item.scientificName));
}
