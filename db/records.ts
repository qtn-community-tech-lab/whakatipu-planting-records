/**
 * Supabase rows in the shapes used by the pages and components.
 */
import { byTotalDesc, emptySplit, addToSplit, splitOf } from "@/lib/wrt/queries";
import type { RecordView, Ranked, SeasonDetail, SeasonSummary, ThemeSummary } from "@/lib/wrt/queries";
import type { Confidence, Place, Precision, ReviewNoteKind, ReviewTheme, Season, SiteClass, Species } from "@/lib/wrt/types";
import type { listSeasonPlantingLines, listSeasons } from "./queries/plantings";

type LineRow = Awaited<ReturnType<typeof listSeasonPlantingLines>>[number];
type SeasonRow = Awaited<ReturnType<typeof listSeasons>>[number];

function toSeason(slug: string, label: string, year: number, order: number): Season {
  return { slug, label, year, order, name: slug.startsWith("autumn") ? "Autumn" : "Spring" };
}

/** One season's totals row as a season summary. With the review switch off, totals are confirmed plants only. */
export function toSeasonSummary(r: SeasonRow, showReview: boolean): SeasonSummary {
  const plants = r.plants ?? 0;
  const confirmed = r.plants_confirmed ?? 0;
  const lines = r.lines ?? 0;
  const linesReview = r.lines_needs_review ?? 0;
  return {
    season: toSeason(r.season!, r.season_label!, r.year!, r.season_order!),
    split: showReview
      ? { total: plants, resolved: confirmed, needsReview: r.plants_needs_review ?? 0, records: lines, recordsNeedingReview: linesReview }
      : { total: confirmed, resolved: confirmed, needsReview: 0, records: lines - linesReview, recordsNeedingReview: 0 },
    placeCount: r.sites ?? 0,
    speciesCount: r.species ?? 0,
    reconciliation: r.workbook_total === null ? null : {
      kind: "season", label: r.season_label!, generated: plants, stated: r.workbook_total,
      difference: plants - r.workbook_total, statedCell: r.workbook_cell ?? "", records: lines, cause: null,
    },
  };
}

/** One line_details row as a record with its species, site and season. */
export function toRecordView(r: LineRow): RecordView {
  const scientificName = r.scientific_name!;
  const displayName = r.maori_name ?? r.common_name ?? scientificName;
  const siteClass = (r.class ?? "unknown") as SiteClass;
  const season = toSeason(r.season!, r.season_label!, r.year!, r.season_order!);
  const notes = (r.notes as { question: string; kind: ReviewNoteKind; text: string }[] | null) ?? [];
  const species: Species = {
    id: r.register_code ?? r.species!, slug: r.species!, scientificName, suggestedSpelling: null,
    commonName: r.common_name, maoriName: r.maori_name, displayName, displayIsScientific: displayName === scientificName,
    status: "unknown", over5m: null, threatened: r.threatened,
    threatenedMarks: { plantsOutMaster: r.threatened === true, teKakano: r.threatened_te_kakano === true },
    needsDecision: r.contested_group !== null, contestedWith: [], aliases: [], searchKeys: [], note: null,
  };
  const place: Place = {
    slug: r.site!, name: r.site_name!, siteClasses: [siteClass], isScheme: r.is_scheme === true,
    parcels: [{ id: r.area!, name: r.area_name!, placeSlug: r.site!, siteClass, aliases: [] }], searchKeys: [],
  };
  return {
    season, species, place,
    record: {
      id: r.legacy_code ?? `line-${r.line_id}`, seasonSlug: season.slug, year: season.year, seasonName: season.name,
      placeSlug: place.slug, parcelId: r.area!, parcelName: r.area_name!, siteClass, speciesId: species.id,
      quantity: r.quantity ?? 0, hasQuantity: r.quantity !== null,
      precision: (r.precision ?? "unknown") as Precision, confidence: (r.confidence ?? "high") as Confidence,
      needsReview: r.needs_review === true,
      // The import merges a line's notes on one question into one, a line each: split them back.
      notes: notes.flatMap((n) => n.text.split("\n").map((text) => ({ kind: n.kind, theme: n.question as ReviewTheme, text, raw: text }))),
      provenance: {
        sourceFile: r.source_file ?? "", sourceSheet: r.source_sheet ?? "", sourceCell: r.source_cell ?? "",
        seasonLabelOriginal: r.season_original ?? season.label, siteOriginal: r.site_original ?? "", speciesOriginal: r.species_original ?? "",
      },
    },
  };
}

/** Records grouped by a key, largest first. */
function rank<K, T>(views: RecordView[], key: (v: RecordView) => K, item: (v: RecordView) => T): Ranked<T>[] {
  const m = new Map<K, Ranked<T>>();
  for (const v of views) {
    const e = m.get(key(v)) ?? { item: item(v), split: emptySplit() };
    addToSplit(e.split, v.record);
    m.set(key(v), e);
  }
  return [...m.values()].sort(byTotalDesc);
}

/** The questions open on these records, largest first. A record can sit under several. */
function themesOf(views: RecordView[]): ThemeSummary[] {
  const m = new Map<ReviewTheme, ReturnType<typeof emptySplit>>();
  for (const { record } of views) {
    if (!record.needsReview) continue;
    const themes = new Set(record.notes.filter((n) => n.kind !== "fyi").map((n) => n.theme));
    if (!themes.size) themes.add("other");
    for (const t of themes) m.set(t, addToSplit(m.get(t) ?? emptySplit(), record));
  }
  return [...m].map(([theme, split]) => ({ theme, split })).sort(byTotalDesc);
}

/**
 * One season's page from its totals and lines. Seasons are those with lines, in order.
 * With the review switch off, lines still waiting on WRT are left out.
 */
export function toSeasonDetail(slug: string, seasons: SeasonSummary[], lines: LineRow[], showReview: boolean): SeasonDetail | null {
  const at = seasons.findIndex((s) => s.season.slug === slug);
  if (at < 0) return null;
  const summary = seasons[at];
  if (!summary) return null;
  // Workbook order (line ids follow it), for consistent ranking when totals tie.
  const views = [...lines].sort((a, b) => a.line_id! - b.line_id!)
    .map(toRecordView)
    .filter((v) => showReview || !v.record.needsReview);
  return {
    season: summary.season,
    previous: seasons[at - 1]?.season ?? null,
    next: seasons[at + 1]?.season ?? null,
    split: splitOf(views.map((v) => v.record)),
    places: rank(views, (v) => v.place.slug, (v) => v.place),
    species: rank(views, (v) => v.species.slug, (v) => v.species),
    byClass: rank(views, (v) => v.record.siteClass, (v) => v.record.siteClass),
    reconciliation: summary.reconciliation,
    themes: themesOf(views),
    records: views,
  };
}
