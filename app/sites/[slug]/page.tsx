import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { splitOf } from "@/lib/wrt/queries";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, CardLink, Rule } from "@/components/wrt/page";
import { SpeciesName, hrefs } from "@/components/wrt/names";
import { QuantityFigure, SplitKey } from "@/components/wrt/quantity";
import { RankedBars, SeasonColumns, YearTable } from "@/components/wrt/charts";
import { RecordsTable, ReviewThemeList } from "@/components/wrt/records";
import { ChipLinks } from "@/components/wrt/sites/filter-chips";
import { YearView } from "@/components/wrt/sites/year-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const REVIEW_CAP = 25;
const SPECIES_CAP = 15;

export async function generateStaticParams() {
  const places = await getWrt().places();
  return places.map((p) => ({ slug: p.item.slug }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const d = await getWrt().place(slug);
  if (!d || !d.split.records) return { title: "Site not found" };
  return {
    title: d.place.name,
    description: `${formatNumber(d.split.total)} recorded plants at ${d.place.name}, ${d.span.first.label} to ${d.span.last.label}, by season, year and species.`,
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await getWrt().place(slug);
  if (!d || !d.split.records) notFound();

  const { place, split, span } = d;
  const yearParam = Number(Array.isArray(sp.year) ? sp.year[0] : sp.year);
  const year = d.years.some((y) => y.year === yearParam) ? yearParam : undefined;

  const classes = place.siteClasses.map((c) => SITE_CLASS_LABELS[c]).join(" and ");
  const spanText = span.first.slug === span.last.slug ? span.first.label : `${span.first.label} → ${span.last.label}`;
  const eyebrow = place.isScheme ? `Order scheme, not a place · ${spanText}` : `${classes} site · ${spanText}`;
  const title = place.isScheme
    ? `${formatNumber(split.total)} recorded plants through ${place.name} since ${span.first.label}`
    : span.first.slug === span.last.slug
      ? `${formatNumber(split.total)} recorded plants at ${place.name} in ${span.first.label}`
      : `${formatNumber(split.total)} recorded plants at ${place.name} since ${span.first.label}`;

  const recordsFor = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, ...extra });

  // Slope Hill style flagged columns (WRT decision 4).
  const flagged = d.records.filter((r) => r.record.notes.some((n) => n.theme === "slope-hill-2024"));
  const flaggedSplit = splitOf(flagged.map((r) => r.record));
  const flaggedSeasons = [...new Set(flagged.map((r) => r.season.label))];

  const needsReview = d.records
    .filter((r) => r.record.needsReview)
    .sort((a, b) => b.record.quantity - a.record.quantity);
  const reviewRows = needsReview.slice(0, REVIEW_CAP);
  const reviewHidden = needsReview.length - reviewRows.length;

  const activeSeasons = d.seasons.filter((s) => s.split.records > 0).length;
  const topSpecies = d.species.slice(0, SPECIES_CAP);
  const maxSpecies = topSpecies[0]?.split.total ?? 1;

  return (
    <>
      <PageHead
        back={{ href: "/sites", label: "All sites" }}
        eyebrow={eyebrow}
        title={title}
        lead={
          place.isScheme
            ? "Paper4Trees is an order scheme, not a place. Its plants are recorded against the scheme and WRT has not yet ruled on how they count."
            : undefined
        }
      />

      <Card title="Recorded plants by season" action={<SplitKey spring />}
        foot={
          <>
            Recorded in {activeSeasons} of {d.seasons.length} seasons; empty columns are seasons with no records for this
            {place.isScheme ? " scheme" : " site"}. Each column opens that season’s records.
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <QuantityFigure split={split} />
          <SeasonColumns
            points={d.seasons}
            caption={`Recorded plants by season at ${place.name}`}
            hrefFor={(p) => recordsFor({ season: p.season.name, year: p.season.year })}
          />
          {flaggedSplit.total > 0 && (
            <Rule>
              {formatNumber(flaggedSplit.total)} recorded plants in {flaggedSeasons.join(" and ")} are flagged by WRT
              (decision 4) and shown in amber. They dominate this scale until WRT rules whether they count.
            </Rule>
          )}
        </div>
      </Card>

      <div className="wrt-grid wrt-grid--main-rail items-start">
        <Card
          title="Year by year"
          foot={
            <>
              Autumn and spring figures open that season’s records at {place.name}. Pick a year to see which species went
              into it.
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <ChipLinks
              label="Pick a year"
              chips={d.years.map((y) => ({
                key: String(y.year),
                label: String(y.year),
                href: `/sites/${place.slug}?year=${y.year}#year-view`,
                active: year === y.year,
              }))}
            />
            <YearTable
              years={d.years}
              seasonHref={(y, s) =>
                recordsFor({ year: y, season: s === "autumn" ? "Autumn" : "Spring" })
              }
            />
          </div>
        </Card>

        <Card
          title="Species recorded here"
          foot={
            <>
              {d.species.length > topSpecies.length
                ? `Top ${topSpecies.length} of ${d.species.length} species. `
                : `${d.species.length} species recorded. `}
              <Link href={recordsFor()} className="cn-link">All records →</Link>
            </>
          }
        >
          <RankedBars
            max={maxSpecies}
            items={topSpecies.map((s) => ({
              key: s.item.id,
              label: <SpeciesName species={s.item} />,
              split: s.split,
              href: hrefs.species(s.item.slug),
            }))}
          />
        </Card>
      </div>

      {year !== undefined && <YearView place={place} year={year} rows={d.records} />}

      {d.parcels.length > 1 && (
        <Card
          title="Parts of this site"
          foot="Select a part to see its species and records. Parcels are WRT’s registered sub-sites; their recorded plants add up to the site."
        >
          <RankedBars
            items={d.parcels.map((p) => ({
              key: p.item.id,
              label: (
                <span className="cn-species">
                  <span className="cn-species__common">{p.item.name}</span>
                  <span className="cn-species__latin is-plain">
                    {p.span.first.slug === p.span.last.slug ? p.span.first.label : `${p.span.first.label} → ${p.span.last.label}`}
                    {" · "}
                    {p.span.seasonsActive} {p.span.seasonsActive === 1 ? "season" : "seasons"}
                  </span>
                </span>
              ),
              split: p.split,
              href: recordsFor({ parcel: p.item.id }),
            }))}
          />
        </Card>
      )}

      <Card
        title="Open questions for WRT"
        foot={d.themes.length ? "Each question applies to every record under it. Answer it once and these figures settle." : undefined}
      >
        <ReviewThemeList themes={d.themes} recordsQuery={{ place: place.slug }} />
      </Card>

      {needsReview.length > 0 && (
        <Card
          variant="table"
          title="Records that need review here"
          action={
            reviewHidden > 0 ? (
              <CardLink href={recordsFor({ review: "needs-review" })}>
                All {formatNumber(needsReview.length)} records needing review
              </CardLink>
            ) : undefined
          }
          foot={
            reviewHidden > 0
              ? `Showing the ${reviewRows.length} largest of ${formatNumber(needsReview.length)} records needing review; ${formatNumber(reviewHidden)} more in the full list.`
              : undefined
          }
        >
          <RecordsTable rows={reviewRows} hide={["site"]} caption={`Records needing review at ${place.name}`} />
        </Card>
      )}

      <p className="m-0">
        <CardLink href={recordsFor()}>
          All {formatNumber(split.records)} record{split.records === 1 ? "" : "s"} for {place.name}
        </CardLink>
      </p>
      <Rule>Recorded plants come from WRT’s allocation sheets, so they are not verified plantings.</Rule>
    </>
  );
}
