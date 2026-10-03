import type { Metadata } from "next";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, Rule } from "@/components/wrt/page";
import { SplitKey, SplitLine } from "@/components/wrt/quantity";
import { SeasonColumns } from "@/components/wrt/charts";
import { MissingSeasonCell, SeasonCell, medianSites } from "@/components/wrt/seasons/season-parts";

export const metadata: Metadata = {
  title: "Planting seasons",
  description: "Every autumn and spring planting season in the WRT history, with recorded plants, sites, species and the check against the workbook's own totals.",
};

export default async function SeasonsPage() {
  const wrt = getWrt();
  const [seasons, overview] = await Promise.all([wrt.seasons(), wrt.overview()]);

  const total = overview.split;

  const first = seasons[0].season;
  const last = seasons[seasons.length - 1].season;
  const matching = seasons.filter((s) => s.reconciliation?.difference === 0).length;
  const checked = seasons.filter((s) => s.reconciliation).length;
  const median = medianSites(seasons);

  // The Slope Hill 2024 columns dominate the chart; say so, with the numbers from the data.
  const slope = overview.themes.find((t) => t.theme === "slope-hill-2024");
  const slopeSeasons = seasons.filter((s) => s.season.year === 2024).map((s) => s.season.label);

  // Group by year. A year with only one season gets a gap for the other (e.g. Spring 2026).
  const years = [...new Set(seasons.map((s) => s.season.year))];
  const lastYear = last.year;
  const missingSpring = last.name === "Autumn" ? `Spring ${lastYear}` : null;

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

      <Card title="Recorded plants by season" action={<SplitKey spring />}>
        <SeasonColumns points={seasons} caption="Autumn and spring alternate. Amber is the part of each season that still needs a WRT ruling or confirmation." />
        <SplitLine split={total} />
        {slope && slopeSeasons.length > 0 && (
          <Rule>
            {slopeSeasons.join(" and ")} stand out because they include the Slope Hill 2024 columns ({formatNumber(slope.split.needsReview)} recorded plants,
            WRT decision 4 still open).
          </Rule>
        )}
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="by-year">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="by-year" className="wrt-section-title">Season by season</h2>
          <span className="wrt-muted">
            {matching} of {checked} seasons match the workbook&rsquo;s own total
          </span>
        </div>
        {missingSpring && (
          <p className="wrt-muted m-0">
            The data ends at {last.label}. {missingSpring} is not in the master workbook yet, so there is nothing to show for it.
          </p>
        )}
        <Card className="!gap-0">
          {years.map((year, i) => {
            const autumn = seasons.find((s) => s.season.year === year && s.season.name === "Autumn");
            const spring = seasons.find((s) => s.season.year === year && s.season.name === "Spring");
            return (
              <div
                key={year}
                className={`grid gap-x-8 gap-y-4 py-5 md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] ${i > 0 ? "border-t border-[var(--border-row)]" : "pt-0"}`}
              >
                <h3 className="m-0 [font:var(--type-section)] text-[var(--text-strong)]">{year}</h3>
                {autumn ? (
                  <SeasonCell s={autumn} fewSites={autumn.placeCount < median * 0.6} />
                ) : (
                  <MissingSeasonCell label={`Autumn ${year}`} />
                )}
                {spring ? (
                  <SeasonCell s={spring} fewSites={spring.placeCount < median * 0.6} />
                ) : year === lastYear && missingSpring ? (
                  <MissingSeasonCell label={missingSpring} />
                ) : (
                  <MissingSeasonCell label={`Spring ${year}`} />
                )}
              </div>
            );
          })}
        </Card>
        <Rule>
          &ldquo;Matches workbook total&rdquo; means the generated total for the season equals the TOTAL cell in the workbook&rsquo;s own MASTER sheet. Hover a badge for the cell.
        </Rule>
      </section>
    </>
  );
}
