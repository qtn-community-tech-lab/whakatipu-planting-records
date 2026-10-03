import type { Metadata } from "next";
import { getWrt } from "@/lib/wrt/server";
import { PageHead, Card, CardLink, Rule } from "@/components/wrt/page";
import { QuantityFigure, SplitKey } from "@/components/wrt/quantity";
import { SeasonColumns } from "@/components/wrt/charts";
import { AlignedBars } from "@/components/wrt/overview/ranked";
import { OpenQuestions } from "@/components/wrt/overview/open-questions";
import { SpeciesName, hrefs } from "@/components/wrt/names";
import { ClassBreakdown, PrecisionBreakdown } from "@/components/wrt/overview/breakdowns";
import { StartHere, type StartQuestion } from "@/components/wrt/overview/start-here";
import { formatNumber, formatShare } from "@/lib/wrt/text";

export const metadata: Metadata = {
  title: "Restoration history",
};

export default async function Home() {
  const wrt = getWrt();
  const [o, places, species, seasons] = await Promise.all([
    wrt.overview(),
    wrt.places(),
    wrt.speciesList(),
    wrt.seasons(),
  ]);

  const { split } = o;
  const slopeHill = o.themes.find((t) => t.theme === "slope-hill-2024");
  const topPlaces = o.places.slice(0, 8);
  const topSpecies = o.species.slice(0, 8);

  // Starting questions: only link to things that exist in the data.
  const wc = places.find((p) => p.item.slug === "whitechapel");
  const manuka = species.find((s) => s.item.slug === "leptospermum-scoparium");
  const autumn24 = seasons.find((s) => s.season.slug === "autumn-2024");
  const questions: StartQuestion[] = [];
  if (wc) {
    questions.push({
      href: hrefs.records({ place: wc.item.slug, year: 2019 }),
      question: "What went in at Whitechapel in 2019",
      answer: "Every species recorded there that year, with the source cell behind each row.",
    });
  }
  if (manuka) {
    questions.push({
      href: hrefs.species(manuka.item.slug),
      question: "Every mānuka on record",
      answer: `${formatNumber(manuka.split.total)} recorded plants, season by season and site by site.`,
    });
  }
  if (autumn24) {
    questions.push({
      href: hrefs.season(autumn24.season.slug),
      question: "What went in during Autumn 2024",
      answer: `${formatNumber(autumn24.split.total)} recorded plants across ${autumn24.placeCount} sites, with the Slope Hill columns flagged.`,
    });
  }

  return (
    <>
      <PageHead
        eyebrow={`${o.firstSeason.label} → ${o.lastSeason.label} · ${o.seasons.length} planting seasons`}
        title={
          <>
            {formatNumber(split.total)} recorded plants across {o.placeCount} sites and {o.speciesCount} species
          </>
        }
        lead={
          <>
            This is the first time WRT’s planting history sits in one place. Every figure is a recorded plant,
            taken from the allocation sheets, so it is not a verified planting.{" "}
            <strong>
              {formatNumber(split.needsReview)} of them ({formatShare(split.needsReview, split.total)}) sit on{" "}
              {formatNumber(split.recordsNeedingReview)} records
            </strong>{" "}
            that WRT still has to rule on or confirm. They stay in amber wherever they appear.
          </>
        }
      />

      <Card
        title="Season by season"
        action={<SplitKey spring />}
        foot={
          slopeHill
            ? `Slope Hill 2024 adds ${formatNumber(slopeHill.split.needsReview)} flagged recorded plants, ${formatShare(slopeHill.split.needsReview, split.total)} of everything on record, so 2024 stands well above the other years.`
            : undefined
        }
      >
        <QuantityFigure split={split} size="md" unit={`recorded plants since ${o.firstSeason.label}`} />
        <div className="pt-3">
          <SeasonColumns points={o.seasons} caption="Recorded plants by season. Each column links to that season." />
        </div>
      </Card>

      <div className="wrt-grid wrt-grid--2">
        <Card
          title="Sites with the most recorded plants"
          action={<CardLink href="/sites">All sites</CardLink>}
          foot={`${topPlaces.length} of ${o.placeCount} sites${o.schemeCount ? ` and ${o.schemeCount} order scheme` : ""}, ranked by recorded plants.`}
        >
          <AlignedBars
            items={topPlaces.map((p) => ({
              key: p.item.slug,
              label: <span className="cn-species__common">{p.item.name}</span>,
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
          <AlignedBars
            items={topSpecies.map((s) => ({
              key: s.item.slug,
              label: <SpeciesName species={s.item} />,
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

      <Card
        title="Open questions for WRT"
        action={<CardLink href="/about-the-data">About the data</CardLink>}
        foot="Each question can be answered once and then applies to every record it touches."
      >
        <OpenQuestions themes={o.themes} />
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="start-exploring">
        <h2 id="start-exploring" className="wrt-section-title">Start exploring</h2>
        <StartHere questions={questions} />
        <Rule>Or search for any site, species or season from the box at the top of the page.</Rule>
      </section>
    </>
  );
}
