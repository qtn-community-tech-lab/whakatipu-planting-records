import { siteLocations } from "@/lib/wrt/site-locations";
import type { LngLat } from "./geometry";

/** One clickable pin on the map: a site's reference point from data/site-locations.json. */
export interface SitePin {
  slug: string;
  name: string;
  at: LngLat;
}

/** The pins of the sites the form knows (order schemes have no place, so no pin). */
export function sitePins(sites: readonly { slug: string; name: string }[]): SitePin[] {
  const names = new Map(sites.map((x) => [x.slug, x.name]));
  return siteLocations.flatMap((l) => {
    const name = names.get(l.siteSlug);
    return name ? [{ slug: l.siteSlug, name, at: [l.longitude, l.latitude] as LngLat }] : [];
  });
}

/** Where to fly for a site: its part's own pin if it has one, else the site's. */
export function pinFor(siteSlug: string, parcelId: string | null = null): LngLat | null {
  const at = siteLocations.filter((l) => l.siteSlug === siteSlug);
  const l = (parcelId && at.find((x) => x.parcelIds?.includes(parcelId))) || at.find((x) => !x.parcelIds) || at[0];
  return l ? [l.longitude, l.latitude] : null;
}

/** The site whose pin is closest to `at` (flat-earth distance is fine at this scale). */
export function nearestSite(pins: readonly SitePin[], at: LngLat): string | null {
  const k = Math.cos((at[1] * Math.PI) / 180);
  let best: SitePin | null = null;
  let bestD = Infinity;
  for (const p of pins) {
    const d = ((p.at[0] - at[0]) * k) ** 2 + (p.at[1] - at[1]) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best?.slug ?? null;
}
