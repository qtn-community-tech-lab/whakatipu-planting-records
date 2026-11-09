import type { Metadata } from "next";
import { listSeasonLeaders, listSeasons } from "@/db/queries/plantings";
import { getWrt, reviewShown } from "@/lib/wrt/server";
import { toSeasonSummary } from "@/db/records";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Rule } from "@/components/wrt/shared/page";
import { SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns } from "@/components/wrt/shared/charts";
import { MissingSeasonRow, SeasonRow, medianSites, type TopSite, type TopSpecies } from "@/components/wrt/seasons/season-parts";

export const metadata: Metadata = {
  title: "Planting seasons",
  description: "Every autumn and spring planting season in the WRT history, with recorded plants, sites, species and the check against the workbook's own totals.",
};

export default async function SeasonsPage() {
  const [rows, leaders, showReview, species] = await Promise.all([listSeasons(), listSeasonLeaders(), reviewShown(), getWrt().speciesList()]);
  const speciesBySlug = new Map(species.map((row) => [row.item.slug, row.item]));
  // Only seasons with planting lines, as in the workbook.
  const seasons = rows.filter((r) => (r.lines ?? 0) > 0).map((r) => toSeasonSummary(r, showReview));

  // Top trees and top sites in each season, largest first, ranked by the database.
  const topBySeason = new Map<string, TopSpecies[]>();
  for (const r of leaders.species) {
    const scientificName = r.scientific_name!;
    const displayName = r.maori_name ?? r.common_name ?? scientificName;
    const tree = { species: { photos: speciesBySlug.get(r.species!)?.photos ?? [], id: r.register_code ?? "", slug: r.species!, scientificName, displayName, displayIsScientific: displayName === scientificName }, split: { total: r.plants ?? 0 } };
    topBySeason.set(r.season!, [...(topBySeason.get(r.season!) ?? []), tree]);
  }
  const sitesBySeason = new Map<string, TopSite[]>();
  for (const r of leaders.sites) {
    const site = { slug: r.site!, name: r.site_name!, split: { total: r.plants ?? 0 } };
    sitesBySeason.set(r.season!, [...(sitesBySeason.get(r.season!) ?? []), site]);
  }

  const total = { total: seasons.reduce((n, s) => n + s.split.total, 0) };

  const first = seasons[0]?.season;
  const last = seasons.at(-1)?.season;
  if (!first || !last) {
    return <PageHead title="No planting seasons recorded" />;
  }
  const matching = seasons.filter((s) => s.reconciliation?.difference === 0).length;
  const checked = seasons.filter((s) => s.reconciliation).length;
  const median = medianSites(seasons);

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
              trees={topBySeason.get(s.season.slug) ?? []}
              sites={sitesBySeason.get(s.season.slug) ?? []}
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
