import { partBesideSite, searchKey } from "@/lib/wrt/text";
import type { SiteOption } from "@/lib/wrt/events/form-options";
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

/** A site's pin for a part: its own if it has one, else the site's, else any of the site's pins. */
export function pinOf(pins: readonly SitePin[], siteSlug: string, parcelId: string | null = null): SitePin | undefined {
  const at = pins.filter((p) => p.slug === siteSlug);
  return (parcelId && at.find((p) => p.parcelId === parcelId)) || at.find((p) => p.parcelId === null) || at[0];
}

/** Where to fly for a site (see pinOf). */
export function pinFor(pins: readonly SitePin[], siteSlug: string, parcelId: string | null = null): LngLat | null {
  return pinOf(pins, siteSlug, parcelId)?.at ?? null;
}

/** How far apart two points are, in km (flat-earth maths is fine at this scale). */
export function kmBetween(a: LngLat, b: LngLat): number {
  return Math.hypot((b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180) * 111.32, (b[1] - a[1]) * 110.57);
}

/** How far `at` is from the nearest of these points, in km; null with none. */
export function kmToNearest(points: readonly LngLat[], at: LngLat): number | null {
  return points.length ? Math.min(...points.map((p) => kmBetween(at, p))) : null;
}

/** The pin closest to `at`, and how far it is in km. */
export function nearestPin(pins: readonly SitePin[], at: LngLat): { pin: SitePin; km: number } | null {
  let best: { pin: SitePin; km: number } | null = null;
  for (const pin of pins) {
    const km = kmBetween(at, pin.at);
    if (!best || km < best.km) best = { pin, km };
  }
  return best;
}

/**
 * A location added on the map and kept for this visit: a part of its site (`id`), or a site of its own (no `id`).
 * shortcut: page state only, so a reload loses them; new locations and sites can't be stored yet. Store them
 * (the areas and sites tables) once the server can, and these go.
 */
export interface KeptPlace { site: string; id: string | null; name: string; label: string; at: LngLat }

/** The sites with the kept places in them, each marked unsaved: new sites in A–Z order, then parts at their
 * site (a kept new site's too). */
export function withKept(sites: readonly SiteOption[], kept: readonly KeptPlace[]): SiteOption[] {
  if (!kept.length) return sites as SiteOption[];
  const added = kept.filter((k) => !k.id).map((k) => ({ slug: k.site, name: k.name, keys: [searchKey(k.name)], parts: [], unsaved: true }));
  const all = added.length ? [...sites, ...added].sort((a, b) => a.name.localeCompare(b.name)) : sites;
  return all.map((x) => {
    const more = kept.filter((k) => k.site === x.slug && k.id);
    return more.length ? { ...x, parts: [...x.parts, ...more.map((k) => ({ id: k.id!, name: k.name, keys: [searchKey(k.name)], unsaved: true }))] } : x;
  });
}

/** A kept place's pin. */
export const keptPin = (k: KeptPlace): SitePin => ({ slug: k.site, parcelId: k.id, label: k.label, at: k.at, plants: 0 });
