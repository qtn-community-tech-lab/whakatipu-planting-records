import { partBesideSite } from "@/lib/wrt/text";
import type { PlantingAreaPin } from "@/lib/wrt/site-locations";
/** [longitude, latitude] */
export type LngLat = [number, number];

/** One clickable pin on the map: an area's pin from the areas table. */
export interface SitePin {
  slug: string;
  /** The part this pin marks, or null for the site as a whole. */
  parcelId: string | null;
  /** "Lake Hayes · Lake Hayes Pavilion", or just the site's name. */
  label: string;
  at: LngLat;
  /** Plants recorded here: the part's (or parts') totals, or the whole site's. */
  plants: number;
}

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
    return [{ slug: a.site, parcelId: part ? id : null, label: part ? `${site.name} · ${partBesideSite(part.name, site.name)}` : site.name, at: [a.lng, a.lat] as LngLat, plants }];
  });
}

/** Where to fly for a site: its part's own pin if it has one, else the site's, else any of its pins. */
export function pinFor(pins: readonly SitePin[], siteSlug: string, parcelId: string | null = null): LngLat | null {
  const at = pins.filter((p) => p.slug === siteSlug);
  const pin = (parcelId && at.find((p) => p.parcelId === parcelId)) || at.find((p) => p.parcelId === null) || at[0];
  return pin ? pin.at : null;
}

/** The pin closest to `at`, and how far it is in km (flat-earth maths is fine at this scale). */
export function nearestPin(pins: readonly SitePin[], at: LngLat): { pin: SitePin; km: number } | null {
  const k = Math.cos((at[1] * Math.PI) / 180) * 111.32;
  let best: { pin: SitePin; km: number } | null = null;
  for (const pin of pins) {
    const km = Math.hypot((pin.at[0] - at[0]) * k, (pin.at[1] - at[1]) * 110.57);
    if (!best || km < best.km) best = { pin, km };
  }
  return best;
}
