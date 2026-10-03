import "server-only";
import { getWrt } from "./server";
import type { SearchIndex } from "./search-index";

export async function buildSearchIndex(): Promise<SearchIndex> {
  const wrt = getWrt();
  const [places, species, seasons] = await Promise.all([wrt.places(), wrt.speciesList(), wrt.seasons()]);
  return {
    places: places.map((p) => ({
      slug: p.item.slug, name: p.item.name, keys: p.item.searchKeys, total: p.split.total, isScheme: p.item.isScheme,
    })),
    species: species.map((s) => ({
      slug: s.item.slug, name: s.item.displayName, scientific: s.item.scientificName,
      isScientific: s.item.displayIsScientific, keys: s.item.searchKeys, total: s.split.total,
    })),
    seasons: seasons.filter((s) => s.split.records).map((s) => ({
      slug: s.season.slug, label: s.season.label, year: s.season.year, total: s.split.total,
    })),
  };
}
