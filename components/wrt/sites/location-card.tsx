import { Card, EmptyState } from "@/components/wrt/page";
import { RegionMap } from "@/components/wrt/sites/region-map";
import { locationsForSites } from "@/lib/wrt/site-locations";
import type { PlantingRecord } from "@/lib/wrt/types";

export function LocationCard({ sites, records, siteName }: { sites: { slug: string; name: string }[]; records: PlantingRecord[]; siteName?: string }) {
  const locations = locationsForSites(sites, records);
  const mappedSites = new Set(locations.map((location) => location.siteSlug)).size;
  return (
    <Card title={siteName ? `Where to find ${siteName}` : "Explore planting locations"}
      foot={locations.length ? (
        <>
          {!siteName && `${mappedSites} of ${sites.length} listed sites have reference locations. `}
          Points show approximate landmarks or historic planting-day locations, not planting boundaries.
          {locations.length > mappedSites && " Some sites have several reference points."}
          {" Marker labels show recorded plants in the current view; separate markers use their part’s count."}
          {locations.some((location) => location.split.needsReview > 0) && " An amber dot marks counts that include records needing review."}
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
