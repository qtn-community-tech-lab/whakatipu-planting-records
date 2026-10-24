/**
 * Row validators for the V0 CSV sources. Each turns a raw CSV row into a typed
 * row or records a DataIssue. Errors stop the load; warnings are kept and shown
 * on the "About the data" page.
 */
import type { CsvTable } from "./parse";
import type { Confidence, DataIssue, Precision, SeasonName, SiteClass } from "./types";

export const REQUIRED_COLUMNS = {
  planting_history: [
    "record_id", "year", "season", "season_label_original", "site_original", "site_id_proposed",
    "site_group_proposed", "site_class", "species_original", "species_id_proposed", "species_canonical",
    "quantity", "precision", "confidence", "needs_review", "review_reason", "source_file",
    "source_sheet", "source_cell",
  ],
  species_master_proposed: [
    "species_id", "canonical_handle", "common_name", "maori_name", "status", "over_5m",
    "threatened", "needs_wrt_decision", "contested_with", "note",
  ],
  species_crosswalk: ["species_id", "raw_name", "match_key"],
  site_crosswalk: [
    "site_original", "site_id_proposed", "site_name_proposed", "site_group", "class", "precision",
  ],
  history_reconciliation: ["item", "label", "generated", "stated", "difference", "stated_cell", "records", "cause"],
} as const;

export type SourceName = keyof typeof REQUIRED_COLUMNS;

export function checkColumns(file: SourceName, table: CsvTable, issues: DataIssue[]): boolean {
  const missing = REQUIRED_COLUMNS[file].filter((c) => !table.header.includes(c));
  if (missing.length) {
    issues.push({ file, line: 1, severity: "error", message: `Missing columns: ${missing.join(", ")}` });
    return false;
  }
  table.rows.forEach((r, i) => {
    if (r.__fieldCount) {
      issues.push({
        file, line: table.lines[i], severity: "warning",
        message: `Row has ${r.__fieldCount} fields, header has ${table.header.length}`,
      });
    }
  });
  return true;
}

export interface HistoryRow {
  recordId: string;
  year: number;
  season: SeasonName;
  seasonLabelOriginal: string;
  siteOriginal: string;
  siteIdProposed: string;
  siteGroupProposed: string;
  siteClass: SiteClass;
  speciesOriginal: string;
  speciesIdProposed: string;
  speciesCanonical: string;
  quantity: number | null;
  precision: Precision;
  confidence: Confidence;
  needsReview: boolean;
  reviewReason: string;
  sourceFile: string;
  sourceSheet: string;
  sourceCell: string;
}

const CLASS_MAP: Record<string, SiteClass> = { K: "keystone", C: "community", S: "school" };
const PRECISIONS: Precision[] = ["site", "subsite", "area", "scheme", "unknown"];
const CONFIDENCES: Confidence[] = ["high", "medium", "low"];

export function toSiteClass(v: string): SiteClass {
  return CLASS_MAP[v.trim().toUpperCase()] ?? "unknown";
}

export function validateHistoryRow(
  raw: Record<string, string>, line: number, issues: DataIssue[],
): HistoryRow | null {
  const file = "planting_history";
  const err = (message: string) => {
    issues.push({ file, line, severity: "error", message: `${raw.record_id || "?"}: ${message}` });
    return null;
  };
  const warn = (message: string) =>
    issues.push({ file, line, severity: "warning", message: `${raw.record_id || "?"}: ${message}` });

  if (!raw.record_id) return err("missing record_id");
  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return err(`bad year '${raw.year}'`);
  const season = raw.season.trim();
  if (season !== "Autumn" && season !== "Spring") return err(`bad season '${raw.season}'`);
  if (!raw.species_id_proposed) return err("missing species_id_proposed");
  if (!raw.site_group_proposed) return err("missing site_group_proposed");

  let quantity: number | null = null;
  const q = raw.quantity.trim();
  if (q === "") {
    if (raw.needs_review !== "Y") return err("blank quantity on a record not flagged for review");
  } else {
    const n = Number(q);
    if (!Number.isFinite(n) || n < 0) return err(`bad quantity '${raw.quantity}'`);
    if (!Number.isInteger(n)) warn(`fractional quantity ${n}`);
    quantity = n;
  }

  const precision = PRECISIONS.includes(raw.precision as Precision) ? (raw.precision as Precision) : "unknown";
  if (precision === "unknown" && raw.precision !== "unknown") warn(`unknown precision '${raw.precision}'`);
  const confidence = CONFIDENCES.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : null;
  if (!confidence) return err(`bad confidence '${raw.confidence}'`);
  if (raw.needs_review !== "Y" && raw.needs_review !== "N") return err(`bad needs_review '${raw.needs_review}'`);
  if (raw.needs_review === "Y" && !raw.review_reason.trim()) warn("flagged for review with no reason");

  return {
    recordId: raw.record_id,
    year,
    season,
    seasonLabelOriginal: raw.season_label_original,
    siteOriginal: raw.site_original,
    siteIdProposed: raw.site_id_proposed.trim(),
    siteGroupProposed: raw.site_group_proposed.trim(),
    siteClass: toSiteClass(raw.site_class),
    speciesOriginal: raw.species_original,
    speciesIdProposed: raw.species_id_proposed.trim(),
    speciesCanonical: raw.species_canonical.trim(),
    quantity,
    precision,
    confidence,
    needsReview: raw.needs_review === "Y",
    reviewReason: raw.review_reason.trim(),
    sourceFile: raw.source_file,
    sourceSheet: raw.source_sheet,
    sourceCell: raw.source_cell,
  };
}

/** "Y" → true, "N" → false, anything else → null. */
export function yn(v: string | undefined): boolean | null {
  if (v === "Y") return true;
  if (v === "N") return false;
  return null;
}
