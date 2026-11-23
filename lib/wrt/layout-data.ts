import "server-only";
import { cache } from "react";
import { readLayoutSummary } from "@/db/queries/layout";
import type { SearchIndex } from "./search-index";
import { formatNumber, searchKey } from "./text";

const keys = (terms: (string | null)[]) => [
  ...new Set(terms.map((term) => searchKey(term ?? "")).filter(Boolean)),
];

export const readLayoutData = cache(async () => {
  const summary = await readLayoutSummary();
  const first = summary.seasons[0];
  const last = summary.seasons.at(-1);
  const range =
    first && last
      ? `${first.label} → ${last.label}`
      : "No planting history yet";
  const counts = {
    sites: formatNumber(summary.siteCount),
    species: formatNumber(summary.speciesCount),
    seasons: formatNumber(summary.seasons.length),
    records: formatNumber(summary.records),
  };
  const rings = summary.seasons.map((season) => ({
    slug: season.slug,
    label: season.label,
    autumn: season.half === "autumn",
    total: season.total,
  }));
  const index: SearchIndex = {
    places: summary.places
      .map((place) => ({
        slug: place.slug,
        name: place.name,
        keys: keys([place.name, ...place.terms]),
        total: place.total,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    species: summary.species
      .map((species) => {
        const name =
          species.maoriName ?? species.commonName ?? species.scientificName;
        return {
          slug: species.slug,
          name,
          scientific: species.scientificName,
          isScientific: name === species.scientificName,
          keys: keys([
            species.scientificName,
            species.suggestedSpelling,
            species.commonName,
            species.maoriName,
            ...species.terms,
          ]),
          total: species.total,
        };
      })
      .sort(
        (a, b) => b.total - a.total || a.scientific.localeCompare(b.scientific),
      ),
    seasons: summary.seasons
      .filter((season) => season.records > 0)
      .map((season) => ({
        slug: season.slug,
        label: season.label,
        year: season.year,
        total: season.total,
      })),
  };
  return { counts, rings, range, index };
});
