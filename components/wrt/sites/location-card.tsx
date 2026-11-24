import { Card, EmptyState } from "@/components/wrt/shared/page";
import { RegionMap } from "@/components/wrt/sites/region-map";
import { locationsForAreaTotals } from "@/lib/wrt/site-locations";
import type { QuantitySplit } from "@/lib/wrt/types";
import { listPlantingAreaPins } from "@/db/queries/sites";
import { regionMapOptions } from "@/lib/wrt/map-region";
import type { AreaBoundary } from "@/lib/wrt/areas/geometry";

export async function LocationCard({ sites, totals, siteName }: { sites: { slug: string; name: string }[]; totals: { area: string; split: QuantitySplit }[]; siteName?: string }) {
  const areas = await listPlantingAreaPins();
  const locations = locationsForAreaTotals(areas, sites, totals);
  const visible = new Set(sites.map((site) => site.slug));
  const boundaries: AreaBoundary[] = [];
  const mappedSites = new Set(locations.map((location) => location.siteSlug));
  for (const { site, boundary } of areas) {
    if (!visible.has(site) || !boundary) continue;
    boundaries.push(boundary);
    mappedSites.add(site);
  }
  const mapOptions = regionMapOptions([
    ...areas,
    ...boundaries.flatMap(({ coordinates: [ring] }) => ring.map(([lng, lat]) => ({ lng, lat }))),
  ]);
  return (
    <Card title={siteName ? `Where to find ${siteName}` : "Explore planting locations"}
      foot={mappedSites.size ? (
        <>
          {!siteName && `${mappedSites.size} of ${sites.length} listed sites are mapped. `}
          {boundaries.length > 0 && "Blue outlines show named areas. "}
          {locations.length > 0 && "Marker labels show recorded plants at each site or part."}
        </>
      ) : undefined}>
      {mappedSites.size ? (
        <RegionMap locations={locations} boundaries={boundaries} siteName={siteName} mapOptions={mapOptions} />
      ) : (
        <EmptyState title="Location not yet mapped">
          {siteName ? "No approximate location has been added for this site yet." : "No reference locations are available for these sites."}
        </EmptyState>
      )}
    </Card>
  );
}
