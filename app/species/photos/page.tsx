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
import { getSpeciesProfile, SPECIES_PROFILE_LIMIT } from "@/lib/wrt/species-profiles";
import { SpeciesProfileContent } from "@/components/wrt/species/species-profile";
import { SpeciesReferenceStatus } from "@/components/wrt/species/species-reference-status";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

export const metadata: Metadata = {
  title: "Species reference guide",
  description: "Species names, Māori names, identification notes, licensed image references and research gaps for WRT’s planting history.",
};

export default async function SpeciesPhotosPage() {
  const all = await getWrt().speciesList();
  const rows = topPlantedSpecies(all, SPECIES_PROFILE_LIMIT);
  const split = emptySplit();
  for (const row of rows) {
    for (const key of Object.keys(split) as (keyof typeof split)[]) split[key] += row.split[key];
  }
  const total = all.reduce((sum, row) => sum + row.split.total, 0);
  const profileCount = rows.filter((row) => getSpeciesProfile(row.item.id) && getSpeciesReferenceReview(row.item.id)?.status !== "unresolved").length;
  const unresolvedCount = rows.filter((row) => getSpeciesReferenceReview(row.item.id)?.status === "unresolved").length;
  const completePhotoCount = rows.filter((row) => getSpeciesPhotos(row.item.id).length >= 3).length;
  const partialPhotoCount = rows.filter((row) => {
    const count = getSpeciesPhotos(row.item.id).length;
    return count > 0 && count < 3;
  }).length;
  const photoCount = rows.reduce((sum, row) => sum + getSpeciesPhotos(row.item.id).length, 0);
  return (
    <>
      <PageHead
        back={{ href: "/species", label: "All species" }}
        eyebrow="Species · Field guide"
        title={`Meet ${rows.length} species in the planting history`}
        lead={<>Ranked by recorded plants across all sites and seasons, including records needing review.
          These {rows.length} species account for {formatNumber(split.total)} plants—{Math.round(split.total / total * 100)}% of the recorded total.</>}
      />
      <Card title="Before you head out" action={<SplitLine split={split} />}>
        <p className="wrt-prose m-0">{profileCount} species have sourced identification profiles.{unresolvedCount > 0 && <> {unresolvedCount} recorded {unresolvedCount === 1 ? "name awaits" : "names await"} identification.</>} {completePhotoCount} species have three confirmed reference photos; {partialPhotoCount} {partialPhotoCount === 1 ? "has" : "have"} one or two. There are {photoCount} image references in total. Remaining gaps and uncertain identities are noted beside each species. Herbarium specimens are labelled. Photos were taken at other locations.
          They show what a species can look like, and do not confirm what is growing at a WRT site today.
          Young plants may look different. Previews are cropped to fit; open Full image for the entire frame. Select a species name to see its planting history and review notes.</p>
      </Card>
      <div className="wrt-photo-grid">
        {rows.map((row, index) => {
          const photos = getSpeciesPhotos(row.item.id);
          const profile = getSpeciesProfile(row.item.id);
          const photo = photos[0];
          return (
            <Card key={row.item.id} id={`guide-${row.item.slug}`} className="wrt-photo-card">
              <div className="flex items-start justify-between gap-3">
                <SpeciesName species={row.item} link size="lg" />
                <span className="wrt-muted tabular-nums">#{index + 1}</span>
              </div>
              <p className="wrt-photo-count"><b>{formatNumber(row.split.total)}</b> recorded plants · {row.placeCount} sites</p>
              <SpeciesMarkers species={row.item} />
              {profile && <SpeciesProfileContent profile={profile} />}
              <SpeciesReferenceStatus speciesId={row.item.id} />
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
