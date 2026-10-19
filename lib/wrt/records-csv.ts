/**
 * The /records/export CSV: one line per record in the same order the pages
 * use, UTF-8 with BOM so macrons survive Excel, CRLF line ends.
 */
import type { RecordFilter, RecordView } from "./queries";
import { PRECISION_LABELS } from "./review-themes";

const HEADERS = [
  "Season",
  "Year",
  "Site",
  "Parcel",
  "Species (common name)",
  "Botanical name",
  "Recorded plants",
  "Needs review",
  "Review notes",
  "Confidence",
  "Precision",
  "Source workbook",
  "Sheet",
  "Cell",
  "Season as typed",
  "Site as typed",
  "Species as typed",
  "source_record",
];

/** Quote for CSV, and defuse spreadsheet formulas in text that starts with = + @. */
export function csvField(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recordsToCsv(rows: RecordView[]): string {
  const sorted = [...rows].sort(
    (a, b) =>
      a.season.order - b.season.order ||
      a.place.name.localeCompare(b.place.name) ||
      a.record.parcelName.localeCompare(b.record.parcelName) ||
      a.species.displayName.localeCompare(b.species.displayName),
  );

  const lines = [HEADERS.map(csvField).join(",")];
  for (const { record: r, species, place, season } of sorted) {
    const p = r.provenance;
    lines.push(
      [
        season.name,
        r.year,
        place.name,
        r.parcelName,
        species.displayIsScientific ? "" : species.displayName,
        species.scientificName,
        r.hasQuantity ? r.quantity : "",
        r.needsReview ? "Yes" : "No",
        r.notes.map((n) => `${n.kind === "ruling" ? "WRT ruling" : n.kind === "confirm" ? "To confirm" : "Mapping note"}: ${n.text}`).join(" | "),
        r.confidence,
        PRECISION_LABELS[r.precision].label,
        p.sourceFile.split("/").pop() ?? p.sourceFile,
        p.sourceSheet,
        p.sourceCell,
        p.seasonLabelOriginal,
        p.siteOriginal,
        p.speciesOriginal,
        r.id,
      ]
        .map(csvField)
        .join(","),
    );
  }

  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

/** wrt-recorded-plants-<place>-<species>-<season>-<year>.csv, with only the parts of the filter that are set. */
export function csvFilename(filter: RecordFilter): string {
  return ["wrt-recorded-plants", filter.place, filter.species, filter.season?.toLowerCase(), filter.year]
    .filter(Boolean)
    .join("-");
}
