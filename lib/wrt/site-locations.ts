import { splitOf } from "@/lib/wrt/queries";
import type { PlantingRecord, QuantitySplit } from "@/lib/wrt/types";
import type { Tables } from "@/db/types";

export type PlantingAreaPin = Pick<Tables<"areas">,
  "slug" | "site" | "name" | "description" | "wrt_number" | "lat" | "lng" | "pin_source_url" | "pin_checked_on"
>;

type Coordinates = { latitude: number; longitude: number };

/** Public reference points, kept separate from the historical planting ledger. */
export interface SiteLocation {
  id: string;
  siteSlug: string;
  label: string;
  latitude: number;
  longitude: number;
  description: string;
  sourceUrl: string | null;
  checkedOn: string | null;
}

export interface MappedSiteLocation extends SiteLocation {
  siteName: string;
  split: QuantitySplit;
  countScope: "site" | "part";
}

/** Pass all active areas, including unpinned ones, to identify single-area sites. */
export function locationsForSites(areas: readonly PlantingAreaPin[], sites: readonly { slug: string; name: string }[], records: readonly PlantingRecord[]): MappedSiteLocation[] {
  const names = new Map(sites.map((site) => [site.slug, site.name]));
  const areaCounts = new Map<string, number>();
  for (const area of areas) areaCounts.set(area.site, (areaCounts.get(area.site) ?? 0) + 1);
  return areas.flatMap((area) => {
    const siteName = names.get(area.site);
    if (siteName === undefined || area.lat === null || area.lng === null) return [];
    const parcelId = area.wrt_number ?? area.slug;
    const matching = records.filter((record) => record.placeSlug === area.site && record.parcelId === parcelId);
    return [{
      id: area.slug, siteSlug: area.site, siteName, label: area.name,
      latitude: area.lat, longitude: area.lng, description: area.description,
      sourceUrl: area.pin_source_url, checkedOn: area.pin_checked_on,
      split: splitOf(matching), countScope: areaCounts.get(area.site) === 1 ? "site" as const : "part" as const,
    }];
  });
}

export function compactPlantCount(quantity: number): string {
  return new Intl.NumberFormat("en-NZ", { notation: "compact", maximumFractionDigits: 1 }).format(quantity).toLowerCase();
}

/** MapLibre uses longitude first; coordinates shown to people keep explicit labels. */
export function locationBounds(locations: readonly Coordinates[]): [[number, number], [number, number]] | null {
  if (!locations.length) return null;
  return [
    [Math.min(...locations.map((p) => p.longitude)), Math.min(...locations.map((p) => p.latitude))],
    [Math.max(...locations.map((p) => p.longitude)), Math.max(...locations.map((p) => p.latitude))],
  ];
}

export function locationMapUrl(location: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
}

/** Connected screen-space groups keep nearby marker buttons from obscuring one another. */
export function groupNearbyLocations(points: readonly { x: number; y: number }[], radius = 60): number[][] {
  const remaining = new Set(points.map((_, index) => index));
  const groups: number[][] = [];
  for (const start of remaining) {
    remaining.delete(start);
    const group = [start];
    for (const index of group) {
      for (const other of remaining) {
        const point = points[index];
        const candidate = points[other];
        if (point && candidate && Math.hypot(point.x - candidate.x, point.y - candidate.y) < radius) {
          group.push(other);
          remaining.delete(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
