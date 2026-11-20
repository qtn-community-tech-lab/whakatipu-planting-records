import "server-only";
import { cache } from "react";
import { buildSearchIndex } from "./build-search-index";
import { getWrt } from "./server";
import { formatNumber } from "./text";

export const readLayoutData = cache(async () => {
  const wrt = getWrt();
  const [overview, index] = await Promise.all([wrt.overview(), buildSearchIndex(wrt)]);
  const range = overview.firstSeason && overview.lastSeason
    ? `${overview.firstSeason.label} → ${overview.lastSeason.label}` : "No planting history yet";
  const counts = {
    sites: formatNumber(overview.siteCount),
    species: formatNumber(overview.speciesCount),
    seasons: formatNumber(overview.seasons.length),
    records: formatNumber(overview.split.records),
  };
  const rings = overview.seasons.map((p) => ({
    slug: p.season.slug,
    label: p.season.label,
    autumn: p.season.name === "Autumn",
    total: p.split.total,
  }));
  return { counts, rings, range, index };
});
