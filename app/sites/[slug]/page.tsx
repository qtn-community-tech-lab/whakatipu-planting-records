import type { Metadata } from "next";
import { first } from "@/lib/wrt/params";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { getPublicWrt } from "@/lib/wrt/public-server";
import { speciesAtPlaces, tileRows } from "@/lib/wrt/presentation";
import { SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { spanLabel, formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, CardLink, Rule, EmptyState } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { QuantityFigure, SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns, YearTable } from "@/components/wrt/shared/charts";
import { ChipLinks } from "@/components/wrt/sites/filter-chips";
import { YearView } from "@/components/wrt/sites/year-view";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows, partHref } from "@/components/wrt/sites/site-rows";
import { PlantingTimeline } from "@/components/wrt/sites/planting-timeline";
import { LocationCard } from "@/components/wrt/sites/location-card";
import Link from "next/link";
import { readSite } from "@/db/queries/sites";
import { isAuthenticated } from "@/db/queries/auth";
import { Button } from "@/components/ui/button";

type Props = Readonly<PageProps<"/sites/[slug]">>;

export async function generateStaticParams() {
  const places = await getPublicWrt().places();
  return places.map((p) => ({ slug: p.item.slug }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const [site, d] = await Promise.all([readSite(slug), getPublicWrt().place(slug)]);
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
  const [site, d, authenticated] = await Promise.all([readSite(slug), getPublicWrt().place(slug), isAuthenticated()]);
  if (!site) notFound();

  const siteReturn = `/sites/${slug}${first(sp.year)
    ? `?year=${encodeURIComponent(first(sp.year)!)}`
    : ""}`;
  const status = site.deactivated_at ? <Alert role="status">
    <AlertTitle><Badge tone="soft">Deactivated</Badge></AlertTitle>
    <AlertDescription>
      <p>This site is unavailable for new planting events. Its historical records and recorded quantities are retained.</p>
      <Link href="/sites?state=deactivated" className="cn-link">View deactivated sites</Link>
    </AlertDescription>
  </Alert> : null;
  const canManageSite = authenticated && !site.deactivated_at;
  const actions = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Site actions">
      {canManageSite && (
        <>
          <Button asChild variant="secondary">
            <Link href={`/sites/${slug}/edit`}>Edit site</Link>
          </Button>
          <Button asChild variant="primary">
            <Link href={hrefs.newEvent({ site: slug, returnTo: siteReturn })}>Record a planting</Link>
          </Button>
        </>
      )}
    </div>
  );
  const savedNotice = first(sp.saved) === "1" ? <Alert role="status"><AlertTitle>Changes saved</AlertTitle><AlertDescription>The site and its areas have been saved.</AlertDescription></Alert> : null;
  if (!d || !d.split.records)
    return (
      <>
        {status}
        <PageHead back={{ href: "/sites", label: "All sites" }} title={site.name} lead={site.description.trim() || undefined} aside={canManageSite ? actions : undefined} />
        {savedNotice}
        <LocationCard sites={[site]} totals={[]} siteName={site.name} />
        <EmptyState title="No planting records yet">This site has no planting records yet.</EmptyState>
      </>
    );

  const { split, span } = d;
  const place = { ...d.place, name: site.name };
  const yearParam = Number(first(sp.year));
  const year = d.years.some((y) => y.year === yearParam) ? yearParam : undefined;

  const classes = place.siteClasses.map((c) => SITE_CLASS_LABELS[c]).join(" and ");
  const spanText = spanLabel(span);
  const eyebrow = `${classes} site · ${spanText}`;
  const title = span.first.slug === span.last.slug
    ? `${formatNumber(split.total)} recorded plants at ${place.name} in ${span.first.label}`
    : `${formatNumber(split.total)} recorded plants at ${place.name} since ${span.first.label}`;

  const recordsFor = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, ...extra });


  const activeSeasons = d.seasons.filter((s) => s.split.records > 0).length;

  return (
    <>
      <PageHead
        back={{ href: "/sites", label: "All sites" }}
        aside={canManageSite ? actions : undefined}
        eyebrow={eyebrow}
        title={title}
        lead={site.description.trim() || undefined}
      />

      {status}
      {savedNotice}

      <LocationCard key={place.slug} sites={[place]} totals={d.areaTotals} siteName={place.name} />

      <Card title="Recorded plants by season" action={<SplitKey spring />}
        foot={
          <>
            Recorded in {activeSeasons} of {d.seasons.length} seasons; empty columns are seasons with no records for this
            {" site"}. Each column opens that season’s records.
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
        </div>
      </Card>

      <Card
        title={`Trees recorded at ${place.name} (${formatNumber(d.species.length)} species)`}
        action={<CardLink href={recordsFor()}>All {formatNumber(split.records)} records</CardLink>}
        foot="Largest first, across every season. Select a species for its records here. Pick a year below to see what went in that year."
      >
        <SpeciesTiles rows={tileRows(d.cells, "seasons")} spread="seasons" hrefFor={(s) => recordsFor({ species: s.slug })} />
      </Card>

      {d.parcels.length > 1 && (
        <Card
          title={`When each part of ${place.name} was planted`}
          foot={`Each row is one part of ${place.name}; each column one season. Open a part for its own species and records.`}
        >
          <PlantingTimeline
            cells={d.cells}
            seasons={d.seasons.map((p) => p.season)}
            rowsBy="part"
            rowHref={(r) => partHref(place.slug, place.parcels.find((p) => p.id === r.parcelId)!.slug)}
            hrefFor={(r, season) => recordsFor({ parcel: r.parcelId, season: season.name, year: season.year })}
          />
        </Card>
      )}

      <Card
        title="When each tree went in"
        foot={`Every species recorded at ${place.name}, largest first, season by season.`}
      >
        <PlantingTimeline
          cells={d.cells}
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

      {year !== undefined && <YearView place={place} year={year} cells={d.cells} />}

      {d.parcels.length > 1 && (
        <Card
          title={`Parts of this site (${d.parcels.length})`}
          action={<SplitKey />}
          foot="Parts are WRT’s registered sub-sites; their recorded plants add up to the site. Open a part for its own species, seasons and records."
        >
          <SiteRows
            max={Math.max(1, ...d.parcels.map((p) => p.split.total))}
            rows={d.parcels.map((p) => {
              const recs = d.partCells.filter((cell) => cell.parcel?.id === p.item.id);
              const species = [...speciesAtPlaces(recs).values()][0]?.species ?? [];
              const href = partHref(place.slug, p.item.slug);
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

      <p className="m-0">
        <CardLink href={recordsFor()}>
          All {formatNumber(split.records)} record{split.records === 1 ? "" : "s"} for {place.name}
        </CardLink>
      </p>
      <Rule>Recorded plants come from WRT’s allocation sheets, so they are not verified plantings.</Rule>
    </>
  );
}
