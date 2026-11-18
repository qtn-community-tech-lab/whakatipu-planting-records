/** The six files of the staff data export, in page order, each with its columns listed once. */
import type { Json } from "@/db/database.types";
import {
  exportAreas, exportNotes, exportPlantingEvents, exportPlantingLines, exportSites, exportSpecies,
  type ExportTable,
} from "@/db/queries/export";
import { toCsv, type Cell } from "./csv";

interface Column<Row> {
  header: string;
  value: (row: Row) => Cell;
}

export interface ExportFile {
  /** The CSV's name and its download address: /export/<name>.csv. */
  name: string;
  /** The table it reads, for the row count. */
  table: ExportTable;
  label: string;
  /** "One row per …" on the page. */
  rowPer: string;
  group: "Plantings" | "Places and species";
  csv: () => Promise<string>;
}

function defineFile<Row>(
  file: Omit<ExportFile, "csv">,
  read: () => Promise<Row[]>,
  columns: readonly Column<Row>[],
): ExportFile {
  return {
    ...file,
    csv: async () => toCsv(columns.map((c) => c.header), (await read()).map((row) => columns.map((c) => c.value(row)))),
  };
}

/** The species' image URLs, the field WRT edits on the species form; the first is the primary image. */
function photoUrls(photos: Json): string {
  if (!Array.isArray(photos)) return "";
  return photos
    .flatMap((photo) => (photo && typeof photo === "object" && !Array.isArray(photo) && typeof photo.src === "string" ? [photo.src] : []))
    .join(" | ");
}

export const EXPORT_FILES: readonly ExportFile[] = [
  defineFile(
    { name: "planting_lines", table: "planting_lines", label: "Planting lines", rowPer: "species in one planting event, with its site, season, type and quantity", group: "Plantings" },
    exportPlantingLines,
    [
      { header: "line_id", value: (r) => r.id },
      { header: "event_id", value: (r) => r.planting_event },
      { header: "site_slug", value: (r) => r.event?.areas?.site },
      { header: "site_area_slug", value: (r) => r.event?.area },
      { header: "season", value: (r) => r.event?.seasons?.label },
      { header: "planted_on", value: (r) => r.event?.planted_on },
      { header: "planting_type", value: (r) => r.event?.type },
      { header: "species_slug", value: (r) => r.species },
      { header: "scientific_name", value: (r) => r.species_row?.scientific_name },
      { header: "quantity", value: (r) => r.quantity },
      { header: "legacy_code", value: (r) => r.legacy_code },
      { header: "source_file", value: (r) => r.source_file },
      { header: "source_sheet", value: (r) => r.source_sheet },
      { header: "source_cell", value: (r) => r.source_cell },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
      { header: "event_deactivated_at", value: (r) => r.event?.deactivated_at },
    ],
  ),
  defineFile(
    { name: "planting_events", table: "planting_events", label: "Planting events", rowPer: "site area planted in one season", group: "Plantings" },
    exportPlantingEvents,
    [
      { header: "event_id", value: (r) => r.id },
      { header: "site_slug", value: (r) => r.areas?.site },
      { header: "site_area_slug", value: (r) => r.area },
      { header: "season", value: (r) => r.seasons?.label },
      { header: "planted_on", value: (r) => r.planted_on },
      { header: "planting_type", value: (r) => r.type },
      { header: "source", value: (r) => r.source },
      { header: "notes", value: (r) => r.notes },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "notes", table: "notes", label: "Review notes", rowPer: "review note on a species line", group: "Plantings" },
    exportNotes,
    [
      { header: "note_id", value: (r) => r.id },
      { header: "line_id", value: (r) => r.line },
      { header: "kind", value: (r) => r.kind },
      { header: "question_slug", value: (r) => r.question },
      { header: "question", value: (r) => r.questions?.question },
      { header: "ruling", value: (r) => r.questions?.ruling },
      { header: "text", value: (r) => r.text },
      { header: "resolved_at", value: (r) => r.resolved_at },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "sites", table: "sites", label: "Sites", rowPer: "site", group: "Places and species" },
    exportSites,
    [
      { header: "site_slug", value: (r) => r.slug },
      { header: "name", value: (r) => r.name },
      { header: "description", value: (r) => r.description },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "site_areas", table: "areas", label: "Site areas", rowPer: "part of a site, with its map pin", group: "Places and species" },
    exportAreas,
    [
      { header: "site_area_slug", value: (r) => r.slug },
      { header: "site_slug", value: (r) => r.site },
      { header: "name", value: (r) => r.name },
      { header: "wrt_number", value: (r) => r.wrt_number },
      { header: "class", value: (r) => r.class },
      { header: "description", value: (r) => r.description },
      { header: "lat", value: (r) => r.lat },
      { header: "lng", value: (r) => r.lng },
      { header: "radius_m", value: (r) => r.radius_m },
      { header: "pin_source_url", value: (r) => r.pin_source_url },
      { header: "pin_checked_on", value: (r) => r.pin_checked_on },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "species", table: "species", label: "Species", rowPer: "species, with threatened marks and image links", group: "Places and species" },
    exportSpecies,
    [
      { header: "species_slug", value: (r) => r.slug },
      { header: "scientific_name", value: (r) => r.scientific_name },
      { header: "suggested_spelling", value: (r) => r.suggested_spelling },
      { header: "status", value: (r) => r.status },
      { header: "threatened", value: (r) => r.threatened },
      { header: "threatened_te_kakano", value: (r) => r.threatened_te_kakano },
      { header: "over_5m", value: (r) => r.over_5m },
      { header: "register_code", value: (r) => r.register_code },
      { header: "register_note", value: (r) => r.register_note },
      { header: "photo_urls", value: (r) => photoUrls(r.photos) },
      { header: "deactivated_at", value: (r) => r.deactivated_at },
    ],
  ),
];

export function findExportFile(name: string): ExportFile | undefined {
  return EXPORT_FILES.find((file) => file.name === name);
}
