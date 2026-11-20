/** Workbook import only: read and validate the transformed CSVs, then build import entities. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, type CsvTable } from "./parse";
import { checkColumns, toSiteClass, validateHistoryRow, type DataIssue, type HistoryRow, type SourceName, type SourceRow } from "./validate";
import type {
  Parcel, Place, PlantingRecord, ReconciliationRow, ReviewNote, ReviewNoteKind,
  ReviewTheme, Season, SeasonName, SiteClass,
} from "../../lib/wrt/types";
import { cleanLabel, searchKey, slugify } from "../../lib/wrt/text";
import { readSpeciesSeed, type SpeciesSeedEntry } from "../species/seed";

export const DEFAULT_DATA_DIR = path.join(process.cwd(), "docs", "planning", "prototype");

const FILES = {
  planting_history: "planting_history.csv",
  site_crosswalk: "site_crosswalk.csv",
  history_reconciliation: "history_reconciliation.csv",
} satisfies Partial<Record<SourceName, string>>;

interface Loaded {
  seasons: Season[];
  species: SpeciesSeedEntry[];
  places: Place[];
  records: PlantingRecord[];
  reconciliation: ReconciliationRow[];
  issues: DataIssue[];
}

export class WrtDataError extends Error {
  constructor(public issues: DataIssue[]) {
    super(
      `WRT data failed validation (${issues.length} error${issues.length === 1 ? "" : "s"}):\n` +
        issues.slice(0, 10).map((i) => `  ${i.file}:${i.line} ${i.message}`).join("\n"),
    );
  }
}

// ---------------------------------------------------------------- review notes

const NOTE_TAG = /^(RULING|CONFIRM|FYI):\s*/;

export function reviewTheme(text: string): ReviewTheme {
  const t = text.toLowerCase();
  if (t.includes("species contested")) return "contested-species";
  if (t.includes("order scheme")) return "order-scheme";
  if (t.includes("decision 4") || t.includes("slope hill columns real")) return "slope-hill-2024";
  if (/row-\d+ id .* vs register/.test(t)) return "site-number-mismatch";
  if (t.includes("no wrt site number")) return "new-site";
  if (t.includes("personal text")) return "header-cleaned";
  if (t.includes("holds text") || t.includes("not a number")) return "not-a-number";
  if (t.includes("site identity") || t.includes("two parcels") || t.includes("not in the variants table")) {
    return "site-identity";
  }
  return "other";
}

/**
 * The source joins notes AND sub-clauses with "; ". A part that starts with a
 * RULING/CONFIRM/FYI tag opens a new note; anything else continues the last one.
 */
export function parseReviewNotes(reason: string): ReviewNote[] {
  const notes: ReviewNote[] = [];
  for (const part of reason.split(/;\s+/)) {
    const p = part.trim();
    if (!p) continue;
    const m = NOTE_TAG.exec(p);
    if (m) {
      const kind: ReviewNoteKind = m[1] === "FYI" ? "fyi" : m[1] === "CONFIRM" ? "confirm" : "ruling";
      notes.push({ kind, theme: "other", text: p.slice(m[0].length), raw: p });
    } else {
      const last = notes.at(-1);
      if (last) {
        last.text += `; ${p}`;
        last.raw += `; ${p}`;
      } else {
        notes.push({ kind: "ruling", theme: "other", text: p, raw: p });
      }
    }
  }
  for (const n of notes) n.theme = n.kind === "fyi" ? "other" : reviewTheme(n.text);
  return notes;
}

/**
 * Make a note readable without exposing join keys: species IDs become the
 * register's names, contested-cluster codes go, transformation jargon is
 * reworded. The original stays in `raw`.
 */
export function humaniseNote(text: string, speciesName: (id: string) => string | undefined): string {
  return text
    .replace(/\bSP-\d+(?:\s+SP-\d+)*/g, (m) =>
      m.split(/\s+/).map((id) => speciesName(id) ?? "another species").join(" and "),
    )
    .replace(/\s*\(C\d+\)/g, "")
    .replace(/separate stock lines or one\?\s*ID kept as typed, no merge/i, "one species or two? Kept as typed; the numbers are not merged")
    .replace(/\brow-5 site ID\b/g, "MASTER site number")
    .replace(/\brow-5 ID\b/g, "MASTER site number")
    .replace(/\bthe row-5 ID\b/g, "the MASTER site number")
    .replace(/\bprovisional ID\b/g, "provisional site number");
}

// ---------------------------------------------------------------- loading

function seasonSlug(year: number, name: SeasonName) {
  return `${name.toLowerCase()}-${year}`;
}

function placeNameFromGroup(group: string) {
  return group.replace(/\s*\(scheme\)\s*$/i, "").trim();
}

export function loadFromDirectory(dir: string): Loaded {
  const issues: DataIssue[] = [];
  function readTable<Name extends keyof typeof FILES>(name: Name): CsvTable<SourceRow<Name>> {
    const file = FILES[name];
    let text: string;
    try {
      text = readFileSync(path.join(dir, file), "utf8");
    } catch {
      issues.push({ file: name, line: 0, severity: "error", message: `Cannot read ${path.join(dir, file)}` });
      return { header: [], rows: [], lines: [] };
    }
    const table = parseCsv(text);
    return checkColumns(name, table, issues) ? table : { header: [], rows: [], lines: [] };
  }
  const tables = {
    planting_history: readTable("planting_history"),
    site_crosswalk: readTable("site_crosswalk"),
    history_reconciliation: readTable("history_reconciliation"),
  };
  if (issues.some((i) => i.severity === "error")) throw new WrtDataError(issues.filter((i) => i.severity === "error"));

  // ---- history rows
  const hist: HistoryRow[] = [];
  const histTable = tables.planting_history;
  histTable.rows.forEach((raw, i) => {
    const row = validateHistoryRow(raw, histTable.lines[i] ?? 1, issues);
    if (row) hist.push(row);
  });
  const seenIds = new Set<string>();
  for (const r of hist) {
    if (seenIds.has(r.recordId)) {
      issues.push({ file: "planting_history", line: 0, severity: "error", message: `duplicate record_id ${r.recordId}` });
    }
    seenIds.add(r.recordId);
  }

  // Species and all their reference content come from the complete maintained seed.
  const species = readSpeciesSeed();
  const speciesById = new Map(species.map((entry) => [entry.register_code ?? entry.slug, entry]));

  // ---- sites
  const siteXwalk = new Map<string, SourceRow<"site_crosswalk">>();
  for (const x of tables.site_crosswalk.rows) siteXwalk.set(cleanLabel(x.site_original).toLowerCase(), x);

  // ---- seasons
  const seasonKeys = new Map<string, { year: number; name: SeasonName }>();
  for (const r of hist) seasonKeys.set(seasonSlug(r.year, r.season), { year: r.year, name: r.season });
  const seasons: Season[] = [...seasonKeys.entries()]
    .map(([slug, v]) => ({ slug, year: v.year, name: v.name, label: `${v.name} ${v.year}`, order: 0 }))
    .sort((a, b) => a.year - b.year || (a.name === b.name ? 0 : a.name === "Autumn" ? -1 : 1));
  seasons.forEach((s, i) => (s.order = i));
  const seasonOrder = new Map(seasons.map((s) => [s.slug, s.order]));

  // ---- places, parcels, records
  const placeMap = new Map<string, { place: Place; plantsByClass: Map<SiteClass, number>; parcels: Map<string, Parcel> }>();
  const records: PlantingRecord[] = [];
  for (const r of hist) {
    const species = speciesById.get(r.speciesIdProposed);
    if (!species) {
      issues.push({ file: "planting_history", line: 0, severity: "error", message: `${r.recordId}: species ${r.speciesIdProposed} not in data/species.json` });
      continue;
    }
    const placeName = placeNameFromGroup(r.siteGroupProposed);
    const placeSlug = slugify(placeName);
    let entry = placeMap.get(placeSlug);
    if (!entry) {
      entry = {
        place: { slug: placeSlug, name: placeName, siteClasses: [], parcels: [], searchKeys: [] },
        plantsByClass: new Map(),
        parcels: new Map(),
      };
      placeMap.set(placeSlug, entry);
    }
    const xw = siteXwalk.get(cleanLabel(r.siteOriginal).toLowerCase());
    if (!xw) {
      issues.push({ file: "planting_history", line: 0, severity: "warning", message: `${r.recordId}: site '${cleanLabel(r.siteOriginal)}' not in site crosswalk` });
    }
    const parcelName = cleanLabel(xw?.site_name_proposed || r.siteOriginal);
    const parcelId = r.siteIdProposed || null;
    const parcelKey = parcelId ?? `unnumbered-${slugify(parcelName)}`;
    const siteClass = r.siteClass !== "unknown" ? r.siteClass : toSiteClass(xw?.class ?? "");
    let parcel = entry.parcels.get(parcelKey);
    if (!parcel) {
      parcel = { id: parcelKey, slug: "", name: parcelName, placeSlug, siteClass, aliases: [] };
      entry.parcels.set(parcelKey, parcel);
    }
    const orig = cleanLabel(r.siteOriginal);
    if (!parcel.aliases.includes(orig)) parcel.aliases.push(orig);
    const qty = r.quantity ?? 0;
    entry.plantsByClass.set(siteClass, (entry.plantsByClass.get(siteClass) ?? 0) + qty);

    records.push({
      id: r.recordId,
      seasonSlug: seasonSlug(r.year, r.season),
      year: r.year,
      seasonName: r.season,
      placeSlug,
      parcelId: parcelKey,
      parcelName,
      siteClass,
      speciesId: species.register_code ?? species.slug,
      quantity: qty,
      hasQuantity: r.quantity !== null,
      precision: r.precision,
      confidence: r.confidence,
      needsReview: r.needsReview,
      notes: parseReviewNotes(r.reviewReason).map((n) => ({
        ...n,
        text: humaniseNote(n.text, (id) => speciesById.get(id)?.scientific_name),
      })),
      provenance: {
        sourceFile: r.sourceFile,
        sourceSheet: r.sourceSheet,
        sourceCell: r.sourceCell,
        seasonLabelOriginal: r.seasonLabelOriginal,
        siteOriginal: orig,
        speciesOriginal: cleanLabel(r.speciesOriginal),
      },
    });
  }
  records.sort(
    (a, b) => (seasonOrder.get(a.seasonSlug) ?? 0) - (seasonOrder.get(b.seasonSlug) ?? 0) || a.id.localeCompare(b.id),
  );

  const places: Place[] = [...placeMap.values()]
    .map(({ place, plantsByClass, parcels }) => {
      place.siteClasses = [...plantsByClass.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
      place.parcels = [...parcels.values()].sort((a, b) => a.name.localeCompare(b.name));
      const keys = new Set([place.name, ...place.parcels.flatMap((p) => [p.name, ...p.aliases])].map(searchKey));
      keys.delete("");
      place.searchKeys = [...keys];
      return place;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Match the fixed keys allocated by the workbook import, without changing legacy IDs.
  const usedAreaSlugs = new Set<string>();
  for (const place of places) {
    for (const parcel of place.parcels) {
      const base = slugify(parcel.name) || "area";
      let slug = usedAreaSlugs.has(base) ? `${place.slug}-${base}` : base;
      for (let n = 2; usedAreaSlugs.has(slug); n++) slug = `${place.slug}-${base}-${n}`;
      usedAreaSlugs.add(slug);
      parcel.slug = slug;
    }
  }

  // ---- reconciliation
  const reconciliation: ReconciliationRow[] = tables.history_reconciliation.rows.map((x) => ({
    kind: x.item === "season" || x.item === "grand" ? x.item : "exception",
    label: x.label,
    generated: Number(x.generated) || 0,
    stated: Number(x.stated) || 0,
    difference: Number(x.difference) || 0,
    statedCell: x.stated_cell,
    records: Number(x.records) || 0,
    cause: x.cause?.trim() || null,
  }));

  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length) throw new WrtDataError(errors);

  return {
    seasons,
    species,
    places,
    records,
    reconciliation,
    issues,
  };
}
