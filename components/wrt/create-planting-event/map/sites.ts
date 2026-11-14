import { partBesideSite } from "@/lib/wrt/text";
import type { PlantingAreaPin } from "@/lib/wrt/site-locations";
/** [longitude, latitude] */
export type LngLat = [number, number];

/** One clickable pin on the map: an area's pin from the areas table. */
export interface SitePin {
  slug: string;
  /** The part this pin marks, or null for the site as a whole. */
  partId: string | null;
  /** "Lake Hayes · Lake Hayes Pavilion", or just the site's name. */
  label: string;
  at: LngLat;
  /** Plants recorded here: the part's (or parts') totals, or the whole site's. */
  plants: number;
}

/** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
export type PlantTotals = Record<string, {
  plants: number; species: number;
  /** The latest season planted (sites only), e.g. "Autumn 2025", and its place in planting order, for sorting. */
  last?: string | undefined; lastOrder?: number | undefined;
}>;

/** The pins of the sites the form knows (order schemes have no location, so no pin).
 * A site with one area gets one pin for the whole site. */
export function sitePins(
  sites: readonly { slug: string; name: string; parts: readonly { id: string; name: string }[] }[],
  areas: readonly Pick<PlantingAreaPin, "slug" | "site" | "wrt_number" | "lat" | "lng">[],
  totals: Record<string, { plants: number }>,
): SitePin[] {
  const bySlug = new Map(sites.map((x) => [x.slug, x]));
  const areaCount = new Map<string, number>();
  for (const a of areas) areaCount.set(a.site, (areaCount.get(a.site) ?? 0) + 1);
  return areas.flatMap((a) => {
    const site = bySlug.get(a.site);
    if (!site || a.lat === null || a.lng === null) return [];
    const id = a.wrt_number ?? a.slug;
    const part = areaCount.get(a.site) === 1 ? undefined : site.parts.find((p) => p.id === id);
    const plants = part ? totals[`${a.site}/${id}`]?.plants ?? 0 : totals[a.site]?.plants ?? 0;
    return [{ slug: a.site, partId: part ? id : null, label: part ? `${site.name} · ${partBesideSite(part.name, site.name)}` : site.name, at: [a.lng, a.lat] as LngLat, plants }];
  });
}

/** A site's pin for a part: its own if it has one, else the site's, else any of the site's pins. */
function pinOf(pins: readonly SitePin[], siteSlug: string, partId: string | null = null): SitePin | undefined {
  const at = pins.filter((p) => p.slug === siteSlug);
  return (partId && at.find((p) => p.partId === partId)) || at.find((p) => p.partId === null) || at[0];
}

export function pinFor(pins: readonly SitePin[], siteSlug: string, partId: string | null = null): LngLat | null {
  return pinOf(pins, siteSlug, partId)?.at ?? null;
}

/** How far apart two points are, in km (flat-earth maths is fine at this scale). */
function kmBetween(a: LngLat, b: LngLat): number {
  return Math.hypot((b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180) * 111.32, (b[1] - a[1]) * 110.57);
}

export function kmToNearest(points: readonly LngLat[], at: LngLat): number | null {
  return points.length ? Math.min(...points.map((p) => kmBetween(at, p))) : null;
}

export function nearestPin(pins: readonly SitePin[], at: LngLat): { pin: SitePin; km: number } | null {
  let best: { pin: SitePin; km: number } | null = null;
  for (const pin of pins) {
    const km = kmBetween(at, pin.at);
    if (!best || km < best.km) best = { pin, km };
  }
  return best;
}
