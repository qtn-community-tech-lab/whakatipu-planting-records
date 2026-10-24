import { Card, EmptyState } from "@/components/wrt/shared/page";
import { RegionMap } from "@/components/wrt/sites/region-map";
import { locationsForSites } from "@/lib/wrt/site-locations";
import type { Place, PlantingRecord } from "@/lib/wrt/types";

export function LocationCard({ sites, records, siteName }: { sites: Place[]; records: PlantingRecord[]; siteName?: string }) {
  const locations = locationsForSites(sites, records);
  const mappedSites = new Set(locations.map((location) => location.siteSlug)).size;
  return (
    <Card title={siteName ? `Where to find ${siteName}` : "Explore planting locations"}
      foot={locations.length ? (
        <>
          {!siteName && `${mappedSites} of ${sites.length} listed sites have reference locations. `}
          Points show approximate landmarks or historic planting-day locations, not planting boundaries.
          {locations.length > mappedSites && " Some sites have several reference points."}
          {" Marker labels show recorded plants in the current view; each record is counted at its assigned site or area pin."}
          {locations.some((location) => location.countScope === "part") && " Unmapped parts are not included in marker totals."}
        </>
      ) : undefined}>
      {locations.length ? (
        <RegionMap locations={locations} siteName={siteName} />
      ) : (
        <EmptyState title="Location not yet mapped">
          {siteName ? "No approximate location has been added for this site yet." : "No reference locations are available for these sites."}
        </EmptyState>
      )}
    </Card>
  );
}
