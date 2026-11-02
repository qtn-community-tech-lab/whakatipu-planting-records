import type { Metadata } from "next";
import { listSeasonLeaders, listSeasons } from "@/db/queries/plantings";
import { getQuestionTotals } from "@/db/queries/review";
import { reviewShown } from "@/lib/wrt/server";
import type { SeasonSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Rule } from "@/components/wrt/shared/page";
import { SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns } from "@/components/wrt/shared/charts";
import { MissingSeasonRow, SeasonRow, medianSites, type TopSite, type TopSpecies } from "@/components/wrt/seasons/season-parts";

export const metadata: Metadata = {
  title: "Planting seasons",
  description: "Every autumn and spring planting season in the WRT history, with recorded plants, sites, species and the check against the workbook's own totals.",
};

type SeasonTotals = Awaited<ReturnType<typeof listSeasons>>[number];

/** One season row from Supabase, in the shape the season components take. */
function toSummary(r: SeasonTotals, showReview: boolean): SeasonSummary {
  const plants = r.plants ?? 0;
  const confirmed = r.plants_confirmed ?? 0;
  const lines = r.lines ?? 0;
  const linesReview = r.lines_needs_review ?? 0;
  return {
    season: { slug: r.season!, label: r.season_label!, year: r.year!, name: r.half === "autumn" ? "Autumn" : "Spring", order: r.season_order! },
    split: showReview
      ? { total: plants, resolved: confirmed, needsReview: r.plants_needs_review ?? 0, records: lines, recordsNeedingReview: linesReview }
      : { total: confirmed, resolved: confirmed, needsReview: 0, records: lines - linesReview, recordsNeedingReview: 0 },
    placeCount: r.sites ?? 0,
    speciesCount: r.species ?? 0,
    reconciliation: r.workbook_total === null ? null : {
      kind: "season", label: r.season_label!, generated: plants, stated: r.workbook_total,
      difference: plants - r.workbook_total, statedCell: r.workbook_cell ?? "", records: lines, cause: null,
    },
  };
}

export default async function SeasonsPage() {
  const [rows, leaders, slope, showReview] = await Promise.all([
    listSeasons(), listSeasonLeaders(), getQuestionTotals("slope-hill-2024"), reviewShown(),
  ]);
  // Only seasons with planting lines, as in the workbook.
  const seasons = rows.filter((r) => (r.lines ?? 0) > 0).map((r) => toSummary(r, showReview));

  // Top trees and top sites in each season, largest first, ranked by the database.
  const topBySeason = new Map<string, TopSpecies[]>();
  for (const r of leaders.species) {
    const scientificName = r.scientific_name!;
    const displayName = r.maori_name ?? r.common_name ?? scientificName;
    const tree = { species: { id: r.register_code ?? "", slug: r.species!, scientificName, displayName, displayIsScientific: displayName === scientificName }, split: { total: r.plants ?? 0 } };
    topBySeason.set(r.season!, [...(topBySeason.get(r.season!) ?? []), tree]);
  }
  const sitesBySeason = new Map<string, TopSite[]>();
  for (const r of leaders.sites) {
    const site = { slug: r.site!, name: r.site_name!, split: { total: r.plants ?? 0 } };
    sitesBySeason.set(r.season!, [...(sitesBySeason.get(r.season!) ?? []), site]);
  }

  const total = { total: seasons.reduce((n, s) => n + s.split.total, 0) };

  const first = seasons[0].season;
  const last = seasons[seasons.length - 1].season;
  const matching = seasons.filter((s) => s.reconciliation?.difference === 0).length;
  const checked = seasons.filter((s) => s.reconciliation).length;
  const median = medianSites(seasons);

  // The Slope Hill 2024 columns dominate the chart; say so, with the numbers from the data.
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
        {showReview && slope && slopeSeasons.length > 0 && (
          <Rule>
            {slopeSeasons.join(" and ")} stand out because they include the Slope Hill 2024 columns ({formatNumber(slope.plants ?? 0)} recorded plants,
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
