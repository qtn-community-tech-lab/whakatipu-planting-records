import referenceLocations from "@/data/site-locations.json";
import { splitOf } from "@/lib/wrt/queries";
import type { PlantingRecord, QuantitySplit } from "@/lib/wrt/types";

/** Public reference points, kept separate from the historical planting ledger. */
export interface SiteLocation {
  id: string;
  siteSlug: string;
  label: string;
  latitude: number;
  longitude: number;
  precision: "historic-event" | "landmark";
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  coordinateSourceUrl: string;
  coordinateMethod?: string;
  checkedOn: string;
  /** Set only for distinct mapped parts of a site; otherwise the count covers the whole site. */
  parcelIds?: string[];
}

export interface MappedSiteLocation extends SiteLocation {
  siteName: string;
  split: QuantitySplit;
  countScope: "site" | "part";
}

export const siteLocations: readonly SiteLocation[] = referenceLocations as SiteLocation[];

export function locationsForSites(sites: readonly { slug: string; name: string }[], records: readonly PlantingRecord[]): MappedSiteLocation[] {
  const names = new Map(sites.map((site) => [site.slug, site.name]));
  return siteLocations.flatMap((location) => {
    const siteName = names.get(location.siteSlug);
    if (!siteName) return [];
    const matching = records.filter((record) => record.placeSlug === location.siteSlug &&
      (!location.parcelIds || location.parcelIds.includes(record.parcelId)));
    return [{ ...location, siteName, split: splitOf(matching), countScope: location.parcelIds ? "part" as const : "site" as const }];
  });
}

export function compactPlantCount(quantity: number): string {
  return new Intl.NumberFormat("en-NZ", { notation: "compact", maximumFractionDigits: 1 }).format(quantity).toLowerCase();
}

/** MapLibre uses longitude first; coordinates shown to people keep explicit labels. */
export function locationBounds(locations: readonly SiteLocation[]): [[number, number], [number, number]] | null {
  if (!locations.length) return null;
  return [
    [Math.min(...locations.map((p) => p.longitude)), Math.min(...locations.map((p) => p.latitude))],
    [Math.max(...locations.map((p) => p.longitude)), Math.max(...locations.map((p) => p.latitude))],
  ];
}

export function locationMapUrl(location: SiteLocation): string {
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
        if (Math.hypot(points[index].x - points[other].x, points[index].y - points[other].y) < radius) {
          group.push(other);
          remaining.delete(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
