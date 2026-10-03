import type { Metadata } from "next";
import { getWrt } from "@/lib/wrt/server";
import { getSpeciesPhotos, topPlantedSpecies } from "@/lib/wrt/species-photos";
import { emptySplit } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Card, PageHead, Rule } from "@/components/wrt/page";
import { SpeciesName } from "@/components/wrt/names";
import { SplitLine } from "@/components/wrt/quantity";
import { SpeciesMarkers } from "@/components/wrt/species/species-meta";
import { SpeciesPhotoFigure } from "@/components/wrt/species/species-photo";
import { getSpeciesProfile } from "@/lib/wrt/species-profiles";
import { SpeciesProfileContent } from "@/components/wrt/species/species-profile";

export const metadata: Metadata = {
  title: "Top 20 species · Photo guide",
  description: "Names, Māori names, identification notes and reference photos for WRT’s 20 most recorded species.",
};

export default async function SpeciesPhotosPage() {
  const all = await getWrt().speciesList();
  const rows = topPlantedSpecies(all);
  const split = emptySplit();
  for (const row of rows) {
    for (const key of Object.keys(split) as (keyof typeof split)[]) split[key] += row.split[key];
  }
  const total = all.reduce((sum, row) => sum + row.split.total, 0);
  return (
    <>
      <PageHead
        back={{ href: "/species", label: "All species" }}
        eyebrow="Species · Photo guide"
        title="Meet the 20 most planted species"
        lead={<>Ranked by recorded plants across all sites and seasons, including records needing review.
          These {rows.length} species account for {formatNumber(split.total)} plants—{Math.round(split.total / total * 100)}% of the recorded total.</>}
      />
      <Card title="Before you head out" action={<SplitLine split={split} />}>
        <p className="wrt-prose m-0">Each species has three reference images from Wiki, with two openly licensed iNaturalist photos for Olearia hectorii. They were taken at other locations.
          They show what a species can look like, and do not confirm what is growing at a WRT site today.
          Young plants may look different. Previews are cropped to fit; open Full image for the entire frame. Select a species name to see its planting history and review notes.</p>
      </Card>
      <div className="wrt-photo-grid">
        {rows.map((row, index) => {
          const photos = getSpeciesPhotos(row.item.id);
          const profile = getSpeciesProfile(row.item.id);
          const photo = photos[0];
          return (
            <Card key={row.item.id} className="wrt-photo-card">
              <div className="flex items-start justify-between gap-3">
                <SpeciesName species={row.item} link size="lg" />
                <span className="wrt-muted tabular-nums">#{index + 1}</span>
              </div>
              <p className="wrt-photo-count"><b>{formatNumber(row.split.total)}</b> recorded plants · {row.placeCount} sites</p>
              <SpeciesMarkers species={row.item} />
              {profile && <SpeciesProfileContent profile={profile} />}
              {photo ? <>
                <SpeciesPhotoFigure photo={photo} />
                {photos.length > 1 && <details className="wrt-photo-more"><summary>View {photos.length - 1} more photos</summary>
                  <div className="wrt-photo-pair">{photos.slice(1).map((extra) => <SpeciesPhotoFigure key={extra.src} photo={extra} />)}</div>
                </details>}
              </> : <p className="wrt-muted">A reference photo has not been reviewed for this species yet.</p>}
              <p className="wrt-rule m-0">{formatNumber(row.split.needsReview)} recorded plants need review.</p>
            </Card>
          );
        })}
      </div>
      <Rule>Ranking follows the database. Names awaiting a WRT ruling stay separate; photos do not resolve disputed names.</Rule>
    </>
  );
}
