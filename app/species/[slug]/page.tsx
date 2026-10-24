import type { Metadata } from "next";

import { SpeciesProfilePanel } from "@/components/wrt/species/species-profile";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink, Rule } from "@/components/wrt/shared/page";

import { RankedBars, SeasonColumns, YearTable } from "@/components/wrt/shared/charts";
import { PlaceName, hrefs } from "@/components/wrt/shared/names";
import { Badge } from "@/components/ui/badge";
import { midSentence } from "@/components/wrt/species/species-meta";

import { SpeciesHero } from "@/components/wrt/species/species-hero";

type Props = { params: Promise<{ slug: string }> };

const PLACES_SHOWN = 15;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getWrt().species(slug);
  if (!d) return { title: "Species not found" };
  const name = d.species.displayName;
  return {
    title: name,
    description: `${formatNumber(d.split.total)} recorded ${name} plants across the saved records.`,
  };
}

export default async function SpeciesDetailPage({ params }: Props) {
  const { slug } = await params;
  const d = await getWrt().species(slug);
  if (!d) notFound();
  const { species: sp, split, span, seasons, years, places } = d;

  const otherNames = [sp.maoriName, sp.commonName]
    .filter((n): n is string => !!n && n !== sp.displayName);
  const aliases = [...new Set(sp.aliases)].filter(Boolean);
  const siteCount = places.length;
  const ranked = [...(await getWrt().speciesList())].sort(
    (a, b) => b.split.total - a.split.total || a.item.scientificName.localeCompare(b.item.scientificName),
  );
  const at = ranked.findIndex((r) => r.item.slug === sp.slug);
  const rank = at + 1;
  const prev = at > 0 ? ranked[at - 1] : null;
  const next = at >= 0 && at < ranked.length - 1 ? ranked[at + 1] : null;

  return (
    <>
      <SpeciesHero
        species={sp}
        split={split}
        span={span}
        seasons={seasons}
        siteCount={siteCount}
        rank={rank}
        rankOf={ranked.length}
        otherNames={otherNames}
      />

      <SpeciesProfilePanel species={sp} />

      <Card title="Recorded plants by season" foot={`${seasons.length} season labels. Select a column to open that season.`}>
        <SeasonColumns points={seasons} caption={`Recorded ${midSentence(sp.displayName)} plants by season`} />
      </Card>

      <Card title="By year" variant="table">
        <YearTable
          years={years}
        />
      </Card>

      <div className="wrt-grid wrt-grid--main-rail items-start">
        <Card
          title="Where it was recorded"
          action={<CardLink href={hrefs.records({ species: sp.slug })}>All records</CardLink>}
          foot={
            places.length > PLACES_SHOWN
              ? `Top ${PLACES_SHOWN} of ${formatNumber(places.length)} sites. The rest are in the records.`
              : "Bars are relative to the site with the most recorded plants."
          }
        >
          <RankedBars
            items={places.slice(0, PLACES_SHOWN).map((p) => ({
              key: p.item.slug,
              label: <PlaceName place={p.item} />,
              split: p.split,
              href: hrefs.place(p.item.slug),
            }))}
          />
        </Card>

        <Card
          title="Names found in WRT’s spreadsheets"
          foot="Search matches all of these. Macrons are ignored when searching."
        >
          <div className="wrt-pills">
            {aliases.map((a) => (
              <Badge key={a} tone="soft">{a}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <Rule>
        <Link href={hrefs.records({ species: sp.slug })} className="cn-link">
          All {formatNumber(split.records)} records for this species →
        </Link>
      </Rule>

      <nav className="wrt-snext" aria-label="Neighbouring species by recorded plants">
        {prev ? (
          <Link href={hrefs.species(prev.item.slug)} className="wrt-snext__link">
            <span className="wrt-snext__dir">← No. {rank - 1}</span>
            <span className={prev.item.displayIsScientific ? "wrt-snext__name italic" : "wrt-snext__name"}>{prev.item.displayName}</span>
            <span className="wrt-snext__sub">{formatNumber(prev.split.total)} recorded plants</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={hrefs.species(next.item.slug)} className="wrt-snext__link wrt-snext__link--next">
            <span className="wrt-snext__dir">No. {rank + 1} →</span>
            <span className={next.item.displayIsScientific ? "wrt-snext__name italic" : "wrt-snext__name"}>{next.item.displayName}</span>
            <span className="wrt-snext__sub">{formatNumber(next.split.total)} recorded plants</span>
          </Link>
        ) : <span />}
      </nav>
    </>
  );
}
