import Image from "next/image";
import { Description } from "@/components/wrt/species/species-profile";
import type { Metadata } from "next";
import { getWrt } from "@/lib/wrt/server";
import { emptySplit } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Card, PageHead, Rule } from "@/components/wrt/shared/page";
import { SpeciesName } from "@/components/wrt/shared/names";
import { SplitLine } from "@/components/wrt/shared/quantity";
import { SpeciesMarkers } from "@/components/wrt/species/species-meta";

export const metadata: Metadata = {
  title: "Species reference guide",
  description: "Species names, Māori names, identification notes, licensed image references and research gaps for WRT’s planting history.",
};

export default async function SpeciesPhotosPage() {
  const all = await getWrt().speciesList();
  const rows = all;
  const split = emptySplit();
  for (const row of rows) {
    for (const key of Object.keys(split) as (keyof typeof split)[]) split[key] += row.split[key];
  }
  const total = all.reduce((sum, row) => sum + row.split.total, 0);
  return (
    <>
      <PageHead
        back={{ href: "/species", label: "All species" }}
        eyebrow="Species · Field guide"
        title={`Meet ${rows.length} species in the planting history`}
        lead={<>Ranked by recorded plants across all sites and seasons.
          These {rows.length} species account for {formatNumber(split.total)} plants—{total ? Math.round(split.total / total * 100) : 0}% of the recorded total.</>}
      />
      <Card title="Before you head out" action={<SplitLine split={split} />}>
        <p className="wrt-prose m-0">Species descriptions and reference images come from the saved catalogue. Sources and photo credits appear in each description. Reference photos do not confirm observations at a WRT site.</p>
      </Card>
      <div className="wrt-photo-grid">
        {rows.map((row, index) => {
          return (
            <Card key={row.item.id} id={`guide-${row.item.slug}`} className="wrt-photo-card">
              <div className="flex items-start justify-between gap-3">
                <SpeciesName species={row.item} link size="lg" />
                <span className="wrt-muted tabular-nums">#{index + 1}</span>
              </div>
              <p className="wrt-photo-count"><b>{formatNumber(row.split.total)}</b> recorded plants · {row.placeCount} sites</p>
              <SpeciesMarkers species={row.item} />
              {row.item.imageUrl && <Image src={row.item.imageUrl} width={640} height={480} alt={row.item.scientificName} unoptimized />}
              <Description text={row.item.description} />

            </Card>
          );
        })}
      </div>
      <Rule>Ranking follows the database. Reference photos show species appearance, not observations at a planting site.</Rule>
    </>
  );
}
