import catalogue from "@/data/species-profiles.json";

/** Reference information is separate from WRT's historical names and quantities. */
export interface SpeciesProfile {
  speciesId: string;
  scientificName: string;
  commonName: string;
  maoriNames: string[];
  nameNote?: string;
  summary: string;
  lookFor: string;
  sources: { label: string; url: string }[];
  checkedAt: string;
}

export const speciesProfiles: readonly SpeciesProfile[] = catalogue;
const byId = new Map(speciesProfiles.map((profile) => [profile.speciesId, profile]));
export const getSpeciesProfile = (speciesId: string) => byId.get(speciesId);
