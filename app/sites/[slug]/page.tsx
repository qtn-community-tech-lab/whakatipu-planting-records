import type { Metadata } from "next";
import { type RawParams, first } from "@/lib/wrt/params";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import { speciesBySite } from "@/lib/wrt/queries";
import { SITE_CLASS_LABELS } from "@/lib/wrt/labels";
import { spanLabel, formatNumber } from "@/lib/wrt/text";
import { PageHead, Card, CardLink, Rule } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { QuantityFigure } from "@/components/wrt/shared/quantity";
import { SeasonColumns, YearTable } from "@/components/wrt/shared/charts";
import { ChipLinks } from "@/components/wrt/sites/filter-chips";
import { YearView } from "@/components/wrt/sites/year-view";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows, partHref } from "@/components/wrt/sites/site-rows";
import { PlantingTimeline } from "@/components/wrt/sites/planting-timeline";
import { LocationCard } from "@/components/wrt/sites/location-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const d = await getWrt().place(slug);
  if (!d) return { title: "Site not found" };
  return {
    title: d.place.name,
    description: `${formatNumber(d.split.total)} recorded plants at ${d.place.name}, by season, year and species.`,
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await getWrt().place(slug);
  if (!d) notFound();

  const { place, split, span } = d;
  const yearParam = Number(first(sp.year));
  const year = d.years.some((y) => y.year === yearParam) ? yearParam : undefined;

  const classes = place.siteClasses.map((c) => SITE_CLASS_LABELS[c]).join(" and ");
  const spanText = spanLabel(span);
  const eyebrow = place.isScheme ? `Order scheme, not a place · ${spanText}` : `${classes} site · ${spanText}`;
  const title = `${formatNumber(split.total)} recorded plants at ${place.name}`;

  const recordsFor = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, ...extra });

  const activeSeasons = d.seasons.filter((s) => s.split.records > 0).length;

  return (
    <>
      <PageHead
        back={{ href: "/sites", label: "All sites" }}
        eyebrow={eyebrow}
        title={title}
        lead={
          place.isScheme
            ? "Paper4Trees is an order scheme, not a place. Its plants are recorded against the scheme and its saved records are included in the totals."
            : undefined
        }
      />

      {place.description && <Card title="About this site"><p className="wrt-prose whitespace-pre-line m-0">{place.description}</p></Card>}
      {!place.isScheme && <LocationCard key={place.slug} sites={[place]} records={d.records.map((row) => row.record)} siteName={place.name} />}

      <Card title="Recorded plants by season" foot={`Recorded in ${activeSeasons} of ${d.seasons.length} seasons. Each column opens that season’s records.`}>
        <div className="flex flex-col gap-6">
          <QuantityFigure split={split} />
          <SeasonColumns points={d.seasons} caption={`Recorded plants by season at ${place.name}`} hrefFor={(p) => recordsFor({ season: p.season.name })} />

        </div>
      </Card>

      <Card
        title={`Trees recorded ${place.isScheme ? "through" : "at"} ${place.name} (${formatNumber(d.species.length)} species)`}
        action={<CardLink href={recordsFor()}>All {formatNumber(split.records)} records</CardLink>}
        foot="Largest first, across every season. Select a species for its records here. Pick a year below to see what went in that year."
      >
        <SpeciesTiles records={d.records} spread="seasons" hrefFor={(s) => recordsFor({ species: s.slug })} />
      </Card>

      {d.parcels.length > 0 && (
        <Card title={`When each part of ${place.name} was planted`} foot={`Each row is one part of ${place.name}; each column one season. Open a part for its own species and records.`}>
          <PlantingTimeline records={d.records} seasons={d.seasons.map((p) => p.season)} rowsBy="part"
            rowHref={(r) => partHref(place.slug, r.areaSlug ?? "")}
            hrefFor={(r, season) => recordsFor({ parcel: r.areaSlug, season: season.name })} />
        </Card>
      )}
      <Card title="When each tree went in" foot={`Every species recorded at ${place.name}, largest first, season by season.`}>
        <PlantingTimeline records={d.records} seasons={d.seasons.map((p) => p.season)} rowsBy="species"
          rowHref={(r) => r.species ? recordsFor({ species: r.species.slug }) : recordsFor()}
          hrefFor={(r, season) => recordsFor({ species: r.species?.slug, season: season.name })} />
      </Card>

      <Card
        title="Year by year"
        foot={
          <>
            Year totals include records with known planting dates at {place.name}. Pick a year to see which species went
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

          />
        </div>
      </Card>

      {year !== undefined && <YearView place={place} year={year} rows={d.records} />}

      {d.parcels.length > 0 && (
        <Card
          title={`Parts of this site (${d.parcels.length})`}

          foot="Parts are WRT’s registered sub-sites; their recorded plants add up to the site. Open a part for its own species, seasons and records."
        >
          <SiteRows
            max={Math.max(1, ...d.parcels.map((p) => p.split.total))}
            rows={d.parcels.map((p) => {
              const recs = d.records.filter((r) => r.record.parcelId === p.item.id);
              const species = [...speciesBySite(recs).values()][0]?.species ?? [];
              const href = partHref(place.slug, p.item.slug);
              return {
                key: p.item.id,
                name: p.item.name,
                href,
                split: p.split,
                species,
                meta: (
                  <>
                                        {species.length} species
                  </>
                ),
                totalHref: href,
                moreHref: href,
                speciesHref: (s) => recordsFor({ parcel: p.item.slug, species: s.slug }),
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
      <Rule>Totals sum known saved counts. Unknown quantities and dates remain unknown.</Rule>
    </>
  );
}
