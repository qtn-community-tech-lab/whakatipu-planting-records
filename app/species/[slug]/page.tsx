import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink, Rule } from "@/components/wrt/page";
import { QuantityFigure, SplitKey } from "@/components/wrt/quantity";
import { RankedBars, SeasonColumns, YearTable } from "@/components/wrt/charts";
import { RecordsTable, ReviewThemeList } from "@/components/wrt/records";
import { PlaceName, hrefs } from "@/components/wrt/names";
import { Badge } from "@/components/ui/badge";
import { InlineName, midSentence } from "@/components/wrt/species/species-meta";

type Props = { params: Promise<{ slug: string }> };

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

function eyebrow(over5m: boolean | null, threatened: boolean | null, contested: boolean) {
  const bits = ["Native species"];
  if (contested) bits.push("name needs a ruling");
  if (over5m === true) bits.push("on the over-5 m list");
  if (threatened === true) bits.push("threatened");
  return bits.join(" · ");
}

export default async function SpeciesDetailPage({ params }: Props) {
  const { slug } = await params;
  const d = await getWrt().species(slug);
  if (!d || !d.span) notFound();
  const { species: sp, split, span, seasons, years, places, contested, themes, records } = d;

  const otherNames = [sp.maoriName, sp.commonName]
    .filter((n): n is string => !!n && n !== sp.displayName);
  const aliases = [...new Set(sp.aliases)].filter(Boolean);
  const reviewRows = records.filter((r) => r.record.needsReview);
  const reviewSorted = [...reviewRows].sort((a, b) => b.record.quantity - a.record.quantity).slice(0, REVIEW_ROWS_SHOWN);
  const siteCount = places.length;
  const since = span.seasonsActive === 1 ? `in ${span.first.label}` : `since ${span.first.label}`;

  return (
    <>
      <header className="cn-pagehead">
        <div className="cn-pagehead__text">
          <Link href="/species" className="wrt-back">← All species</Link>
          <span className="cn-eyebrow">{eyebrow(sp.over5m, sp.threatened, sp.needsDecision)}</span>
          <h1 className="cn-display">
            <span className={sp.displayIsScientific ? "wrt-latin" : undefined}>{sp.displayName}</span>
          </h1>
          {!sp.displayIsScientific && (
            <p className="m-0 text-[20px] font-semibold italic text-[var(--text-body)]">{sp.scientificName}</p>
          )}
          {sp.suggestedSpelling && (
            <p className="wrt-muted m-0">
              Usual spelling: <i>{sp.suggestedSpelling}</i>. WRT’s lists use <i>{sp.scientificName}</i>.
            </p>
          )}
          {otherNames.length > 0 && (
            <p className="wrt-muted m-0">Also recorded as {otherNames.join(" · ")}</p>
          )}
        </div>
      </header>

      <Card>
        <h2 className="cn-card__title !text-[22px] !leading-tight m-0 mb-5 max-w-[34ch] text-balance">
          {formatNumber(split.total)} recorded <InlineName species={sp} /> across {formatNumber(siteCount)} site
          {siteCount === 1 ? "" : "s"} {since}
        </h2>
        <div className="wrt-grid wrt-grid--main-rail items-start">
          <QuantityFigure split={split} />
          <p className="wrt-muted m-0">
            {span.seasonsActive === 1
              ? `Recorded in one season only.`
              : `Recorded in ${formatNumber(span.seasonsActive)} of ${seasons.length} seasons, ${span.first.label} → ${span.last.label}.`}{" "}
            {formatNumber(split.records)} record{split.records === 1 ? "" : "s"}, each one a site and season.
          </p>
        </div>
      </Card>

      {contested.length > 0 && (
        <div className="cn-callout cn-callout--note !items-start">
          <div className="flex flex-col gap-1.5">
            <strong>This name is contested</strong>
            <span className="[font:500_14px/1.45_var(--font-sans)]">
              WRT has not yet ruled whether{" "}
              <b><InlineName species={sp} /></b> and{" "}
              {contested.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && (i === contested.length - 1 ? " and " : ", ")}
                  {(
                    <Link href={hrefs.species(c.slug)} className="underline underline-offset-2">
                      {c.displayIsScientific ? <i>{c.scientificName}</i> : <>{c.displayName} (<i>{c.scientificName}</i>)</>}
                    </Link>
                  )}
                </span>
              ))}{" "}
              are one species line or two. Each is kept as typed until WRT rules, and the numbers are not merged.
            </span>
          </div>
        </div>
      )}

      <Card
        title="Recorded plants by season"
        foot={`Autumn 2015 → Autumn 2026, ${seasons.length} seasons. Select a column to open that season.`}
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
    </>
  );
}
