/**
 * Domain / query layer. Pages and components call these and nothing else.
 *
 * Rule: every aggregate is a QuantitySplit (resolved + needs review). There is
 * no function here that returns a bare total.
 */
import type { WrtRepository } from "./repository";
import type {
  Confidence, Parcel, Place, PlantingRecord, Precision, QuantitySplit, ReconciliationRow,
  ReviewTheme, Season, SeasonName, SiteClass, Species,
} from "./types";
import { matchScore, searchKey } from "./text";

// ---------------------------------------------------------------- split helpers

export function emptySplit(): QuantitySplit {
  return { total: 0, resolved: 0, needsReview: 0, records: 0, recordsNeedingReview: 0 };
}

export function addToSplit(s: QuantitySplit, r: PlantingRecord): QuantitySplit {
  s.total += r.quantity;
  s.records += 1;
  if (r.needsReview) {
    s.needsReview += r.quantity;
    s.recordsNeedingReview += 1;
  } else {
    s.resolved += r.quantity;
  }
  return s;
}

export function splitOf(records: Iterable<PlantingRecord>): QuantitySplit {
  const s = emptySplit();
  for (const r of records) addToSplit(s, r);
  return s;
}

export function groupSplits<K>(records: PlantingRecord[], key: (r: PlantingRecord) => K): Map<K, QuantitySplit> {
  const m = new Map<K, QuantitySplit>();
  for (const r of records) {
    const k = key(r);
    let s = m.get(k);
    if (!s) m.set(k, (s = emptySplit()));
    addToSplit(s, r);
  }
  return m;
}

/** Largest first. Shared by every ranked list in the app. */
export const byTotalDesc = <T extends { split: { total: number } }>(a: T, b: T) => b.split.total - a.split.total;

// ---------------------------------------------------------------- result types

export interface Ranked<T> {
  item: T;
  split: QuantitySplit;
}

export interface SeasonPoint {
  season: Season;
  split: QuantitySplit;
}

export interface YearRow {
  year: number;
  autumn: QuantitySplit;
  spring: QuantitySplit;
  total: QuantitySplit;
  /** Running total of recorded plants to the end of this year. */
  runningTotal: QuantitySplit;
}

export interface Span {
  first: Season;
  last: Season;
  /** Seasons with at least one record. */
  seasonsActive: number;
}

export interface ThemeSummary {
  theme: ReviewTheme;
  /** Plants and records touched by notes of this theme. A record can sit in several themes. */
  split: QuantitySplit;
}

export interface RecordView {
  record: PlantingRecord;
  species: Species;
  place: Place;
  season: Season;
}

/** The rows WRT still has to rule on, largest first: the "needs review" card on every detail page. */
export function needsReviewByPlants(rows: RecordView[]): RecordView[] {
  return rows.filter((v) => v.record.needsReview).sort((a, b) => b.record.quantity - a.record.quantity);
}

export interface SiteSpecies {
  species: Species;
  split: QuantitySplit;
}

/** Group records by site, each with its species ranked by recorded plants. */
export function speciesBySite(records: RecordView[]) {
  const byPlace = new Map<string, { place: Place; split: QuantitySplit; species: Map<string, SiteSpecies> }>();
  for (const v of records) {
    const p = byPlace.get(v.place.slug) ?? { place: v.place, split: emptySplit(), species: new Map() };
    addToSplit(p.split, v.record);
    const s = p.species.get(v.species.slug) ?? { species: v.species, split: emptySplit() };
    addToSplit(s.split, v.record);
    p.species.set(v.species.slug, s);
    byPlace.set(v.place.slug, p);
  }
  return new Map(
    [...byPlace].map(([slug, p]) => [
      slug,
      { place: p.place, split: p.split, species: [...p.species.values()].sort(byTotalDesc) },
    ]),
  );
}

export interface PlaceSummary extends Ranked<Place> {
  span: Span;
  speciesCount: number;
}

export interface SpeciesSummary extends Ranked<Species> {
  span: Span | null;
  placeCount: number;
}

export interface SeasonSummary extends SeasonPoint {
  placeCount: number;
  speciesCount: number;
  reconciliation: ReconciliationRow | null;
}

export interface Overview {
  split: QuantitySplit;
  firstSeason: Season;
  lastSeason: Season;
  seasons: SeasonPoint[];
  /** Physical sites (places), excluding order schemes such as Paper4Trees. */
  placeCount: number;
  /** Order schemes recorded alongside sites (not places). */
  schemeCount: number;
  parcelCount: number;
  speciesCount: number;
  places: Ranked<Place>[];
  species: Ranked<Species>[];
  byClass: Ranked<SiteClass>[];
  byConfidence: Ranked<Confidence>[];
  byPrecision: Ranked<Precision>[];
  themes: ThemeSummary[];
}

export interface PlaceDetail {
  place: Place;
  split: QuantitySplit;
  span: Span;
  seasons: SeasonPoint[];
  years: YearRow[];
  species: Ranked<Species>[];
  parcels: (Ranked<Parcel> & { span: Span })[];
  themes: ThemeSummary[];
  records: RecordView[];
}

export interface SpeciesDetail {
  species: Species;
  split: QuantitySplit;
  span: Span | null;
  seasons: SeasonPoint[];
  years: YearRow[];
  places: Ranked<Place>[];
  contested: Species[];
  themes: ThemeSummary[];
  records: RecordView[];
}

export interface SeasonDetail {
  season: Season;
  previous: Season | null;
  next: Season | null;
  split: QuantitySplit;
  places: Ranked<Place>[];
  species: Ranked<Species>[];
  byClass: Ranked<SiteClass>[];
  reconciliation: ReconciliationRow | null;
  themes: ThemeSummary[];
  records: RecordView[];
}

export type ReviewFilter = "all" | "needs-review" | "resolved";

export interface RecordFilter {
  place?: string;
  /** Exact parcel ID, always scoped to the selected place. */
  parcel?: string;
  species?: string;
  year?: number;
  season?: SeasonName;
  review?: ReviewFilter;
  theme?: ReviewTheme;
  /** Free text: matched against species, place and parcel names (macrons ignored). */
  q?: string;
}

export interface RecordQueryResult {
  filter: RecordFilter;
  split: QuantitySplit;
  rows: RecordView[];
}

export interface SearchResult {
  query: string;
  places: (Ranked<Place> & { score: number })[];
  species: (Ranked<Species> & { score: number })[];
  seasons: (SeasonPoint & { score: number })[];
}

export interface DataQuality {
  split: QuantitySplit;
  byConfidence: Ranked<Confidence>[];
  byPrecision: Ranked<Precision>[];
  themes: ThemeSummary[];
  reconciliation: ReconciliationRow[];
  source: { description: string; tables: { name: string; rows: number }[] };
  /**
   * Every species WRT marks threatened in either of its two lists, with recorded
   * plants. Raised on About the data because the basis of the mark is unknown
   * and the two lists disagree.
   */
  threatened: ThreatenedSpeciesRow[];
}

export interface ThreatenedSpeciesRow extends Ranked<Species> {
  /** Both lists mark it. */
  agreed: boolean;
  /** Sites where it was recorded. */
  placeCount: number;
}

export interface Lookups {
  seasons: Season[];
  years: number[];
  places: Place[];
  species: Species[];
}

// ---------------------------------------------------------------- implementation

export function createQueries(repo: WrtRepository) {
  async function ctx() {
    const [seasons, species, places, records] = await Promise.all([
      repo.listSeasons(), repo.listSpecies(), repo.listPlaces(), repo.listRecords(),
    ]);
    const seasonBySlug = new Map(seasons.map((s) => [s.slug, s]));
    const speciesById = new Map(species.map((s) => [s.id, s]));
    const speciesBySlug = new Map(species.map((s) => [s.slug, s]));
    const placeBySlug = new Map(places.map((p) => [p.slug, p]));
    const view = (r: PlantingRecord): RecordView => ({
      record: r,
      species: speciesById.get(r.speciesId)!,
      place: placeBySlug.get(r.placeSlug)!,
      season: seasonBySlug.get(r.seasonSlug)!,
    });
    return { seasons, species, places, records, seasonBySlug, speciesById, speciesBySlug, placeBySlug, view };
  }
  type Ctx = Awaited<ReturnType<typeof ctx>>;

  function seasonSeries(c: Ctx, recs: PlantingRecord[]): SeasonPoint[] {
    const m = groupSplits(recs, (r) => r.seasonSlug);
    return c.seasons.map((season) => ({ season, split: m.get(season.slug) ?? emptySplit() }));
  }

  function yearRows(recs: PlantingRecord[]): YearRow[] {
    if (!recs.length) return [];
    const years = [...new Set(recs.map((r) => r.year))].sort((a, b) => a - b);
    const running = emptySplit();
    return years.map((year) => {
      const autumn = splitOf(recs.filter((r) => r.year === year && r.seasonName === "Autumn"));
      const spring = splitOf(recs.filter((r) => r.year === year && r.seasonName === "Spring"));
      const total = splitOf(recs.filter((r) => r.year === year));
      for (const k of Object.keys(running) as (keyof QuantitySplit)[]) running[k] += total[k];
      return { year, autumn, spring, total, runningTotal: { ...running } };
    });
  }

  function spanOf(c: Ctx, recs: PlantingRecord[]): Span | null {
    if (!recs.length) return null;
    const slugs = new Set(recs.map((r) => r.seasonSlug));
    const active = c.seasons.filter((s) => slugs.has(s.slug));
    const first = active[0];
    const last = active.at(-1);
    return first && last ? { first, last, seasonsActive: active.length } : null;
  }

  function themesOf(recs: PlantingRecord[]): ThemeSummary[] {
    const m = new Map<ReviewTheme, QuantitySplit>();
    for (const r of recs) {
      if (!r.needsReview) continue;
      const themes = new Set(r.notes.filter((n) => n.kind !== "fyi").map((n) => n.theme));
      if (!themes.size) themes.add("other");
      for (const t of themes) {
        let s = m.get(t);
        if (!s) m.set(t, (s = emptySplit()));
        addToSplit(s, r);
      }
    }
    return [...m.entries()].map(([theme, split]) => ({ theme, split })).sort(byTotalDesc);
  }

  function rankPlaces(c: Ctx, recs: PlantingRecord[]): Ranked<Place>[] {
    return [...groupSplits(recs, (r) => r.placeSlug)]
      .map(([slug, split]) => ({ item: c.placeBySlug.get(slug)!, split }))
      .sort(byTotalDesc);
  }

  function rankSpecies(c: Ctx, recs: PlantingRecord[]): Ranked<Species>[] {
    return [...groupSplits(recs, (r) => r.speciesId)]
      .map(([id, split]) => ({ item: c.speciesById.get(id)!, split }))
      .sort(byTotalDesc);
  }

  function rankBy<K>(recs: PlantingRecord[], key: (r: PlantingRecord) => K): Ranked<K>[] {
    return [...groupSplits(recs, key)].map(([item, split]) => ({ item, split })).sort(byTotalDesc);
  }

  function matchesText(v: RecordView, q: string): boolean {
    const keys = [...v.species.searchKeys, ...v.place.searchKeys, searchKey(v.record.parcelName)];
    return matchScore(q, keys) > 0;
  }

  return {
    async overview(): Promise<Overview> {
      const c = await ctx();
      const firstSeason = c.seasons[0];
      const lastSeason = c.seasons.at(-1);
      if (!firstSeason || !lastSeason) throw new Error("The planting history has no seasons.");
      return {
        split: splitOf(c.records),
        firstSeason,
        lastSeason,
        seasons: seasonSeries(c, c.records),
        placeCount: new Set(c.records.filter((r) => !c.placeBySlug.get(r.placeSlug)?.isScheme).map((r) => r.placeSlug)).size,
        schemeCount: new Set(c.records.filter((r) => c.placeBySlug.get(r.placeSlug)?.isScheme).map((r) => r.placeSlug)).size,
        parcelCount: c.places.reduce((n, p) => n + p.parcels.length, 0),
        speciesCount: new Set(c.records.map((r) => r.speciesId)).size,
        places: rankPlaces(c, c.records),
        species: rankSpecies(c, c.records),
        byClass: rankBy(c.records, (r) => r.siteClass),
        byConfidence: rankBy(c.records, (r) => r.confidence),
        byPrecision: rankBy(c.records, (r) => r.precision),
        themes: themesOf(c.records),
      };
    },

    async places(): Promise<PlaceSummary[]> {
      const c = await ctx();
      return c.places
        .map((place) => {
          const recs = c.records.filter((r) => r.placeSlug === place.slug);
          return {
            item: place,
            split: splitOf(recs),
            span: spanOf(c, recs)!,
            speciesCount: new Set(recs.map((r) => r.speciesId)).size,
          };
        })
        .filter((p) => p.split.records > 0)
        .sort(byTotalDesc);
    },

    async place(slug: string): Promise<PlaceDetail | null> {
      const c = await ctx();
      const place = c.placeBySlug.get(slug);
      if (!place) return null;
      const recs = c.records.filter((r) => r.placeSlug === slug);
      const parcelSplits = groupSplits(recs, (r) => r.parcelId);
      return {
        place,
        split: splitOf(recs),
        span: spanOf(c, recs)!,
        seasons: seasonSeries(c, recs),
        years: yearRows(recs),
        species: rankSpecies(c, recs),
        parcels: place.parcels
          .filter((parcel) => parcelSplits.has(parcel.id))
          .map((parcel) => ({
            item: parcel,
            split: parcelSplits.get(parcel.id)!,
            span: spanOf(c, recs.filter((r) => r.parcelId === parcel.id))!,
          }))
          .sort(byTotalDesc),
        themes: themesOf(recs),
        records: recs.map(c.view),
      };
    },

    async speciesList(): Promise<SpeciesSummary[]> {
      const c = await ctx();
      const bySpecies = new Map<string, PlantingRecord[]>();
      for (const r of c.records) {
        const a = bySpecies.get(r.speciesId) ?? [];
        a.push(r);
        bySpecies.set(r.speciesId, a);
      }
      return c.species
        .map((item) => {
          const recs = bySpecies.get(item.id) ?? [];
          return { item, split: splitOf(recs), span: spanOf(c, recs), placeCount: new Set(recs.map((r) => r.placeSlug)).size };
        })
        .sort((a, b) => byTotalDesc(a, b) || a.item.scientificName.localeCompare(b.item.scientificName));
    },

    async species(slug: string): Promise<SpeciesDetail | null> {
      const c = await ctx();
      const species = c.speciesBySlug.get(slug);
      if (!species) return null;
      const recs = c.records.filter((r) => r.speciesId === species.id);
      return {
        species,
        split: splitOf(recs),
        span: spanOf(c, recs),
        seasons: seasonSeries(c, recs),
        years: yearRows(recs),
        places: rankPlaces(c, recs),
        contested: species.contestedWith.map((id) => c.speciesById.get(id)).filter((s): s is Species => !!s),
        themes: themesOf(recs),
        records: recs.map(c.view),
      };
    },

    async seasons(): Promise<SeasonSummary[]> {
      const c = await ctx();
      const recon = await repo.listReconciliation();
      return seasonSeries(c, c.records).map((p) => {
        const recs = c.records.filter((r) => r.seasonSlug === p.season.slug);
        return {
          ...p,
          placeCount: new Set(recs.map((r) => r.placeSlug)).size,
          speciesCount: new Set(recs.map((r) => r.speciesId)).size,
          reconciliation: recon.find((x) => x.kind === "season" && x.label === p.season.label) ?? null,
        };
      });
    },

    async season(slug: string): Promise<SeasonDetail | null> {
      const c = await ctx();
      const season = c.seasonBySlug.get(slug);
      if (!season) return null;
      const recs = c.records.filter((r) => r.seasonSlug === slug);
      const recon = await repo.listReconciliation();
      return {
        season,
        previous: c.seasons[season.order - 1] ?? null,
        next: c.seasons[season.order + 1] ?? null,
        split: splitOf(recs),
        places: rankPlaces(c, recs),
        species: rankSpecies(c, recs),
        byClass: rankBy(recs, (r) => r.siteClass),
        reconciliation: recon.find((x) => x.kind === "season" && x.label === season.label) ?? null,
        themes: themesOf(recs),
        records: recs.map(c.view),
      };
    },

    async records(filter: RecordFilter = {}): Promise<RecordQueryResult> {
      const c = await ctx();
      const species = filter.species ? c.speciesBySlug.get(filter.species) : undefined;
      const q = filter.q?.trim();
      const rows = c.records
        .filter((r) => !filter.place || r.placeSlug === filter.place)
        .filter((r) => !filter.parcel || (!!filter.place && r.parcelId === filter.parcel))
        .filter((r) => !filter.species || r.speciesId === species?.id)
        .filter((r) => !filter.year || r.year === filter.year)
        .filter((r) => !filter.season || r.seasonName === filter.season)
        .filter((r) =>
          filter.review === "needs-review" ? r.needsReview : filter.review === "resolved" ? !r.needsReview : true,
        )
        .filter((r) => !filter.theme || (r.needsReview && r.notes.some((n) => n.kind !== "fyi" && n.theme === filter.theme)))
        .map(c.view)
        .filter((v) => !q || matchesText(v, q));
      return { filter, split: splitOf(rows.map((v) => v.record)), rows };
    },

    async search(query: string, limit = 8): Promise<SearchResult> {
      const c = await ctx();
      const q = query.trim();
      // One- and two-letter queries match half the register.
      if (searchKey(q).length < 3) return { query, places: [], species: [], seasons: [] };
      const placeSplits = groupSplits(c.records, (r) => r.placeSlug);
      const speciesSplits = groupSplits(c.records, (r) => r.speciesId);
      const seasonSplits = groupSplits(c.records, (r) => r.seasonSlug);
      const rank = <T extends { score: number; split: QuantitySplit }>(a: T, b: T) =>
        b.score - a.score || b.split.total - a.split.total;
      const places = c.places
        .map((p) => ({ item: p, split: placeSplits.get(p.slug) ?? emptySplit(), score: matchScore(q, p.searchKeys) }))
        .filter((x) => x.score > 0 && x.split.records > 0)
        .sort(rank)
        .slice(0, limit);
      const species = c.species
        .map((s) => ({ item: s, split: speciesSplits.get(s.id) ?? emptySplit(), score: matchScore(q, s.searchKeys) }))
        .filter((x) => x.score > 0 && x.split.records > 0)
        .sort(rank)
        .slice(0, limit);
      const qk = searchKey(q);
      const seasons = c.seasons
        .map((season) => {
          const label = searchKey(season.label);
          const score = label === qk ? 100 : qk === String(season.year) ? 90 : label.startsWith(qk) ? 60 : 0;
          return { season, split: seasonSplits.get(season.slug) ?? emptySplit(), score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.season.order - b.season.order)
        .slice(0, limit);
      return { query, places, species, seasons };
    },

    async dataQuality(): Promise<DataQuality> {
      const c = await ctx();
      const [reconciliation, info] = await Promise.all([
        repo.listReconciliation(), repo.getSourceInfo(),
      ]);
      return {
        split: splitOf(c.records),
        byConfidence: rankBy(c.records, (r) => r.confidence),
        byPrecision: rankBy(c.records, (r) => r.precision),
        themes: themesOf(c.records),
        reconciliation,
        source: info,
        threatened: c.species
          .filter((sp) => sp.threatenedMarks.plantsOutMaster || sp.threatenedMarks.teKakano)
          .map((sp) => {
            const recs = c.records.filter((r) => r.speciesId === sp.id);
            return {
              item: sp,
              split: splitOf(recs),
              agreed: sp.threatenedMarks.plantsOutMaster && sp.threatenedMarks.teKakano,
              placeCount: new Set(recs.map((r) => r.placeSlug)).size,
            };
          })
          .sort((a, b) => Number(b.agreed) - Number(a.agreed) || b.split.total - a.split.total),
      };
    },

    async lookups(): Promise<Lookups> {
      const c = await ctx();
      const usedSpecies = new Set(c.records.map((r) => r.speciesId));
      return {
        seasons: c.seasons,
        years: [...new Set(c.seasons.map((s) => s.year))],
        places: c.places,
        species: c.species
          .filter((s) => usedSpecies.has(s.id))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      };
    },
  };
}

export type WrtQueries = ReturnType<typeof createQueries>;
