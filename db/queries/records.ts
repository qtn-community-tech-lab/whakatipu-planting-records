/** Staff Records reads: shared reference names, grouped insights and 50 rows. */
import { db } from "@/db/client";
import type { Json } from "@/db/database.types";
import { splitSchema, summarySchema, toHistoryReferences } from "@/db/history-models";
import type { Dimension, Summary } from "@/db/history-models";
import { toRecordView } from "@/db/records";
import { emptySplit } from "@/lib/wrt/queries";
import type { Lookups, PlaceSummary, RecordFilter } from "@/lib/wrt/queries";
import type { HistoryCell } from "@/lib/wrt/presentation";
import { matchScore, searchKey } from "@/lib/wrt/text";
import type { SortKey } from "@/components/wrt/explore/filters";

export function createRecordsQueries() {
  const client = db();
  const references = client.then(async (connection) => {
    const { data } = await connection
      .rpc("read_history_references", { profile: "names" })
      .throwOnError();
    return toHistoryReferences(data);
  });
  const measures = new Map<string, Promise<Summary>>();

  async function filtersFor(filter: RecordFilter): Promise<Json> {
    const refs = await references;
    return {
      ...(filter.place ? { site: filter.place } : {}),
      ...(filter.parcel ? { area: [...refs.parcels].find(([, parcel]) => parcel.placeSlug === filter.place && parcel.id === filter.parcel)?.[0] ?? "no-such-area" } : {}),
      ...(filter.species ? { species: filter.species } : {}),
      ...(filter.year ? { year: filter.year } : {}),
      ...(filter.season ? { half: filter.season.toLowerCase() } : {}),
      ...(filter.q?.trim() ? {
        textSites: refs.places.filter((place) => matchScore(filter.q!, place.searchKeys) > 0).map((place) => place.slug),
        textSpecies: refs.species.filter((species) => matchScore(filter.q!, species.searchKeys) > 0).map((species) => species.slug),
        textAreas: [...refs.parcels].filter(([, parcel]) => matchScore(filter.q!, [searchKey(parcel.name)]) > 0).map(([slug]) => slug),
      } : {}),
    };
  }

  async function measure(dimensions: Dimension[], filter: RecordFilter = {}) {
    const filters = await filtersFor(filter);
    const key = JSON.stringify([dimensions, filters]);
    let pending = measures.get(key);
    if (!pending) {
      pending = client.then(async (connection) => {
        const { data } = await connection
          .rpc("read_planting_summary", { group_by: dimensions, filters, show_review: true, include_group_counts: dimensions.length < 2 })
          .throwOnError();
        return summarySchema.parse(data);
      });
      measures.set(key, pending);
    }
    return pending;
  }

  async function context() {
    const [refs, siteRows, speciesRows] = await Promise.all([references, measure(["site"]), measure(["species"])]);
    const lookups: Lookups = {
      places: refs.places, seasons: refs.seasons, years: [...new Set(refs.seasons.map((season) => season.year))],
      species: refs.species.filter((species) => speciesRows.rows.some((row) => row.species === species.slug))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    };
    const places: PlaceSummary[] = siteRows.rows.map((row) => ({ item: refs.placeBySlug.get(row.site!)!, split: row.split,
      speciesCount: row.speciesCount, span: { first: refs.seasonById.get(row.firstSeason!)!,
        last: refs.seasonById.get(row.lastSeason!)!, seasonsActive: row.seasonCount } }));
    return { lookups, places };
  }

  async function summary(filter: RecordFilter) {
    const refs = await references;
    const place = refs.placeBySlug.get(filter.place ?? "");
    const showParts = !!place && place.parcels.length > 1 && !filter.parcel;
    const [seasonRows, siteRows, speciesRows] = await Promise.all([
      measure(["season"], filter), !place || showParts ? measure([place ? "area" : "site"], filter) : Promise.resolve(null),
      measure(["species"], filter),
    ]);
    const where = siteRows?.rows ?? [];
    const rowsBy = !place && where.length > 1 ? "site" as const : showParts ? "part" as const : "species" as const;
    const activeSeasons = seasonRows.rows.filter((row) => row.split.records > 0).length;
    const usefulTimeline = !(filter.year && filter.season) && activeSeasons > 1 && (rowsBy !== "species" || speciesRows.rows.length > 1);
    const timeline = usefulTimeline ? await measure([rowsBy === "part" ? "area" : rowsBy, "season"], filter) : null;
    const cells: HistoryCell[] = (timeline?.rows ?? []).map((row) => {
      const parcel = row.area ? refs.parcels.get(row.area) : undefined;
      const at = refs.placeBySlug.get(row.site ?? parcel?.placeSlug ?? filter.place ?? "");
      const owner = at ?? (where.length === 1 ? refs.placeBySlug.get(where[0]!.site ?? "") : undefined);
      const species = row.species ? refs.speciesBySlug.get(row.species) : undefined;
      const season = refs.seasonBySlug.get(row.season!);
      if (!owner || !season || (row.area && !parcel) || (row.species && !species)) throw new Error("Records summary references unavailable history.");
      return { area: row.area, place: owner, parcel: parcel ?? null, species: species ?? null, season, split: row.split };
    });
    return { split: splitSchema.parse(seasonRows.totals), siteCount: seasonRows.totals.sites, speciesCount: seasonRows.totals.species,
      seasons: refs.seasons.map((season) => ({ season, split: seasonRows.rows.find((row) => row.season === season.slug)?.split ?? emptySplit() })),
      sites: where.map((row) => ({ place: row.site ? refs.placeBySlug.get(row.site)! : place!,
        parcel: row.area ? refs.parcels.get(row.area)! : null, split: row.split })),
      species: speciesRows.rows.map((row) => ({ item: refs.speciesBySlug.get(row.species!)!, split: row.split })),
      cells, rowsBy };
  }

  async function page(filter: RecordFilter, pageNumber: number, sort: SortKey) {
    const [connection, refs, filters] = await Promise.all([client, references, filtersFor(filter)]);
    const { data } = await connection
      .rpc("read_records_page", { filters, show_review: true, sort_by: sort, page_number: pageNumber })
      .throwOnError();
    return data.map((row) => {
      const view = toRecordView(row);
      const species = refs.speciesBySlug.get(row.species!);
      const place = refs.placeBySlug.get(row.site!);
      const season = refs.seasonBySlug.get(row.season!);
      const parcel = refs.parcels.get(row.area!);
      if (!species || !place || !season || !parcel) throw new Error("Records page references unavailable history.");
      return { ...view, species, place, season, record: { ...view.record, parcelId: parcel.id, speciesId: species.id } };
    });
  }

  return { context, summary, page };
}

export type RecordsSummary = Awaited<ReturnType<ReturnType<typeof createRecordsQueries>["summary"]>>;
