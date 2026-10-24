import type { Overview } from "./queries";
import type { SearchIndex } from "./search-index";

/** The layout already has these catalogue totals; no second database read. */
export function buildSearchIndex(overview: Overview): SearchIndex {
  return {
    places: overview.places.map(({ item: p, split }) => ({ slug: p.slug, name: p.name, keys: p.searchKeys, total: split.total, isScheme: p.isScheme })),
    species: overview.species.map(({ item: s, split }) => ({ slug: s.slug, name: s.displayName, scientific: s.scientificName, isScientific: s.displayIsScientific, keys: s.searchKeys, total: split.total })),
    seasons: overview.seasons.map(({ season: s, split }) => ({ slug: s.slug, label: s.label, total: split.total })),
  };
}
