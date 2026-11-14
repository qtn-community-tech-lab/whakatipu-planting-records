import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWrt } from "@/lib/wrt/server";
import type { PlaceDetail, SeasonPoint } from "@/lib/wrt/queries";
import { speciesBySite, needsReviewByPlants, splitOf } from "@/lib/wrt/queries";
import { spanLabel, formatNumber, slugify } from "@/lib/wrt/text";
import { Card, CardLink, PageHead, Rule } from "@/components/wrt/shared/page";
import { QuantityFigure, SplitKey } from "@/components/wrt/shared/quantity";
import { SeasonColumns } from "@/components/wrt/shared/charts";
import { RecordsTable } from "@/components/wrt/shared/records";
import { hrefs } from "@/components/wrt/shared/names";
import { Badge } from "@/components/ui/badge";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows, partHref } from "@/components/wrt/sites/site-rows";
import { PlantingTimeline } from "@/components/wrt/sites/planting-timeline";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/db/queries/access";
import { readSite } from "@/db/queries/sites";

type Props = Readonly<PageProps<"/sites/[slug]/parts/[part]">>;

const REVIEW_CAP = 25;

export async function generateStaticParams() {
  const places = await getWrt().places();
  return places.flatMap((p) =>
    p.item.parcels.length > 1 ? p.item.parcels.map((parcel) => ({ slug: p.item.slug, part: slugify(parcel.name) })) : [],
  );
}

function findPart(d: PlaceDetail | null, part: string) {
  return d?.parcels.find((p) => slugify(p.item.name) === part) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, part } = await params;
  const d = await getWrt().place(slug);
  const p = findPart(d, part);
  if (!d || !p) return { title: "Part not found" };
  return {
    title: `${p.item.name} · ${d.place.name}`,
    description: `${formatNumber(p.split.total)} recorded plants at ${p.item.name}, part of ${d.place.name}.`,
  };
}

export default async function PartPage({ params }: Props) {
  const { slug, part } = await params;
  const wrt = getWrt();
  const [d, allSeasons, site, authenticated] = await Promise.all([wrt.place(slug), wrt.seasons(), readSite(slug), isAuthenticated()]);
  const p = findPart(d, part);
  if (!d || !p) notFound();

  const { place } = d;
  const parcel = p.item;
  const recs = d.records.filter((r) => r.record.parcelId === parcel.id);
  const split = splitOf(recs.map((r) => r.record));
  const span = p.span;
  const spanText = spanLabel(span);
  const recordsFor = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, parcel: parcel.id, ...extra });

  const points: SeasonPoint[] = allSeasons.map(({ season }) => ({
    season,
    split: splitOf(recs.filter((r) => r.season.slug === season.slug).map((r) => r.record)),
  }));
  const speciesCount = new Set(recs.map((r) => r.species.slug)).size;
  const needsReview = needsReviewByPlants(recs);
  const aliases = [...new Set(parcel.aliases)].filter((a) => a && a !== parcel.name);

  const siblings = d.parcels.filter((x) => x.item.id !== parcel.id);
  const at = d.parcels.findIndex((x) => x.item.id === parcel.id);

  return (
    <>
      {authenticated && site && !site.deactivated_at && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="secondary"><Link href={hrefs.newEvent({ site: place.slug, part: parcel.id })}>Add planting event</Link></Button>
        </div>
      )}
      <PageHead
        back={{ href: hrefs.place(place.slug), label: place.name }}
        eyebrow={`Part of ${place.name} · ${spanText} · ${span.seasonsActive} ${span.seasonsActive === 1 ? "season" : "seasons"}`}
        title={`${formatNumber(split.total)} recorded plants at ${parcel.name}`}
        lead={`${formatNumber(speciesCount)} species on ${formatNumber(split.records)} record${split.records === 1 ? "" : "s"}. No. ${at + 1} of ${d.parcels.length} parts of ${place.name} by recorded plants.`}
        aside={
          <Link href={recordsFor()} className="cn-btn cn-btn--soft cn-btn--sm !no-underline">
            All {formatNumber(split.records)} records →
          </Link>
        }
      />

      <Card
        title="Recorded plants by season"
        action={<SplitKey spring />}
        foot={`Recorded in ${span.seasonsActive} of ${allSeasons.length} seasons. Each column opens that season’s records for ${parcel.name}.`}
      >
        <div className="flex flex-col gap-6">
          <QuantityFigure split={split} />
          <SeasonColumns
            points={points}
            caption={`Recorded plants by season at ${parcel.name}`}
            hrefFor={(pt) => recordsFor({ season: pt.season.name, year: pt.season.year })}
          />
        </div>
      </Card>

      <Card
        title={`Trees recorded at ${parcel.name} (${formatNumber(speciesCount)} species)`}
        action={<CardLink href={recordsFor()}>All records</CardLink>}
        foot="Largest first, across every season. Select a species for its records here."
      >
        <SpeciesTiles records={recs} spread="seasons" hrefFor={(s) => recordsFor({ species: s.slug })} />
      </Card>

      <Card
        title="When each tree went in"
        foot={`Every species recorded at ${parcel.name}, largest first, season by season.`}
      >
        <PlantingTimeline
          records={recs}
          seasons={allSeasons.map((x) => x.season)}
          rowsBy="species"
          rowHref={(r) => (r.species ? recordsFor({ species: r.species.slug }) : recordsFor())}
          hrefFor={(r, season) => recordsFor({ species: r.species?.slug, season: season.name, year: season.year })}
        />
      </Card>

      {needsReview.length > 0 && (
        <Card
          title={`${formatNumber(needsReview.length)} record${needsReview.length === 1 ? "" : "s"} needing review here`}
          variant="table"
          action={<CardLink href={recordsFor({ review: "needs-review" })}>See them all</CardLink>}
          foot={
            needsReview.length > REVIEW_CAP
              ? `The ${REVIEW_CAP} largest of ${formatNumber(needsReview.length)}. Open Source on a row for the spreadsheet cell.`
              : "Open Source on a row for the spreadsheet cell it came from."
          }
        >
          <RecordsTable rows={needsReview.slice(0, REVIEW_CAP)} hide={["site"]} caption={`Records needing review at ${parcel.name}`} />
        </Card>
      )}

      {aliases.length > 0 && (
        <Card title="Names found in WRT’s spreadsheets" foot="Every column header that was matched to this part. Search matches all of them.">
          <div className="wrt-pills">
            {aliases.map((a) => (
              <Badge key={a} tone="soft">{a}</Badge>
            ))}
          </div>
        </Card>
      )}

      {siblings.length > 0 && (
        <Card
          title={`Other parts of ${place.name}`}
          action={<CardLink href={hrefs.place(place.slug)}>{place.name}</CardLink>}
        >
          <SiteRows
            max={Math.max(1, ...d.parcels.map((x) => x.split.total))}
            rows={siblings.map((x) => {
              const xr = d.records.filter((r) => r.record.parcelId === x.item.id);
              const species = [...speciesBySite(xr).values()][0]?.species ?? [];
              const href = partHref(place.slug, x.item.name);
              return {
                key: x.item.id,
                name: x.item.name,
                href,
                split: x.split,
                species,
                meta: <>{species.length} species</>,
                totalHref: href,
                moreHref: href,
                speciesHref: (s) => hrefs.records({ place: place.slug, parcel: x.item.id, species: s.slug }),
              };
            })}
          />
        </Card>
      )}

      <Rule>
        <Link href={recordsFor()} className="cn-link">
          All {formatNumber(split.records)} records for {parcel.name}, with the source cell for each →
        </Link>
      </Rule>
    </>
  );
}
