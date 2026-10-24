import type { Metadata } from "next";
import Link from "next/link";
import { formatNumber } from "@/lib/wrt/text";
import { getWrt } from "@/lib/wrt/server";
import { Card, CardLink, Rule } from "@/components/wrt/shared/page";

import { OverviewHero } from "@/components/wrt/overview/overview-hero";
import { RankLabel, SpeciesAvatar } from "@/components/wrt/shared/species-avatar";
import { RankedBars, SeasonColumns } from "@/components/wrt/shared/charts";
import { SpeciesName, hrefs } from "@/components/wrt/shared/names";
import { ClassBreakdown, PrecisionBreakdown } from "@/components/wrt/overview/breakdowns";
import { StartHere, type StartQuestion } from "@/components/wrt/overview/start-here";

export const metadata: Metadata = {
  title: "Restoration history",
};

export default async function Home() {
  const wrt = getWrt();
  const [o, places, seasons ] = await Promise.all([wrt.overview(), wrt.places(), wrt.seasons()]);

  const { split } = o;
  const topPlaces = o.places.slice(0, 8);
  const topSpecies = o.species.slice(0, 8);

  // Season facts for the chart header.
  const withPlants = o.seasons.filter((p) => p.split.total > 0);
  const busiest = withPlants.length ? withPlants.reduce((a, b) => b.split.total > a.split.total ? b : a) : null;
  const quietest = withPlants.length ? withPlants.reduce((a, b) => b.split.total < a.split.total ? b : a) : null;
  const sortedTotals = withPlants.map((p) => p.split.total).sort((a, b) => a - b);
  const median = sortedTotals[Math.floor(sortedTotals.length / 2)] ?? 0;

  // Starting questions: only link to things that exist in the data.
  const wc = places.find((p) => p.item.slug === "whitechapel");
  const exampleSeason = seasons.find((s) => s.split.records > 0);
  const questions: StartQuestion[] = [];
  if (wc) {
    questions.push({
      href: hrefs.place(wc.item.slug),
      question: "What is recorded at Whitechapel",
      icon: "sites",
      answer: "Its planting areas and saved species records.",
    });
  }
  if (exampleSeason) {
    questions.push({
      href: hrefs.season(exampleSeason.season.slug),
      question: `What went in during ${exampleSeason.season.label}`,
      icon: "seasons",
      answer: `${formatNumber(exampleSeason.split.total)} recorded plants across ${exampleSeason.placeCount} sites, across the saved records.`,
    });
  }

  return (
    <>
      <OverviewHero
        split={split}
        eyebrow={`${o.seasons.length} planting seasons`}
        placeCount={o.placeCount}
        speciesCount={o.speciesCount}
        seasonCount={o.seasons.length}
        topSpecies={o.species}
      />

      <section className="flex flex-col gap-3" aria-labelledby="start-exploring">
        <h2 id="start-exploring" className="wrt-section-title">Start exploring</h2>
        <StartHere questions={questions} />
        <Rule>Or search for any site, species or season from the box at the top of the page. Press / to jump there.</Rule>
      </section>

      <Card title="Season by season">
        {busiest && quietest && <dl className="wrt-sfacts">
          <Link href={hrefs.season(busiest.season.slug)} className="wrt-sfact">
            <dt>Busiest season</dt><dd>{busiest.season.label}</dd>
            <span className="tabular-nums">{formatNumber(busiest.split.total)} recorded</span>
          </Link>
          <Link href={hrefs.season(quietest.season.slug)} className="wrt-sfact">
            <dt>Quietest season</dt><dd>{quietest.season.label}</dd>
            <span className="tabular-nums">{formatNumber(quietest.split.total)} recorded</span>
          </Link>
          <div className="wrt-sfact"><dt>Typical season</dt><dd className="tabular-nums">{formatNumber(median)}</dd><span>recorded plants (median)</span></div>
        </dl>}
        <div className="pt-2"><SeasonColumns points={o.seasons} caption="Recorded plants by season. Each column links to that season." /></div>
      </Card>

      <div className="wrt-grid wrt-grid--2">
        <Card
          title="Sites with the most recorded plants"
          action={<CardLink href="/sites">All sites</CardLink>}
          foot={`${topPlaces.length} of ${o.placeCount} sites${o.schemeCount ? ` and ${o.schemeCount} order scheme` : ""}, ranked by recorded plants.`}
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
        <Card title="Where the plants went" foot="Keystone sites are the large restoration sites. Order-scheme plants are not tied to a place.">
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
