import { splitOf } from "./queries";
import type { Location, Place, PlantingRecord, Quantity } from "./types";

export interface SiteLocation extends Location { siteSlug: string; description: string }
export interface MappedSiteLocation extends SiteLocation { siteName: string; split: Quantity; countScope: "site" | "part" }

/** Use one marker per saved coordinate per site, combining areas sharing a site pin. */
export function locationsForSites(sites: readonly Place[], records: readonly PlantingRecord[]): MappedSiteLocation[] {
  return sites.flatMap((site) => {
    const groups = new Map<string, { pin: Location; areaIds: string[] }>();
    if (site.location) groups.set(site.location.id, { pin: site.location, areaIds: [] });
    for (const area of site.parcels) {
      const pin = area.location ?? site.location;
      if (!pin) continue;
      const group = groups.get(pin.id) ?? { pin, areaIds: [] };
      group.areaIds.push(area.id);
      groups.set(pin.id, group);
    }
    return [...groups.values()].map(({ pin, areaIds }) => {
      const wholeSite = pin.id === site.location?.id;
      // Whole-site markers count only site-level lines and areas using this pin,
      // so a site's own marker and its distinct area markers do not double-count.
      const matching = records.filter((r) => r.placeSlug === site.slug &&
        (r.parcelId === null ? wholeSite : areaIds.includes(r.parcelId)));
      return { ...pin, id: `${site.slug}:${pin.id}`, siteSlug: site.slug, siteName: site.name,
        description: site.description, split: splitOf(matching), countScope: wholeSite ? "site" as const : "part" as const };
    });
  });
}
export const compactPlantCount = (quantity: number) => new Intl.NumberFormat("en-NZ", { notation: "compact", maximumFractionDigits: 1 }).format(quantity).toLowerCase();
export function locationBounds(locations: readonly Pick<Location, "longitude" | "latitude">[]): [[number, number], [number, number]] | null {
  if (!locations.length) return null;
  return [[Math.min(...locations.map((p) => p.longitude)), Math.min(...locations.map((p) => p.latitude))], [Math.max(...locations.map((p) => p.longitude)), Math.max(...locations.map((p) => p.latitude))]];
}
export const locationMapUrl = (location: Pick<Location, "latitude" | "longitude">) => `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
export function groupNearbyLocations(points: readonly { x: number; y: number }[], radius = 60): number[][] {
  const remaining = new Set(points.map((_, index) => index));
  const groups: number[][] = [];
  for (const start of remaining) {
    remaining.delete(start);
    const group = [start];
    for (const index of group) for (const other of remaining) if (Math.hypot(points[index].x - points[other].x, points[index].y - points[other].y) < radius) { group.push(other); remaining.delete(other); }
    groups.push(group);
  }
  return groups;
}
