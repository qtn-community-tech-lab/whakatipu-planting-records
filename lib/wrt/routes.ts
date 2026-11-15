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
  events: (context: EventContext = {}): `/events${"" | `?${string}`}` => eventHref("/events", context),
  newEvent: (context: EventContext = {}): `/events/new${"" | `?${string}`}` => eventHref("/events/new", context),
};

/** Address of one part of a site, by its readable name. */
export function partHref(placeSlug: string, parcelName: string): `/sites/${string}/parts/${string}` {
  return `/sites/${placeSlug}/parts/${slugify(parcelName)}`;
}

/** Generated Next.js routes, including the dynamic paths our link builders return. */
export type AppRoute = Route<ReturnType<(typeof hrefs)[keyof typeof hrefs]> | ReturnType<typeof partHref>>;

export interface EventContext { site?: string | undefined; part?: string | undefined; season?: string | undefined; event?: number | undefined; returnTo?: string | undefined }
function eventHref<T extends "/events" | "/events/new">(path: T, context: EventContext): `${T}${"" | `?${string}`}` {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `${path}${query.size ? `?${query}` : ""}` as `${T}${"" | `?${string}`}`;
}
export function eventReturn(value: unknown): { href: Route; label: string } {
  if (value === "/") return { href: "/", label: "Return to Overview" };
  if (typeof value !== "string" || !/^\/(?:records|sites|seasons)(?:[/?#]|$)/.test(value) || /[\\\r\n]/.test(value)) return { href: "/records", label: "Return to Records" };
  const pathname = value.split(/[?#]/)[0]!;
  return { href: value as Route, label: pathname === "/records" ? "Return to Records" : pathname.startsWith("/seasons") ? "Return to season" : pathname === "/sites" ? "Return to Sites" : "Return to site" };
}
