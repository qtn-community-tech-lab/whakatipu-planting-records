/** Reference information is separate from WRT's historical names and quantities. */
export interface SpeciesProfile {
  speciesId: string;
  scientificName: string;
  commonName: string | null;
  maoriNames: string[];
  nameNote?: string;
  summary: string;
  lookFor: string;
  sources: { label: string; url: string }[];
  checkedAt: string;
}
