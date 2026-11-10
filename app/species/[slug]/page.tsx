import type { Metadata } from "next";
import { needsReviewByPlants } from "@/lib/wrt/queries";
import { SpeciesProfilePanel } from "@/components/wrt/species/species-profile";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink, Rule } from "@/components/wrt/shared/page";
import { SplitKey } from "@/components/wrt/shared/quantity";
import { RankedBars, SeasonColumns, YearTable } from "@/components/wrt/shared/charts";
import { RecordsTable, ReviewThemeList } from "@/components/wrt/shared/records";
import { PlaceName, hrefs } from "@/components/wrt/shared/names";
import { Badge } from "@/components/ui/badge";
import { InlineName, midSentence } from "@/components/wrt/species/species-meta";

import { getSpeciesPhotos } from "@/lib/wrt/species-photos";
import { SpeciesHero } from "@/components/wrt/species/species-hero";

type Props = Readonly<PageProps<"/species/[slug]">>;

const PLACES_SHOWN = 15;
const REVIEW_ROWS_SHOWN = 8;

export async function generateStaticParams() {
  const list = await getWrt().speciesList();
  return list.map((r) => ({ slug: r.item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getWrt().species(slug);
  if (!d || !d.span) return { title: "Species not found" };
  const name = d.species.displayName;
  return {
    title: name,
    description: `${formatNumber(d.split.total)} recorded ${name} plants since ${d.span.first.label}.`,
  };
}

export default async function SpeciesDetailPage({ params }: Props) {
  const { slug } = await params;
  const d = await getWrt().species(slug);
  if (!d || !d.span) notFound();
  const { species: sp, split, span, seasons, years, places, contested, themes, records } = d;

  const photos = getSpeciesPhotos(sp.id);
  const otherNames = [sp.maoriName, sp.commonName]
    .filter((n): n is string => !!n && n !== sp.displayName);
  const aliases = [...new Set(sp.aliases)].filter(Boolean);
  const reviewRows = records.filter((r) => r.record.needsReview);
  const reviewSorted = needsReviewByPlants(reviewRows).slice(0, REVIEW_ROWS_SHOWN);
  const siteCount = places.length;
  const ranked = [...(await getWrt().speciesList())].sort(
    (a, b) => b.split.total - a.split.total || a.item.scientificName.localeCompare(b.item.scientificName),
  );
  const planted = new Set(ranked.map((r) => r.item.slug));
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
        photos={photos}
        otherNames={otherNames}
      />

      {contested.length > 0 && (
        <div className="cn-callout cn-callout--note !items-start">
          <div className="flex flex-col gap-1.5">
            <strong>This name is contested</strong>
            <span className="[font:500_14px/1.45_var(--font-sans)]">
              WRT has not yet ruled whether{" "}
              <b><InlineName species={sp} /></b> and{" "}
              {contested.map((c, i) => {
                const name = c.displayIsScientific ? <i>{c.scientificName}</i> : <>{c.displayName} (<i>{c.scientificName}</i>)</>;
                return (
                  <span key={c.slug}>
                    {i > 0 && (i === contested.length - 1 ? " and " : ", ")}
                    {/* A species with no plantings has no page: name it without a link. */}
                    {planted.has(c.slug) ? (
                      <Link href={hrefs.species(c.slug)} className="underline underline-offset-2">{name}</Link>
                    ) : name}
                  </span>
                );
              })}{" "}
              are one species line or two. Each is kept as typed until WRT rules, and the numbers are not merged.
            </span>
          </div>
        </div>
      )}

      <SpeciesProfilePanel speciesId={sp.id} />

      <Card
        title="Recorded plants by season"
        foot={`${seasons.length} planting seasons. Select a column to open that season.`}
      >
        <div className="mb-3"><SplitKey spring /></div>
        <SeasonColumns points={seasons} caption={`Recorded ${midSentence(sp.displayName)} plants by season`} />
      </Card>

      <Card title="By year" variant="table">
        <YearTable
          years={years}
          seasonHref={(y, s) => hrefs.season(`${s}-${y}`)}
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

      <Card title="What WRT still has to decide here">
        <ReviewThemeList themes={themes} recordsQuery={{ species: sp.slug }} />
      </Card>

      {reviewRows.length > 0 && (
        <Card
          title={`${formatNumber(reviewRows.length)} record${reviewRows.length === 1 ? "" : "s"} needing review`}
          variant="table"
          action={<CardLink href={hrefs.records({ species: sp.slug, review: "needs-review" })}>See all needing review</CardLink>}
          foot={
            reviewRows.length > REVIEW_ROWS_SHOWN
              ? `The ${REVIEW_ROWS_SHOWN} largest of ${formatNumber(reviewRows.length)}. Open Source on any row for the spreadsheet cell.`
              : "Open Source on any row for the spreadsheet cell it came from."
          }
        >
          <RecordsTable rows={reviewSorted} hide={["species"]} caption={`Records needing review for ${sp.displayName}`} />
        </Card>
      )}

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
