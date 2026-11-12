import type { Metadata } from "next";
import { first } from "@/lib/wrt/params";
import { revalidatePath, updateTag } from "next/cache";
import { SUPABASE_TAG } from "@/db/cache";
import type { SiteSubmitResult } from "@/db/types";
import { DeactivateSite } from "@/components/wrt/sites/deactivate-site";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { speciesBySite, needsReviewByPlants, splitOf } from "@/lib/wrt/queries";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { spanLabel, formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, CardLink, Rule, EmptyState } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { QuantityFigure, SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns, YearTable } from "@/components/wrt/shared/charts";
import { RecordsTable, ReviewThemeList } from "@/components/wrt/shared/records";
import { ChipLinks } from "@/components/wrt/sites/filter-chips";
import { YearView } from "@/components/wrt/sites/year-view";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows, partHref } from "@/components/wrt/sites/site-rows";
import { PlantingTimeline } from "@/components/wrt/sites/planting-timeline";
import { LocationCard } from "@/components/wrt/sites/location-card";
import Link from "next/link";
import { readSite, deactivateSite } from "@/db/queries/sites";
import { isAuthenticated } from "@/db/queries/access";
import { Button } from "@/components/ui/button";

type Props = Readonly<PageProps<"/sites/[slug]">>;

const REVIEW_CAP = 25;

export async function generateStaticParams() {
  const places = await getWrt().places();
  return places.map((p) => ({ slug: p.item.slug }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const [site, d] = await Promise.all([readSite(slug), getWrt().place(slug)]);
  if (!site) return { title: "Site not found" };
  if (!d || !d.split.records) return { title: site.name, description: site.description };
  return {
    title: site.name,
    description: site.description.trim() || `${formatNumber(d.split.total)} recorded plants at ${site.name}, ${d.span.first.label} to ${d.span.last.label}, by season, year and species.`,
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const [site, d, authenticated] = await Promise.all([readSite(slug), getWrt().place(slug), isAuthenticated()]);
  if (!site) notFound();
  async function onDeactivate(): Promise<SiteSubmitResult> {
    "use server";
    if (!(await isAuthenticated())) return { error: "Sign in to deactivate sites." };
    try {
      const { data, error } = await deactivateSite(slug);
      if (error?.code === "42501") return { error: "You need to sign in with a staff account to deactivate sites." };
      if (error || !data) return { error: "The site could not be deactivated. Please try again." };
    } catch {
      return { error: "The site could not be deactivated. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect(`/sites/${slug}`);
  }

  const status = site.deactivated_at ? <Alert role="status">
    <AlertTitle><Badge tone="soft">Deactivated</Badge></AlertTitle>
    <AlertDescription>
      <p>This site is unavailable for new planting events. Its historical records and recorded quantities are retained.</p>
      <Link href="/sites?state=deactivated" className="cn-link">View deactivated sites</Link>
    </AlertDescription>
  </Alert> : null;
  const editButton = authenticated && !site.deactivated_at ? <Button asChild variant="secondary"><Link href={`/sites/${slug}/edit`}>Edit site</Link></Button> : undefined;
  const actions = editButton ? <DeactivateSite name={site.name} onDeactivate={onDeactivate}>{editButton}</DeactivateSite> : null;
  if (!d || !d.split.records)
    return (
      <>
        {actions}
        {status}
        <PageHead back={{ href: "/sites", label: "All sites" }} title={site.name} lead={site.description.trim() || undefined} />
        <EmptyState title="No planting records yet">This site has no planting records yet.</EmptyState>
      </>
    );

  const { split, span } = d;
  const place = { ...d.place, name: site.name };
  const yearParam = Number(first(sp.year));
  const year = d.years.some((y) => y.year === yearParam) ? yearParam : undefined;

  const classes = place.siteClasses.map((c) => SITE_CLASS_LABELS[c]).join(" and ");
  const spanText = spanLabel(span);
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

  const needsReview = needsReviewByPlants(d.records);
  const reviewRows = needsReview.slice(0, REVIEW_CAP);
  const reviewHidden = needsReview.length - reviewRows.length;

  const activeSeasons = d.seasons.filter((s) => s.split.records > 0).length;

  return (
    <>
      {actions}
      {status}
      <PageHead
        back={{ href: "/sites", label: "All sites" }}
        eyebrow={eyebrow}
        title={title}
        lead={
          place.isScheme
            ? "Paper4Trees is an order scheme, not a place. Its plants are recorded against the scheme and WRT has not yet ruled on how they count."
            : site.description.trim() || undefined
        }
      />

      {!place.isScheme && <LocationCard key={place.slug} sites={[place]} records={d.records.map((row) => row.record)} siteName={place.name} />}

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

      <Card
        title={`Trees recorded ${place.isScheme ? "through" : "at"} ${place.name} (${formatNumber(d.species.length)} species)`}
        action={<CardLink href={recordsFor()}>All {formatNumber(split.records)} records</CardLink>}
        foot="Largest first, across every season. Select a species for its records here. Pick a year below to see what went in that year."
      >
        <SpeciesTiles records={d.records} spread="seasons" hrefFor={(s) => recordsFor({ species: s.slug })} />
      </Card>

      {d.parcels.length > 1 && (
        <Card
          title={`When each part of ${place.name} was planted`}
          foot={`Each row is one part of ${place.name}; each column one season. Open a part for its own species and records.`}
        >
          <PlantingTimeline
            records={d.records}
            seasons={d.seasons.map((p) => p.season)}
            rowsBy="part"
            rowHref={(r) => partHref(place.slug, r.name)}
            hrefFor={(r, season) => recordsFor({ parcel: r.parcelId, season: season.name, year: season.year })}
          />
        </Card>
      )}

      <Card
        title="When each tree went in"
        foot={`Every species recorded ${place.isScheme ? "through" : "at"} ${place.name}, largest first, season by season.`}
      >
        <PlantingTimeline
          records={d.records}
          seasons={d.seasons.map((p) => p.season)}
          rowsBy="species"
          rowHref={(r) => (r.species ? recordsFor({ species: r.species.slug }) : recordsFor())}
          hrefFor={(r, season) => recordsFor({ species: r.species?.slug, season: season.name, year: season.year })}
        />
      </Card>

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

      {year !== undefined && <YearView place={place} year={year} rows={d.records} />}

      {d.parcels.length > 1 && (
        <Card
          title={`Parts of this site (${d.parcels.length})`}
          action={<SplitKey />}
          foot="Parts are WRT’s registered sub-sites; their recorded plants add up to the site. Open a part for its own species, seasons and records."
        >
          <SiteRows
            max={Math.max(1, ...d.parcels.map((p) => p.split.total))}
            rows={d.parcels.map((p) => {
              const recs = d.records.filter((r) => r.record.parcelId === p.item.id);
              const species = [...speciesBySite(recs).values()][0]?.species ?? [];
              const href = partHref(place.slug, p.item.name);
              return {
                key: p.item.id,
                name: p.item.name,
                href,
                split: p.split,
                species,
                meta: (
                  <>
                    {spanLabel(p.span)}
                    {" · "}
                    {p.span.seasonsActive} {p.span.seasonsActive === 1 ? "season" : "seasons"} · {species.length} species
                  </>
                ),
                totalHref: href,
                moreHref: href,
                speciesHref: (s) => recordsFor({ parcel: p.item.id, species: s.slug }),
              };
            })}
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
