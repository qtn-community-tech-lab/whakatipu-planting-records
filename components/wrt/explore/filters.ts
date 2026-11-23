/**
 * Records explorer: URL search params in, validated filter out.
 *
 * Every view of /records is a URL, so every param is validated here and
 * invalid values are ignored rather than raising an error. The page uses the
 * resulting filters for its records and summaries.
 *
 * Server and client safe: no data access.
 */
import type { Lookups, RecordFilter } from "@/lib/wrt/queries";
import type { SeasonName } from "@/lib/wrt/types";
import { hrefs } from "@/lib/wrt/routes";
import type { RawParams } from "@/lib/wrt/params";

export const PAGE_SIZE = 50;

export const SORT_KEYS = ["season", "plants", "site", "species"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  season: "Season",
  plants: "Recorded plants",
  site: "Site",
  species: "Species",
};

/** A validated view of the records: what is filtered, how it is sorted, which page. */
export interface RecordsView {
  filter: RecordFilter;
  sort: SortKey;
  page: number;
  /** Params that were set but did not match anything in the data (shown to the user, never silently dropped). */
  ignored: { param: string; value: string }[];
}

export type { RawParams } from "@/lib/wrt/params";

/** Param names that the form owns. Empty values for these are redirected away. */
export const PARAM_KEYS = ["place", "parcel", "species", "year", "season", "q", "page", "sort"] as const;
export type ParamKey = (typeof PARAM_KEYS)[number];

const SEASONS: SeasonName[] = ["Autumn", "Spring"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Validate raw search params against what the data actually holds. */
export function parseRecordParams(raw: RawParams, lookups: Lookups): RecordsView {
  const filter: RecordFilter = {};
  const ignored: { param: string; value: string }[] = [];
  const reject = (param: string, value: string | undefined) => {
    if (value) ignored.push({ param, value: value.slice(0, 40) });
  };

  const place = first(raw.place)?.trim();
  if (place && lookups.places.some((p) => p.slug === place)) filter.place = place;
  else reject("site", place);

  const parcel = first(raw.parcel)?.trim();
  const selectedPlace = lookups.places.find((p) => p.slug === filter.place);
  if (parcel && selectedPlace?.parcels.some((p) => p.id === parcel)) filter.parcel = parcel;
  else reject("part of site", parcel);

  const species = first(raw.species)?.trim();
  if (species && lookups.species.some((s) => s.slug === species)) filter.species = species;
  else reject("species", species);

  const yearRaw = first(raw.year)?.trim();
  if (yearRaw && /^\d{4}$/.test(yearRaw) && lookups.years.includes(Number(yearRaw))) filter.year = Number(yearRaw);
  else reject("year", yearRaw);

  const seasonRaw = first(raw.season)?.trim();
  const season = SEASONS.find((value) => value === seasonRaw);
  if (season) filter.season = season;
  else reject("season", seasonRaw);

  const q = first(raw.q)?.replace(/\s+/g, " ").trim().slice(0, 80);
  if (q) filter.q = q;

  const sortRaw = first(raw.sort)?.trim();
  const sort = SORT_KEYS.find((value) => value === sortRaw) ?? "season";

  const pageRaw = first(raw.page)?.trim();
  const page = pageRaw && /^\d{1,6}$/.test(pageRaw) && Number(pageRaw) >= 1 ? Number(pageRaw) : 1;

  return { filter, sort, page, ignored };
}

/** True when any filter (not sort or page) is set. */
export function hasFilters(f: RecordFilter): boolean {
  return Boolean(f.place || f.parcel || f.species || f.year || f.season || f.q);
}

/** Query params for a view. Defaults are left out so URLs stay short. */
function viewParams(view: RecordsView, over: Partial<Record<ParamKey, string | number | undefined>> = {}) {
  const f = view.filter;
  const base: Record<string, string | number | undefined> = {
    place: f.place,
    parcel: f.parcel,
    species: f.species,
    year: f.year,
    season: f.season,
    q: f.q,
    sort: view.sort === "season" ? undefined : view.sort,
    page: view.page > 1 ? view.page : undefined,
  };
  // Changing/removing the parent site clears its dependent sublocation.
  const result = { ...base, ...over };
  if ("place" in over && over.place !== f.place && !("parcel" in over)) result.parcel = undefined;
  return result;
}

/** `/records?…` for a view, with optional overrides. Changing any filter resets the page. */
export function recordsHref(view: RecordsView, over: Partial<Record<ParamKey, string | number | undefined>> = {}): `/records${"" | `?${string}`}` {
  const resetsPage = Object.keys(over).some((k) => k !== "page");
  const params = viewParams(view, resetsPage && !("page" in over) ? { ...over, page: undefined } : over);
  return hrefs.records(params);
}
