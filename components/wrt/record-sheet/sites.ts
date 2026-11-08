import { siteLocations } from "@/lib/wrt/site-locations";
import type { LngLat } from "./geometry";

/** One clickable pin on the map: a site's (or one part's) reference point from data/site-locations.json. */
export interface SitePin {
  slug: string;
  /** The part this pin marks, or null for the site as a whole. */
  parcelId: string | null;
  /** "Lake Hayes · Lake Hayes Pavilion", or just the site's name. */
  label: string;
  at: LngLat;
}

/** The pins of the sites the form knows (order schemes have no place, so no pin). */
export function sitePins(sites: readonly { slug: string; name: string; parts: readonly { id: string; name: string }[] }[]): SitePin[] {
  const bySlug = new Map(sites.map((x) => [x.slug, x]));
  return siteLocations.flatMap((l) => {
    const site = bySlug.get(l.siteSlug);
    if (!site) return [];
    const parcelId = l.parcelIds?.length === 1 ? l.parcelIds[0] : null;
    const part = parcelId ? site.parts.find((p) => p.id === parcelId) : undefined;
    return [{ slug: l.siteSlug, parcelId: part ? parcelId : null, label: part ? `${site.name} · ${part.name}` : site.name, at: [l.longitude, l.latitude] as LngLat }];
  });
}

/** Where to fly for a site: its part's own pin if it has one, else the site's. */
export function pinFor(siteSlug: string, parcelId: string | null = null): LngLat | null {
  const at = siteLocations.filter((l) => l.siteSlug === siteSlug);
  const l = (parcelId && at.find((x) => x.parcelIds?.includes(parcelId))) || at.find((x) => !x.parcelIds) || at[0];
  return l ? [l.longitude, l.latitude] : null;
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
