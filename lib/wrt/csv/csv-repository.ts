/**
 * CsvWrtRepository: the V0 storage adapter.
 *
 * Reads the transformed CSVs (never the original WRT spreadsheets), validates
 * every row, and builds domain entities. Loaded once per server process.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, type CsvTable } from "./parse";
import { checkColumns, toSiteClass, validateHistoryRow, yn, type HistoryRow, type SourceName, type SourceRow } from "./validate";
import type { SourceInfo, WrtRepository } from "../repository";
import type {
  DataIssue, Parcel, Place, PlantingRecord, ReconciliationRow, ReviewNote, ReviewNoteKind,
  ReviewTheme, Season, SeasonName, SiteClass, Species,
} from "../types";
import { cleanLabel, searchKey, slugify } from "../text";
import { primaryName, withMacrons } from "../display-names";

export const DEFAULT_DATA_DIR = path.join(process.cwd(), "docs", "planning", "prototype");

const FILES: Record<SourceName, string> = {
  planting_history: "planting_history.csv",
  species_master_proposed: "species_master_proposed.csv",
  species_crosswalk: "species_crosswalk.csv",
  site_crosswalk: "site_crosswalk.csv",
  history_reconciliation: "history_reconciliation.csv",
};

interface Loaded {
  seasons: Season[];
  species: Species[];
  places: Place[];
  records: PlantingRecord[];
  reconciliation: ReconciliationRow[];
  issues: DataIssue[];
  info: SourceInfo;
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

function splitNames(v: string): string[] {
  return v
    .split(/,\s*or\s+|\s+or\s+|,\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function placeNameFromGroup(group: string) {
  return group.replace(/\s*\(scheme\)\s*$/i, "").trim();
}

export function loadFromDirectory(dir: string): Loaded {
  const issues: DataIssue[] = [];
  function readTable<Name extends SourceName>(name: Name): CsvTable<SourceRow<Name>> {
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
    species_master_proposed: readTable("species_master_proposed"),
    species_crosswalk: readTable("species_crosswalk"),
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

  // ---- species
  const aliasesBySpecies = new Map<string, { raw: string[]; keys: string[] }>();
  // A leading "#" on a crosswalk spelling is the threatened marker in the Te Kakano list.
  const teKakanoThreatened = new Set<string>();
  for (const a of tables.species_crosswalk.rows) {
    if (!a.species_id) continue;
    if (a.raw_name?.trim().startsWith("#")) teKakanoThreatened.add(a.species_id);
    const entry = aliasesBySpecies.get(a.species_id) ?? { raw: [], keys: [] };
    if (a.raw_name) entry.raw.push(cleanLabel(a.raw_name.replace(/^\s*#\s*/, "")));
    if (a.match_key) entry.keys.push(searchKey(a.match_key));
    aliasesBySpecies.set(a.species_id, entry);
  }
  const speciesById = new Map<string, Species>();
  const usedSlugs = new Set<string>();
  for (const s of tables.species_master_proposed.rows) {
    if (!s.species_id) continue;
    const scientificName = cleanLabel(s.canonical_handle);
    const commonAll = splitNames(s.common_name ?? "");
    const maoriAll = splitNames(s.maori_name ?? "");
    const commonName = withMacrons(primaryName(s.common_name ?? ""));
    const maoriName = withMacrons(primaryName(s.maori_name ?? ""));
    const displayName = maoriName ?? commonName ?? scientificName;
    let slug = slugify(scientificName) || slugify(s.species_id);
    if (usedSlugs.has(slug)) {
      issues.push({ file: "species_master_proposed", line: 0, severity: "warning", message: `slug collision ${slug}` });
      slug = `${slug}-${slugify(s.species_id)}`;
    }
    usedSlugs.add(slug);
    const alias = aliasesBySpecies.get(s.species_id) ?? { raw: [], keys: [] };
    const suggested = cleanLabel(s.suggested_spelling ?? "") || null;
    const status = (["core", "appended", "contested", "seedlog_only"] as const).find((x) => x === s.status) ?? "unknown";
    const searchKeys = new Set<string>(
      [scientificName, suggested ?? "", ...commonAll, ...maoriAll, ...alias.raw].map(searchKey).concat(alias.keys),
    );
    searchKeys.delete("");
    speciesById.set(s.species_id, {
      id: s.species_id,
      slug,
      scientificName,
      suggestedSpelling: suggested && suggested !== scientificName ? suggested : null,
      commonName,
      maoriName,
      displayName,
      displayIsScientific: displayName === scientificName,
      status,
      over5m: yn(s.over_5m),
      threatened: yn(s.threatened),
      threatenedMarks: { plantsOutMaster: s.threatened === "Y", teKakano: teKakanoThreatened.has(s.species_id) },
      needsDecision: s.needs_wrt_decision === "Y",
      contestedWith: (s.contested_with ?? "").split(/\s+/).filter(Boolean),
      aliases: [...new Set(alias.raw)].filter((a) => a !== scientificName),
      searchKeys: [...searchKeys],
      note: s.note?.trim() || null,
    });
  }

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
      issues.push({ file: "planting_history", line: 0, severity: "error", message: `${r.recordId}: species ${r.speciesIdProposed} not in species master` });
      continue;
    }
    const isScheme = r.precision === "scheme" || /\(scheme\)/i.test(r.siteGroupProposed);
    const placeName = placeNameFromGroup(r.siteGroupProposed);
    const placeSlug = slugify(placeName);
    let entry = placeMap.get(placeSlug);
    if (!entry) {
      entry = {
        place: { slug: placeSlug, name: placeName, siteClasses: [], isScheme, parcels: [], searchKeys: [] },
        plantsByClass: new Map(),
        parcels: new Map(),
      };
      placeMap.set(placeSlug, entry);
    }
    const xw = siteXwalk.get(cleanLabel(r.siteOriginal).toLowerCase());
    if (!xw) {
      issues.push({ file: "planting_history", line: 0, severity: "warning", message: `${r.recordId}: site '${cleanLabel(r.siteOriginal)}' not in site crosswalk` });
    }
    const parcelName = isScheme ? placeName : cleanLabel(xw?.site_name_proposed || r.siteOriginal);
    const parcelId = r.siteIdProposed || null;
    const parcelKey = parcelId ?? `unnumbered-${slugify(parcelName)}`;
    const siteClass = r.siteClass !== "unknown" ? r.siteClass : toSiteClass(xw?.class ?? "");
    let parcel = entry.parcels.get(parcelKey);
    if (!parcel) {
      parcel = { id: parcelKey, name: parcelName, placeSlug, siteClass, aliases: [] };
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
      speciesId: species.id,
      quantity: qty,
      hasQuantity: r.quantity !== null,
      precision: r.precision,
      confidence: r.confidence,
      needsReview: r.needsReview,
      notes: parseReviewNotes(r.reviewReason).map((n) => ({
        ...n,
        text: humaniseNote(n.text, (id) => speciesById.get(id)?.scientificName),
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

  const info: SourceInfo = {
    description:
      "Generated from the MASTER sheet of WRT's Plants Out Master workbook, one row per species, site and season. The app reads these generated files; it never opens the original spreadsheets.",
    files: (Object.keys(FILES) as SourceName[]).map((n) => ({ name: FILES[n], rows: tables[n].rows.length })),
    loadedAt: new Date().toISOString(),
  };

  return {
    seasons,
    species: [...speciesById.values()],
    places,
    records,
    reconciliation,
    issues,
    info,
  };
}

export class CsvWrtRepository implements WrtRepository {
  private data: Loaded | null = null;
  constructor(private readonly dir: string = DEFAULT_DATA_DIR) {}

  private load(): Loaded {
    if (!this.data) this.data = loadFromDirectory(this.dir);
    return this.data;
  }

  async listSeasons() { return this.load().seasons; }
  async listSpecies() { return this.load().species; }
  async listPlaces() { return this.load().places; }
  async listRecords() { return this.load().records; }
  async listReconciliation() { return this.load().reconciliation; }
  async listDataIssues() { return this.load().issues; }
  async getSourceInfo() { return this.load().info; }
}
