/** Presentation queries shared by pages, exports and chat. Each call reads fresh data. */
import type { ExplorerData, Parcel, Place, PlantingRecord, Precision, Quantity, Season, SiteClass, Species } from "./types";
import { matchScore, searchKey } from "./text";

export const emptySplit = (): Quantity => ({ total: 0, records: 0, unknown: 0 });
export function addToSplit(total: Quantity, record: PlantingRecord): Quantity {
  total.total += record.quantity ?? 0;
  if (!Number.isSafeInteger(total.total)) throw new Error("Plant total exceeds the safe integer range");
  total.records++;
  if (record.quantity === null) total.unknown++;
  return total;
}
export function splitOf(records: Iterable<PlantingRecord>): Quantity {
  const total = emptySplit();
  for (const record of records) addToSplit(total, record);
  return total;
}
export function groupSplits<K>(records: PlantingRecord[], key: (r: PlantingRecord) => K): Map<K, Quantity> {
  const groups = new Map<K, Quantity>();
  for (const record of records) {
    const k = key(record);
    groups.set(k, addToSplit(groups.get(k) ?? emptySplit(), record));
  }
  return groups;
}
export const byTotalDesc = <T extends { split: { total: number } }>(a: T, b: T) => b.split.total - a.split.total;
export interface Ranked<T> { item: T; split: Quantity }
export interface SeasonPoint { season: Season; split: Quantity }
export interface YearRow { year: number; total: Quantity; runningTotal: Quantity }
export interface Span { first: Season; last: Season; seasonsActive: number }
export interface RecordView { record: PlantingRecord; species: Species; place: Place; season: Season }
export interface SiteSpecies { species: Species; split: Quantity }
export function speciesBySite(records: RecordView[]) {
  const groups = new Map<string, { place: Place; split: Quantity; species: SiteSpecies[] }>();
  for (const row of records) {
    let group = groups.get(row.place.slug);
    if (!group) {
      group = { place: row.place, split: emptySplit(), species: [] };
      groups.set(row.place.slug, group);
    }
    addToSplit(group.split, row.record);
    let species = group.species.find((s) => s.species.id === row.species.id);
    if (!species) { species = { species: row.species, split: emptySplit() }; group.species.push(species); }
    addToSplit(species.split, row.record);
  }
  for (const group of groups.values()) group.species.sort(byTotalDesc);
  return groups;
}
export interface PlaceSummary extends Ranked<Place> { span: Span | null; speciesCount: number }
export interface SpeciesSummary extends Ranked<Species> { span: Span | null; placeCount: number }
export interface SeasonSummary extends SeasonPoint { placeCount: number; speciesCount: number }
export interface Overview {
  split: Quantity; seasons: SeasonPoint[]; placeCount: number; schemeCount: number; parcelCount: number; speciesCount: number;
  places: Ranked<Place>[]; species: Ranked<Species>[]; byClass: Ranked<SiteClass>[]; byPrecision: Ranked<Precision>[];
}
export interface PlaceDetail {
  place: Place; split: Quantity; span: Span | null; seasons: SeasonPoint[]; years: YearRow[];
  species: Ranked<Species>[]; parcels: (Ranked<Parcel> & { span: Span | null })[]; records: RecordView[];
}
export interface SpeciesDetail {
  species: Species; split: Quantity; span: Span | null; seasons: SeasonPoint[]; years: YearRow[];
  places: Ranked<Place>[]; records: RecordView[];
}
export interface SeasonDetail {
  season: Season; previous: Season | null; next: Season | null; split: Quantity;
  places: Ranked<Place>[]; species: Ranked<Species>[]; byClass: Ranked<SiteClass>[]; records: RecordView[];
}
export interface RecordFilter { place?: string; parcel?: string; species?: string; year?: number; season?: string; q?: string }
export interface RecordQueryResult { filter: RecordFilter; split: Quantity; rows: RecordView[] }
export interface SearchResult {
  query: string; places: (Ranked<Place> & { score: number })[]; species: (Ranked<Species> & { score: number })[];
  seasons: (SeasonPoint & { score: number })[];
}
export interface Lookups { seasons: Season[]; years: number[]; places: Place[]; species: Species[] }

export function createQueries(load: () => Promise<ExplorerData>) {
  async function ctx() {
    const data = await load();
    const seasons: Season[] = [...new Set([...data.seasons, ...data.records.map((r) => r.seasonName)])].sort((a, b) => a.localeCompare(b))
      .map((name, order) => ({ slug: name, name, label: name || "Season not recorded", order }));
    const species = new Map(data.species.map((s) => [s.id, s]));
    const places = new Map(data.places.map((p) => [p.slug, p]));
    const seasonBySlug = new Map(seasons.map((s) => [s.slug, s]));
    const rows = data.records.map((record) => ({ record, species: species.get(record.speciesId)!, place: places.get(record.placeSlug)!, season: seasonBySlug.get(record.seasonSlug)! }));
    return { ...data, seasons, rows };
  }
  type Context = Awaited<ReturnType<typeof ctx>>;
  function series(c: Context, records: PlantingRecord[]): SeasonPoint[] {
    const groups = groupSplits(records, (r) => r.seasonSlug);
    return c.seasons.map((season) => ({ season, split: groups.get(season.slug) ?? emptySplit() }));
  }
  function span(c: Context, records: PlantingRecord[]): Span | null {
    const active = series(c, records).filter((s) => s.split.records);
    return active.length ? { first: active[0].season, last: active.at(-1)!.season, seasonsActive: active.length } : null;
  }
  function years(records: PlantingRecord[]): YearRow[] {
    const groups = groupSplits(records.filter((r) => r.year !== null), (r) => r.year!);
    const running = emptySplit();
    return [...groups].sort(([a], [b]) => a - b).map(([year, total]) => {
      for (const key of Object.keys(running) as (keyof Quantity)[]) running[key] += total[key];
      if (!Number.isSafeInteger(running.total)) throw new Error("Plant total exceeds the safe integer range");
      return { year, total, runningTotal: { ...running } };
    });
  }
  function rank<T>(items: T[], records: PlantingRecord[], key: (r: PlantingRecord) => string, id: (item: T) => string, includeEmpty = false): Ranked<T>[] {
    const groups = groupSplits(records, key);
    return items.filter((item) => includeEmpty || groups.has(id(item)))
      .map((item) => ({ item, split: groups.get(id(item)) ?? emptySplit() })).sort(byTotalDesc);
  }
  function breakdown<K>(records: PlantingRecord[], key: (r: PlantingRecord) => K): Ranked<K>[] {
    return [...groupSplits(records, key)].map(([item, split]) => ({ item, split })).sort(byTotalDesc);
  }
  return {
    async overview(): Promise<Overview> {
      const c = await ctx();
      return {
        split: splitOf(c.records), seasons: series(c, c.records),
        placeCount: c.places.filter((p) => !p.isScheme).length, schemeCount: c.places.filter((p) => p.isScheme).length,
        parcelCount: c.places.reduce((n, p) => n + p.parcels.length, 0), speciesCount: c.species.length,
        places: rank(c.places, c.records, (r) => r.placeSlug, (p) => p.slug, true),
        species: rank(c.species, c.records, (r) => r.speciesId, (s) => s.id, true),
        byClass: breakdown(c.records, (r) => r.siteClass), byPrecision: breakdown(c.records, (r) => r.precision),
      };
    },
    async places(): Promise<PlaceSummary[]> {
      const c = await ctx();
      return rank(c.places, c.records, (r) => r.placeSlug, (p) => p.slug, true).map((p) => {
        const records = c.records.filter((r) => r.placeSlug === p.item.slug);
        return { ...p, span: span(c, records), speciesCount: new Set(records.map((r) => r.speciesId)).size };
      });
    },
    async place(slug: string): Promise<PlaceDetail | null> {
      const c = await ctx(); const place = c.places.find((p) => p.slug === slug);
      if (!place) return null;
      const records = c.records.filter((r) => r.placeSlug === slug);
      return {
        place, split: splitOf(records), span: span(c, records), seasons: series(c, records), years: years(records),
        species: rank(c.species, records, (r) => r.speciesId, (s) => s.id),
        parcels: rank(place.parcels, records, (r) => r.parcelId ?? "", (p) => p.id, true).map((p) => ({ ...p, span: span(c, records.filter((r) => r.parcelId === p.item.id)) })),
        records: c.rows.filter((r) => r.place.slug === slug),
      };
    },
    async speciesList(): Promise<SpeciesSummary[]> {
      const c = await ctx();
      return rank(c.species, c.records, (r) => r.speciesId, (s) => s.id, true).map((s) => {
        const records = c.records.filter((r) => r.speciesId === s.item.id);
        return { ...s, span: span(c, records), placeCount: new Set(records.map((r) => r.placeSlug)).size };
      });
    },
    async species(slug: string): Promise<SpeciesDetail | null> {
      const c = await ctx(); const species = c.species.find((s) => s.slug === slug);
      if (!species) return null;
      const records = c.records.filter((r) => r.speciesId === species.id);
      return {
        species, split: splitOf(records), span: span(c, records), seasons: series(c, records), years: years(records),
        places: rank(c.places, records, (r) => r.placeSlug, (p) => p.slug), records: c.rows.filter((r) => r.species.id === species.id),
      };
    },
    async seasons(): Promise<SeasonSummary[]> {
      const c = await ctx();
      return series(c, c.records).map((p) => {
        const records = c.records.filter((r) => r.seasonSlug === p.season.slug);
        return { ...p, placeCount: new Set(records.map((r) => r.placeSlug)).size, speciesCount: new Set(records.map((r) => r.speciesId)).size };
      });
    },
    async season(slug: string): Promise<SeasonDetail | null> {
      const c = await ctx(); const season = c.seasons.find((s) => s.slug === slug);
      if (!season) return null;
      const records = c.records.filter((r) => r.seasonSlug === slug);
      return {
        season, previous: c.seasons[season.order - 1] ?? null, next: c.seasons[season.order + 1] ?? null,
        split: splitOf(records), places: rank(c.places, records, (r) => r.placeSlug, (p) => p.slug),
        species: rank(c.species, records, (r) => r.speciesId, (s) => s.id), byClass: breakdown(records, (r) => r.siteClass),
        records: c.rows.filter((r) => r.season.slug === slug),
      };
    },
    async records(filter: RecordFilter = {}): Promise<RecordQueryResult> {
      const c = await ctx();
      const rows = c.rows.filter(({ record: r, species: s, place: p }) =>
        (!filter.place || r.placeSlug === filter.place) &&
        (!filter.parcel || (!!filter.place && p.parcels.some((a) => a.slug === filter.parcel && a.id === r.parcelId))) &&
        (!filter.species || s.slug === filter.species) && (filter.year === undefined || r.year === filter.year) &&
        (filter.season === undefined || r.seasonName === filter.season) &&
        (!filter.q || matchScore(filter.q, [...s.searchKeys, ...p.searchKeys, searchKey(r.parcelName)]) > 0));
      return { filter, rows, split: splitOf(rows.map((r) => r.record)) };
    },
    async search(query: string, limit = 8): Promise<SearchResult> {
      const c = await ctx();
      if (searchKey(query).length < 3) return { query, places: [], species: [], seasons: [] };
      const match = <T extends { searchKeys: string[] }>(ranked: Ranked<T>[]) => ranked
        .map((r) => ({ ...r, score: matchScore(query, r.item.searchKeys) })).filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || byTotalDesc(a, b)).slice(0, limit);
      return {
        query, places: match(rank(c.places, c.records, (r) => r.placeSlug, (p) => p.slug, true)),
        species: match(rank(c.species, c.records, (r) => r.speciesId, (s) => s.id, true)),
        seasons: series(c, c.records).map((p) => ({ ...p, score: searchKey(p.season.label) === searchKey(query) ? 100 : searchKey(p.season.label).includes(searchKey(query)) ? 70 : 0 })).filter((p) => p.score > 0).sort((a, b) => b.score - a.score || a.season.order - b.season.order).slice(0, limit),
      };
    },
    async lookups(): Promise<Lookups> {
      const c = await ctx();
      return { seasons: c.seasons, years: [...new Set(c.records.flatMap((r) => r.year === null ? [] : [r.year]))].sort((a, b) => a - b), places: c.places, species: [...c.species].sort((a, b) => a.displayName.localeCompare(b.displayName)) };
    },
  };
}
export type WrtQueries = ReturnType<typeof createQueries>;
