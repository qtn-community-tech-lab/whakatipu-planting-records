import type { Route } from "next";
import { slugify } from "./text";

export const hrefs = {
  place: (slug: string): `/sites/${string}` => `/sites/${slug}`,
  species: (slug: string): `/species/${string}` => `/species/${slug}`,
  season: (slug: string): `/seasons/${string}` => `/seasons/${slug}`,
  records: (params: Record<string, string | number | undefined>): `/records${"" | `?${string}`}` => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") sp.set(key, String(value));
    }
    const query = sp.toString();
    return query ? `/records?${query}` : "/records";
  },
  /** The planting event page, at a site or one of its parts (its WRT number). */
  newEvent: ({ site, part }: { site?: string; part?: string } = {}): `/events/new${"" | `?${string}`}` => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries({ site, part })) if (value) sp.set(key, value);
    const query = sp.toString();
    return query ? `/events/new?${query}` : "/events/new";
  },
};

/** Address of one part of a site, by its readable name. */
export function partHref(placeSlug: string, parcelName: string): `/sites/${string}/parts/${string}` {
  return `/sites/${placeSlug}/parts/${slugify(parcelName)}`;
}

/** Generated Next.js routes, including the dynamic paths our link builders return. */
export type AppRoute = Route<ReturnType<(typeof hrefs)[keyof typeof hrefs]> | ReturnType<typeof partHref>>;
