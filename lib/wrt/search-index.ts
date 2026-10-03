/**
 * Compact, client-safe search index for the global search box.
 * Built on the server from the query layer; matched in the browser with
 * matchScore (macron- and typo-tolerant). Contains names only, never IDs.
 */
export interface SearchIndex {
  places: { slug: string; name: string; keys: string[]; total: number; isScheme: boolean }[];
  species: { slug: string; name: string; scientific: string; isScientific: boolean; keys: string[]; total: number }[];
  seasons: { slug: string; label: string; year: number; total: number }[];
}
