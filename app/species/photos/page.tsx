import type { Metadata } from "next";
import { getPublicWrt } from "@/lib/wrt/public-server";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import { emptySplit } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Card, PageHead, Rule } from "@/components/wrt/shared/page";
import { SpeciesName } from "@/components/wrt/shared/names";
import { SplitLine } from "@/components/wrt/shared/quantity";
import { SpeciesMarkers } from "@/components/wrt/species/species-meta";
import { PhotoMedia } from "@/components/wrt/species/photo-media";
import { SpeciesReferenceContent } from "@/components/wrt/species/species-reference";

export const metadata: Metadata = {
  title: "Species reference guide",
  description: "Species names, Māori names, identification notes and licensed image references for WRT’s planting history.",
};

export default async function SpeciesPhotosPage() {
  const all = await getPublicWrt().speciesList("full");
  const rows = topPlantedSpecies(all.filter((row) => row.item.deactivatedAt === null));
  const split = emptySplit();
  for (const row of rows) {
    for (const key of Object.keys(split) as (keyof typeof split)[]) split[key] += row.split[key];
  }
  const total = all.reduce((sum, row) => sum + row.split.total, 0);
  const referenceCount = rows.filter((row) => row.item.summary && row.item.sources.length > 0).length;
  const completePhotoCount = rows.filter((row) => row.item.photos.length >= 3).length;
  const partialPhotoCount = rows.filter((row) => {
    const count = row.item.photos.length;
    return count > 0 && count < 3;
  }).length;
  const photoCount = rows.reduce((sum, row) => sum + row.item.photos.length, 0);
  return (
    <>
      <PageHead
        back={{ href: "/species", label: "All species" }}
        eyebrow="Species · Field guide"
        title={`Meet ${rows.length} species in the planting history`}
        lead={<>Ranked by recorded plants across all sites and seasons.
          These {rows.length} active species account for {formatNumber(split.total)} plants—{total ? Math.round(split.total / total * 100) : 0}% of the recorded total.</>}
      />
      <Card title="Before you head out" action={<SplitLine split={split} />}>
        <p className="wrt-prose m-0">{referenceCount} species have sourced identification notes. {completePhotoCount} species have at least three reference photos; {partialPhotoCount} {partialPhotoCount === 1 ? "has" : "have"} one or two. There are {photoCount} image references in total. Herbarium specimens are labelled. Photos were taken at other locations.
          They show what a species can look like, and do not confirm what is growing at a WRT site today.
          Young plants may look different. Previews are cropped to fit; open Full image for the entire frame. Select a species name to see its planting history and review notes.</p>
      </Card>
      <div className="wrt-photo-grid">
        {rows.map((row, index) => {
          const photos = row.item.photos;
          const photo = photos[0];
          return (
            <Card key={row.item.id} id={`guide-${row.item.slug}`} className="wrt-photo-card">
              <div className="flex items-start justify-between gap-3">
                <SpeciesName species={row.item} link size="lg" />
                <span className="wrt-muted tabular-nums">#{index + 1}</span>
              </div>
              <p className="wrt-photo-count"><b>{formatNumber(row.split.total)}</b> recorded plants · {row.placeCount} sites</p>
              <SpeciesMarkers species={row.item} />
              {row.item.summary && <SpeciesReferenceContent species={row.item} />}
              {photo ? <>
                <PhotoMedia photo={photo} name={row.item.displayName} variant="guide" />
                {photos.length > 1 && <details className="wrt-photo-more"><summary>View {photos.length - 1} more photos</summary>
                  <div className="wrt-photo-pair">{photos.slice(1).map((extra) => <PhotoMedia key={extra.src} photo={extra} name={row.item.displayName} variant="guide" />)}</div>
                </details>}
              </> : <p className="wrt-muted">No reference photo is recorded for this species.</p>}
            </Card>
          );
        })}
      </div>
      <Rule>Ranking follows the database. Names awaiting a WRT ruling stay separate; photos do not resolve disputed names.</Rule>
    </>
  );
}
