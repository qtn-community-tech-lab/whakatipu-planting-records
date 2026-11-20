import type { Metadata } from "next";
import { getPublicWrt } from "@/lib/wrt/public-server";
import Link from "next/link";
import { Card, CardLink, EmptyState, Rule } from "@/components/wrt/shared/page";
import { SplitKey } from "@/components/wrt/shared/quantity";
import { OverviewHero } from "@/components/wrt/overview/overview-hero";
import { RankLabel, SpeciesAvatar } from "@/components/wrt/shared/species-avatar";
import { RankedBars, SeasonColumns } from "@/components/wrt/shared/charts";
import { SpeciesName, hrefs } from "@/components/wrt/shared/names";
import { ClassBreakdown, PrecisionBreakdown } from "@/components/wrt/overview/breakdowns";
import { StartHere, type StartQuestion } from "@/components/wrt/overview/start-here";
import { formatNumber } from "@/lib/wrt/text";

export const metadata: Metadata = {
  title: "Restoration history",
};

export default async function Home() {
  const wrt = getPublicWrt();
  const o = await wrt.overview();

  if (!o.firstSeason || !o.lastSeason) return (
    <EmptyState title="No planting history yet">
      Planting records have not been loaded. Refresh after the historical import completes.
    </EmptyState>
  );

  const { split } = o;
  const topPlaces = o.places.slice(0, 8);
  const topSpecies = o.species.slice(0, 8);

  // Season facts for the chart header.
  const withPlants = o.seasons.filter((p) => p.split.total > 0);
  const busiest = withPlants.reduce((a, b) => (b.split.total > a.split.total ? b : a), o.seasons[0]!);
  const quietest = withPlants.reduce((a, b) => (b.split.total < a.split.total ? b : a), withPlants[0] ?? o.seasons[0]!);
  const sortedTotals = withPlants.map((p) => p.split.total).sort((a, b) => a - b);
  const median = sortedTotals[Math.floor(sortedTotals.length / 2)] ?? 0;

  const questions: StartQuestion[] = [
    {
      href: hrefs.records({}),
      question: "What went where",
      icon: "sites",
      answer: "Explore every recorded species, site and season, with the source cell behind each row.",
    },
    {
      href: "/seasons",
      question: "What went in each season",
      icon: "seasons",
      answer: "Compare recorded plants across seasons and open one to see its sites and species.",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Link className="cn-btn cn-btn--primary" href={hrefs.newEvent({ returnTo: "/" })}>
          Record a planting
        </Link>
      </div>
      <OverviewHero
        split={split}
        eyebrow={`${o.firstSeason.label} → ${o.lastSeason.label} · ${o.seasons.length} planting seasons`}
        siteCount={o.siteCount}
        speciesCount={o.speciesCount}
        siteCountWithPlantings={o.siteCountWithPlantings}
        speciesCountWithPlantings={o.speciesCountWithPlantings}
        seasonCount={o.seasons.length}
        topSpecies={o.species}
      />

      <section className="flex flex-col gap-3" aria-labelledby="start-exploring">
        <h2 id="start-exploring" className="wrt-section-title">Start exploring</h2>
        <StartHere questions={questions} />
        <Rule>Or search for any site, species or season from the box at the top of the page. Press / to jump there.</Rule>
      </section>

      <Card
        title="Season by season"
        action={<SplitKey spring />}
      >
        <dl className="wrt-sfacts">
          <Link href={hrefs.season(busiest.season.slug)} className="wrt-sfact">
            <dt>Busiest season</dt>
            <dd>{busiest.season.label}</dd>
            <span className="tabular-nums">{formatNumber(busiest.split.total)} recorded</span>
          </Link>
          <Link href={hrefs.season(quietest.season.slug)} className="wrt-sfact">
            <dt>Quietest season</dt>
            <dd>{quietest.season.label}</dd>
            <span className="tabular-nums">{formatNumber(quietest.split.total)} recorded</span>
          </Link>
          <div className="wrt-sfact">
            <dt>Typical season</dt>
            <dd className="tabular-nums">{formatNumber(median)}</dd>
            <span>recorded plants (median)</span>
          </div>
        </dl>
        <div className="pt-2">
          <SeasonColumns points={o.seasons} caption="Recorded plants by season. Each column links to that season." />
        </div>
      </Card>

      <div className="wrt-grid wrt-grid--2">
        <Card
          title="Sites with the most recorded plants"
          action={<CardLink href="/sites">All sites</CardLink>}
          foot={`${topPlaces.length} of ${o.siteCountWithPlantings} sites with plantings, ranked by recorded plants.`}
        >
          <RankedBars
            aligned
            items={topPlaces.map((p, i) => ({
              key: p.item.slug,
              label: <RankLabel rank={i + 1}><span className="cn-species__common">{p.item.name}</span></RankLabel>,
              split: p.split,
              href: hrefs.place(p.item.slug),
            }))}
          />
        </Card>
        <Card
          title="Most recorded species"
          action={<CardLink href="/species">All species</CardLink>}
          foot={`${topSpecies.length} of ${o.speciesCount} species, ranked by recorded plants.`}
        >
          <RankedBars
            aligned
            items={topSpecies.map((s, i) => ({
              key: s.item.slug,
              label: (
                <RankLabel rank={i + 1}>
                  <SpeciesAvatar species={s.item} />
                  <SpeciesName species={s.item} />
                </RankLabel>
              ),
              split: s.split,
              href: hrefs.species(s.item.slug),
            }))}
          />
        </Card>
      </div>

      <div className="wrt-grid wrt-grid--2">
        <Card title="Where the plants went" foot="Keystone sites are the large restoration sites.">
          <ClassBreakdown rows={o.byClass} />
        </Card>
        <Card
          title="How precise the records are"
          foot="Most records know only the site, species, season and quantity. There are no planting dates or coordinates."
        >
          <PrecisionBreakdown rows={o.byPrecision} />
        </Card>
      </div>
    </>
  );
}
