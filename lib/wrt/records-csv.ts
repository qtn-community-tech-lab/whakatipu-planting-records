/** UTF-8 CSV, preserving unknown values as empty cells and formula-safe text. */
import type { RecordFilter, RecordView } from "./queries";
import { slugify } from "./text";
export function csvField(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+@\t\r-]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function recordsToCsv(rows: RecordView[]): string {
  const header = ["Season", "Year", "Planting date", "Site", "Area", "Species (common name)", "Botanical name", "Recorded plants", "Notes", "Precision", "Source", "Source workbook", "Sheet", "Cell", "Season as typed", "Site as typed", "Species as typed", "source_record"];
  const sorted = [...rows].sort((a, b) => a.season.order - b.season.order || a.place.name.localeCompare(b.place.name) || a.record.parcelName.localeCompare(b.record.parcelName) || a.species.displayName.localeCompare(b.species.displayName) || a.record.id.localeCompare(b.record.id));
  const values = sorted.map(({ record: r, species, place }) => [r.seasonName, r.year, r.plantingDate, place.name, r.parcelName, species.displayIsScientific ? "" : species.displayName, species.scientificName, r.quantity, r.notes, r.precision, r.source, r.provenance.sourceFile, r.provenance.sourceSheet, r.provenance.sourceCell, r.provenance.seasonLabelOriginal, r.provenance.siteOriginal, r.provenance.speciesOriginal, r.id]);
  return "\ufeff" + [header, ...values].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
export function csvFilename(filter: RecordFilter): string {
  return ["wrt-recorded-plants", filter.place, filter.species, filter.season, filter.year].filter((v) => v !== undefined && v !== "").map((v) => slugify(String(v))).filter(Boolean).join("-");
}
