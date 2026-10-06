import type { Metadata } from "next";
import { getWrt, reviewShown } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Rule } from "@/components/wrt/page";
import { SplitKey } from "@/components/wrt/quantity";
import { SeasonColumns } from "@/components/wrt/charts";
import { MissingSeasonRow, SeasonRow, medianSites, type TopSite } from "@/components/wrt/seasons/season-parts";
import type { SiteSpecies } from "@/components/wrt/sites/site-rows";
import { addRecord, emptySplit } from "@/components/wrt/species/species-tiles";

export const metadata: Metadata = {
  title: "Planting seasons",
  description: "Every autumn and spring planting season in the WRT history, with recorded plants, sites, species and the check against the workbook's own totals.",
};

export default async function SeasonsPage() {
  const wrt = getWrt();
  const [seasons, overview, records, showReview] = await Promise.all([wrt.seasons(), wrt.overview(), wrt.records(), reviewShown()]);
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
      addRecord(e.split, v);
      m.set(v.species.slug, e);
      trees.set(v.season.slug, m);
      const sm = sites.get(v.season.slug) ?? new Map<string, TopSite>();
      const se = sm.get(v.place.slug) ?? { slug: v.place.slug, name: v.place.name, split: emptySplit() };
      addRecord(se.split, v);
      sm.set(v.place.slug, se);
      sites.set(v.season.slug, sm);
    }
    const top3 = <T extends { split: { total: number } }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.split.total - a.split.total).slice(0, 3);
    for (const [slug, m] of trees) topBySeason.set(slug, top3(m));
    for (const [slug, m] of sites) sitesBySeason.set(slug, top3(m));
  }

  const total = overview.split;

  const first = seasons[0].season;
  const last = seasons[seasons.length - 1].season;
  const matching = seasons.filter((s) => s.reconciliation?.difference === 0).length;
  const checked = seasons.filter((s) => s.reconciliation).length;
  const median = medianSites(seasons);

  // The Slope Hill 2024 columns dominate the chart; say so, with the numbers from the data.
  const slope = overview.themes.find((t) => t.theme === "slope-hill-2024");
  const slopeSeasons = seasons.filter((s) => s.season.year === 2024).map((s) => s.season.label);

  // The workbook ends on an autumn: show the spring after it as "not in yet".
  const missingSpring = last.name === "Autumn" ? `Spring ${last.year}` : null;

  return (
    <>
      <PageHead
        eyebrow="Planting seasons"
        title={<>{formatNumber(total.total)} recorded plants across {seasons.length} planting seasons, {first.label} to {last.label}</>}
        lead={
          <>
            Each autumn and spring is one planting season. Open a season to see which sites and species went into it.
          </>
        }
      />

      {/* No cards: the chart and the season rows sit straight on the page, like the species list. */}
      <section className="flex flex-col gap-3" aria-labelledby="by-season">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="by-season" className="wrt-section-title">Recorded plants by season</h2>
          <SplitKey spring />
        </div>
        <SeasonColumns points={seasons} caption={`Autumn and spring alternate.${showReview ? " Amber is the part still waiting on a WRT ruling." : ""}`} />
        {slope && slopeSeasons.length > 0 && (
          <Rule>
            {slopeSeasons.join(" and ")} stand out because they include the Slope Hill 2024 columns ({formatNumber(slope.split.needsReview)} recorded plants,
            WRT decision 4 still open).
          </Rule>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="by-year">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="by-year" className="wrt-section-title">Season by season</h2>
          <span className="wrt-muted">
            {matching} of {checked} seasons match the workbook&rsquo;s own total
          </span>
        </div>
        <p className="wrt-muted m-0">Newest first. Select a season to see every site and species in it.</p>
        <ol className="wrt-srows">
          {missingSpring && <MissingSeasonRow label={missingSpring} />}
          {[...seasons].reverse().map((s) => (
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
          Each season&rsquo;s generated total is checked against the TOTAL cell in the workbook&rsquo;s own MASTER sheet. A season only shows a badge when the two differ.
        </Rule>
      </section>
    </>
  );
}
