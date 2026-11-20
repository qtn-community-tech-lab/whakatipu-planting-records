/** Public pages: grouped measures and bounded review rows. */
import { publicDb } from "@/db/repository";
import type { Json } from "@/db/database.types";
import { referenceSpeciesSchema, reconciliation, splitSchema, summarySchema, toHistoryReferences, toSpecies } from "@/db/history-models";
import type { Dimension, HistoryReferences, Summary, SummaryRow } from "@/db/history-models";
import { byTotalDesc, emptySplit } from "@/lib/wrt/queries";
import type { DataQuality, Overview, PlaceSummary, RecordFilter, SeasonPoint, SeasonSummary, Span, SpeciesSummary, ThemeSummary, YearRow } from "@/lib/wrt/queries";
import type { HistoryCell } from "@/lib/wrt/presentation";
import { addSplits } from "@/lib/wrt/presentation";
import type { QuantitySplit, ReviewTheme, Species } from "@/lib/wrt/types";
import { matchScore, searchKey } from "@/lib/wrt/text";

type Filter = Omit<RecordFilter, "q"> & { seasonSlug?: string };
type Profile = "names" | "cards" | "full";

function span(refs: HistoryReferences, row: { firstSeason: number | null; lastSeason: number | null; seasons?: number; seasonCount?: number }): Span | null {
  const first = row.firstSeason === null ? undefined : refs.seasonById.get(row.firstSeason);
  const last = row.lastSeason === null ? undefined : refs.seasonById.get(row.lastSeason);
  return first && last ? { first, last, seasonsActive: row.seasons ?? row.seasonCount ?? 0 } : null;
}

function seasonPoints(refs: HistoryReferences, rows: SummaryRow[]): SeasonPoint[] {
  return refs.seasons.map((season) => ({ season, split: rows.find((row) => row.season === season.slug)?.split ?? emptySplit() }));
}

function yearRows(points: SeasonPoint[]): YearRow[] {
  const running = emptySplit();
  const years = [...new Set(points.filter((point) => point.split.records > 0).map((point) => point.season.year))];
  return years.map((year) => {
    const autumn = points.find((point) => point.season.year === year && point.season.name === "Autumn")?.split ?? emptySplit();
    const spring = points.find((point) => point.season.year === year && point.season.name === "Spring")?.split ?? emptySplit();
    const total = addSplits({ ...autumn }, spring);
    addSplits(running, total);
    return { year, autumn, spring, total, runningTotal: { ...running } };
  });
}

function themes(rows: SummaryRow[]): ThemeSummary[] {
  return rows.filter((row) => row.theme !== null).map((row) => ({ theme: row.theme as ReviewTheme, split: row.split })).sort(byTotalDesc);
}

/** Each instance belongs to one request; identical measures share their read. */
export function createPublicHistoryQueries() {
  const referenceReads = new Map<Profile, Promise<HistoryReferences>>();
  const measureReads = new Map<string, Promise<Summary>>();

  function references(profile: Profile = "names") {
    let pending = referenceReads.get(profile);
    if (!pending) {
      pending = Promise.resolve(publicDb()
        .rpc("read_history_references", { profile })
        .throwOnError())
        .then(({ data }) => toHistoryReferences(data));
      referenceReads.set(profile, pending);
    }
    return pending;
  }

  async function databaseFilter(filter: Filter): Promise<Json> {
    const out: Record<string, Json> = {};
    if (filter.place) out.site = filter.place;
    if (filter.species) out.species = filter.species;
    if (filter.year !== undefined) out.year = filter.year;
    if (filter.season) out.half = filter.season.toLowerCase();
    if (filter.seasonSlug) out.season = filter.seasonSlug;
    if (filter.parcel) {
      const refs = await references();
      out.area = [...refs.parcels].find(([, parcel]) => parcel.placeSlug === filter.place && parcel.id === filter.parcel)?.[0] ?? "no-such-area";
    }
    return out;
  }

  async function measure(dimensions: Dimension[], filter: Filter = {}) {
    const filters = await databaseFilter(filter);
    const key = JSON.stringify([dimensions, filters]);
    let pending = measureReads.get(key);
    if (!pending) {
      pending = Promise.resolve(publicDb()
        .rpc("read_planting_summary", { group_by: dimensions, filters, show_review: true,
          ...(dimensions.length > 1 ? { include_group_counts: false } : {}) })
        .throwOnError())
        .then(({ data }) => summarySchema.parse(data));
      measureReads.set(key, pending);
    }
    return pending;
  }

  async function cells(dimensions: Dimension[], filter: Filter = {}): Promise<HistoryCell[]> {
    const [refs, result] = await Promise.all([references(), measure(dimensions, filter)]);
    return result.rows.map((row) => {
      const parcel = row.area ? refs.parcels.get(row.area) : undefined;
      const place = refs.placeBySlug.get(row.site ?? parcel?.placeSlug ?? filter.place ?? "");
      const species = row.species ? refs.speciesBySlug.get(row.species) : undefined;
      const season = row.season ? refs.seasonBySlug.get(row.season) : undefined;
      if (!place || (row.area && !parcel) || (row.species && !species) || (row.season && !season)) {
        throw new Error("Planting summary references unavailable history.");
      }
      return { area: row.area, place, parcel: parcel ?? null,
        species: species ?? null, season: season ?? null, split: row.split };
    });
  }

  async function speciesList(profile: Profile = "cards"): Promise<SpeciesSummary[]> {
    const [refs, result] = await Promise.all([references(profile), measure(["species"])]);
    return refs.species.map((item) => {
      const row = result.rows.find((row) => row.species === item.slug);
      return { item, split: row?.split ?? emptySplit(), span: row ? span(refs, row) : null, placeCount: row?.siteCount ?? 0 };
    }).sort((a, b) => byTotalDesc(a, b) || a.item.scientificName.localeCompare(b.item.scientificName));
  }

  async function places(): Promise<PlaceSummary[]> {
    const [refs, result] = await Promise.all([references(), measure(["site"])]);
    return result.rows.map((row) => ({ item: refs.placeBySlug.get(row.site!)!, split: row.split,
      span: span(refs, row)!, speciesCount: row.speciesCount })).sort(byTotalDesc);
  }

  async function seasons(): Promise<SeasonSummary[]> {
    const [refs, result] = await Promise.all([references(), measure(["season"])]);
    const checks = reconciliation(refs, result.rows);
    return seasonPoints(refs, result.rows).map((point) => {
      const row = result.rows.find((row) => row.season === point.season.slug);
      return { ...point, placeCount: row?.siteCount ?? 0, speciesCount: row?.speciesCount ?? 0,
        reconciliation: checks.find((check) => check.label === point.season.label) ?? null };
    });
  }

  async function overview(): Promise<Overview> {
    const [refs, siteRows, speciesRows, seasonRows, classes, precision, confidence, themeRows] = await Promise.all([
      references(), places(), speciesList("names"), seasons(), measure(["class"]), measure(["precision"]), measure(["confidence"]), measure(["theme"]),
    ]);
    return {
      split: splitSchema.parse(classes.totals), firstSeason: refs.seasons[0] ?? null, lastSeason: refs.seasons.at(-1) ?? null,
      seasons: seasonRows, siteCount: refs.places.filter((place) => !place.deactivatedAt).length,
      siteCountWithPlantings: classes.totals.sites, speciesCount: refs.species.filter((species) => !species.deactivatedAt).length,
      speciesCountWithPlantings: classes.totals.species, parcelCount: refs.parcels.size,
      places: siteRows, species: speciesRows,
      byClass: classes.rows.map((row) => ({ item: row.class!, split: row.split })),
      byPrecision: precision.rows.map((row) => ({ item: row.precision!, split: row.split })),
      byConfidence: confidence.rows.map((row) => ({ item: row.confidence!, split: row.split })), themes: themes(themeRows.rows),
    };
  }

  async function place(slug: string, options: { parcel?: string; part?: string } = {}) {
    const refs = await references();
    const item = refs.placeBySlug.get(slug);
    if (!item) return null;
    const selectedPart = options.part ? item.parcels.find((parcel) => parcel.slug === options.part) : undefined;
    if (options.part && !selectedPart) return null;
    const parcel = options.parcel ?? selectedPart?.id;
    const filter: Filter = { place: slug, ...(parcel ? { parcel } : {}) };
    const charts = cells(["area", "species", "season"], filter);
    const parts = parcel ? cells(["area", "species"], { place: slug }) : charts;
    const [seasonRows, speciesRows, partRows, themeRows, chartCells, partCells] = await Promise.all([
      measure(["season"], filter), measure(["species"], filter), measure(["area"], { place: slug }), measure(["theme"], filter),
      charts,
      parts,
    ]);
    const points = seasonPoints(refs, seasonRows.rows);
    return {
      place: item, split: splitSchema.parse(seasonRows.totals), span: span(refs, seasonRows.totals)!, seasons: points, years: yearRows(points),
      species: speciesRows.rows.map((row) => ({ item: refs.speciesBySlug.get(row.species!)!, split: row.split })),
      parcels: partRows.rows.map((row) => ({ item: refs.parcels.get(row.area!)!, split: row.split, span: span(refs, row)! })),
      themes: themes(themeRows.rows), records: [], cells: chartCells, partCells,
      areaTotals: partRows.rows.map((row) => ({ area: row.area!, parcel: refs.parcels.get(row.area!)!, split: row.split })),
    };
  }

  async function species(slug: string) {
    const refs = await references();
    const base = refs.speciesBySlug.get(slug);
    if (!base) return null;
    const client = publicDb();
    const [reference, seasonRows, siteRows, themeRows] = await Promise.all([
      client.from("species")
        .select("slug, register_code, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m, threatened, threatened_te_kakano, contested_group, needs_decision, register_note, maori_name_alternatives, summary, look_for, sources, checked_at, photos, deactivated_at")
        .eq("slug", slug)
        .maybeSingle()
        .throwOnError(),
      measure(["season"], { species: slug }), measure(["site"], { species: slug }), measure(["theme"], { species: slug }),
    ]);
    if (!reference.data) return null;
    const selected = toSpecies(referenceSpeciesSchema.parse({ ...reference.data, aliases: base.aliases }));
    const points = seasonPoints(refs, seasonRows.rows);
    return { species: { ...selected, contestedWith: base.contestedWith }, split: splitSchema.parse(seasonRows.totals),
      span: span(refs, seasonRows.totals), seasons: points, years: yearRows(points),
      places: siteRows.rows.map((row) => ({ item: refs.placeBySlug.get(row.site!)!, split: row.split })),
      contested: refs.species.filter((item) => base.contestedWith.includes(item.id)), themes: themes(themeRows.rows), records: [] };
  }

  async function season(slug: string) {
    const refs = await references();
    const at = refs.seasons.findIndex((item) => item.slug === slug);
    if (at < 0) return null;
    const filter = { seasonSlug: slug };
    const [all, siteRows, speciesRows, classRows, themeRows, chartCells] = await Promise.all([
      seasons(), measure(["site"], filter), measure(["species"], filter), measure(["class"], filter), measure(["theme"], filter),
      cells(["site", "species"], filter),
    ]);
    return { season: refs.seasons[at]!, previous: refs.seasons[at - 1] ?? null, next: refs.seasons[at + 1] ?? null,
      split: splitSchema.parse(siteRows.totals), places: siteRows.rows.map((row) => ({ item: refs.placeBySlug.get(row.site!)!, split: row.split })),
      species: speciesRows.rows.map((row) => ({ item: refs.speciesBySlug.get(row.species!)!, split: row.split })),
      byClass: classRows.rows.map((row) => ({ item: row.class!, split: row.split })),
      reconciliation: all[at]?.reconciliation ?? null, themes: themes(themeRows.rows), records: [], cells: chartCells };
  }

  async function search(query: string, limit = 8) {
    if (searchKey(query).length < 3) return { query, places: [], species: [], seasons: [] };
    const [refs, siteRows, speciesRows, seasonRows] = await Promise.all([references(), measure(["site"]), speciesList("names"), seasons()]);
    const rank = (a: { score: number; split: QuantitySplit }, b: { score: number; split: QuantitySplit }) => b.score - a.score || b.split.total - a.split.total;
    const key = searchKey(query);
    return { query,
      places: refs.places.map((item) => ({ item, split: siteRows.rows.find((row) => row.site === item.slug)?.split ?? emptySplit(), score: matchScore(query, item.searchKeys) }))
        .filter((row) => row.score > 0).sort(rank).slice(0, limit),
      species: speciesRows.map((row) => ({ ...row, score: matchScore(query, row.item.searchKeys) }))
        .filter((row) => row.score > 0 && row.split.records > 0).sort(rank).slice(0, limit),
      seasons: seasonRows.map((row) => ({ ...row, score: searchKey(row.season.label) === key ? 100 : String(row.season.year) === key ? 90 : searchKey(row.season.label).startsWith(key) ? 60 : 0 }))
        .filter((row) => row.score > 0).sort((a, b) => b.score - a.score || a.season.order - b.season.order).slice(0, limit),
    };
  }

  async function dataQuality(): Promise<DataQuality> {
    const [refs, confidence, precision, themeRows, seasonRows, speciesRows] = await Promise.all([
      references(), measure(["confidence"]), measure(["precision"]), measure(["theme"]), measure(["season"]), speciesList("names"),
    ]);
    return { split: splitSchema.parse(confidence.totals),
      byConfidence: confidence.rows.map((row) => ({ item: row.confidence!, split: row.split })),
      byPrecision: precision.rows.map((row) => ({ item: row.precision!, split: row.split })), themes: themes(themeRows.rows),
      reconciliation: reconciliation(refs, seasonRows.rows),
      source: { description: "Read from the Trust's Supabase database, imported from the MASTER sheet of WRT's Plants Out Master workbook: one line per species, site and season.",
        tables: [{ name: "seasons", rows: refs.seasons.length }, { name: "species", rows: refs.species.length },
          { name: "sites", rows: refs.places.length }, { name: "areas", rows: refs.parcels.size }, { name: "planting lines", rows: confidence.totals.records }] },
      threatened: speciesRows.filter((row) => row.item.threatenedMarks.plantsOutMaster || row.item.threatenedMarks.teKakano)
        .map((row) => ({ ...row, agreed: row.item.threatenedMarks.plantsOutMaster && row.item.threatenedMarks.teKakano }))
        .sort((a, b) => Number(b.agreed) - Number(a.agreed) || byTotalDesc(a, b)),
    };
  }

  async function siteSpecies(limit = 3) {
    const refs = await references();
    const { data } = await publicDb()
      .rpc("read_site_species_leaders", { show_review: true, leader_count: limit })
      .throwOnError();
    const rows = summarySchema.shape.rows.parse(data);
    const groups = new Map<string, { species: { species: Species; split: QuantitySplit }[]; speciesCount: number }>();
    for (const row of rows) {
      const group = groups.get(row.site!) ?? { species: [], speciesCount: row.speciesCount };
      group.species.push({ species: refs.speciesBySlug.get(row.species!)!, split: row.split });
      groups.set(row.site!, group);
    }
    return groups;
  }

  async function seasonLeaders(limit = 3) {
    const refs = await references();
    const { data } = await publicDb()
      .rpc("read_season_leaders", { show_review: true, leader_count: limit })
      .throwOnError();
    const result = data as { species: Json; sites: Json };
    return {
      species: summarySchema.shape.rows.parse(result.species).map((row) => ({ season: row.season!, species: refs.speciesBySlug.get(row.species!)!, split: row.split })),
      sites: summarySchema.shape.rows.parse(result.sites).map((row) => ({ season: row.season!, slug: row.site!, name: refs.placeBySlug.get(row.site!)!.name, split: row.split })),
    };
  }

  async function counts() {
    const refs = await references();
    return { siteCount: refs.places.filter((place) => !place.deactivatedAt).length,
      speciesCount: refs.species.filter((species) => !species.deactivatedAt).length,
      seasonCount: refs.seasons.length, firstSeason: refs.seasons[0] ?? null };
  }

  return { overview, places, speciesList, species, place, season, seasons, search, dataQuality,
    cells, siteSpecies, seasonLeaders, counts };
}
