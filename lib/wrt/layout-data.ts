import "server-only";
import { unstable_cache } from "next/cache";
import { SUPABASE_TAG } from "@/db/cache";
import { SupabaseWrtRepository } from "@/db/repository";
import { buildSearchIndex } from "./build-search-index";
import { createQueries } from "./queries";
import { confirmedOnly } from "./review-scope";
import { formatNumber } from "./text";

export const readLayoutData = unstable_cache(async (showReview: boolean) => {
  const repo = new SupabaseWrtRepository();
  const wrt = createQueries(showReview ? repo : confirmedOnly(repo));
  const [overview, index] = await Promise.all([wrt.overview(), buildSearchIndex(wrt)]);
  const range = `${overview.firstSeason.label} → ${overview.lastSeason.label}`;
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
    needsReview: p.split.needsReview,
  }));
  return { counts, rings, range, index };
}, ["public-layout-v1"], { tags: [SUPABASE_TAG], revalidate: 3600 });
