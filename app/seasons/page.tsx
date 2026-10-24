import type { Metadata } from "next";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Rule } from "@/components/wrt/shared/page";

import { SeasonColumns } from "@/components/wrt/shared/charts";
import { SeasonRow, medianSites, type TopSite } from "@/components/wrt/seasons/season-parts";

import { type SiteSpecies, byTotalDesc, addToSplit, emptySplit } from "@/lib/wrt/queries";

export const metadata: Metadata = {
  title: "Planting seasons",
  description: "Planting records grouped by exact saved season label, with recorded plants, sites and species.",
};

export default async function SeasonsPage() {
  const wrt = getWrt();
  const [seasons, overview, records] = await Promise.all([wrt.seasons(), wrt.overview(), wrt.records()]);
  // Most recorded species in each season, largest first.
  // Top trees and top sites in each season, largest first.
  const topBySeason = new Map<string, SiteSpecies[]>();
  const sitesBySeason = new Map<string, TopSite[]>();
  {
    const trees = new Map<string, Map<string, SiteSpecies>>();
    const sites = new Map<string, Map<string, TopSite>>();
    for (const v of records.rows) {
      const m = trees.get(v.season.slug) ?? new Map<string, SiteSpecies>();
      const e = m.get(v.species.slug) ?? { species: v.species, split: emptySplit() };
      addToSplit(e.split, v.record);
      m.set(v.species.slug, e);
      trees.set(v.season.slug, m);
      const sm = sites.get(v.season.slug) ?? new Map<string, TopSite>();
      const se = sm.get(v.place.slug) ?? { slug: v.place.slug, name: v.place.name, split: emptySplit() };
      addToSplit(se.split, v.record);
      sm.set(v.place.slug, se);
      sites.set(v.season.slug, sm);
    }
    const top3 = <T extends { split: { total: number } }>(m: Map<string, T>) => [...m.values()].sort(byTotalDesc).slice(0, 3);
    for (const [slug, m] of trees) topBySeason.set(slug, top3(m));
    for (const [slug, m] of sites) sitesBySeason.set(slug, top3(m));
  }

  const total = overview.split;

  const median = medianSites(seasons);

  return (
    <>
      <PageHead
        eyebrow="Planting seasons"
        title={<>{formatNumber(total.total)} recorded plants across {seasons.length} planting seasons, saved in the database</>}
        lead={
          <>
            Each saved label is one season, grouped across years. Open a season to see which sites and species went into it.
          </>
        }
      />

      {/* No cards: the chart and the season rows sit straight on the page, like the species list. */}
      <section className="flex flex-col gap-3" aria-labelledby="by-season">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="by-season" className="wrt-section-title">Recorded plants by season</h2>

        </div>
        <SeasonColumns points={seasons} caption="Recorded plants by saved season label." />

      </section>

      <section className="flex flex-col gap-3" aria-labelledby="by-year">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="by-year" className="wrt-section-title">Season by season</h2>
          <span className="wrt-muted">
            Seasons grouped by label
          </span>
        </div>
        <p className="wrt-muted m-0">Alphabetical by label. Select a season to see every site and species in it.</p>
        <ol className="wrt-srows">

          {seasons.map((s) => (
            <SeasonRow
              key={s.season.slug}
              s={s}
              fewSites={s.placeCount < median * 0.6}
              trees={topBySeason.get(s.season.slug)}
              sites={sitesBySeason.get(s.season.slug)}
            />
          ))}
        </ol>
        <Rule>
          Totals sum known saved quantities. Unknown counts are shown separately.
        </Rule>
      </section>
    </>
  );
}
