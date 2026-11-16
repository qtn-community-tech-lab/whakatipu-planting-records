/**
 * The six files of the staff data export, in page order. Each file's columns are listed once here:
 * the CSV, the zip's README and the /export page all read them, so the documentation can't drift.
 */
import type { Json } from "@/db/database.types";
import {
  exportAreas, exportNotes, exportPlantingEvents, exportPlantingLines, exportSites, exportSpecies,
  type ExportTable,
} from "@/db/queries/export";
import { toCsv, type Cell } from "./csv";

interface ColumnDoc {
  header: string;
  about: string;
}

interface Column<Row> extends ColumnDoc {
  value: (row: Row) => Cell;
}

export interface ExportFile {
  /** Table name, also the CSV's name inside the zip and in its download address. */
  name: ExportTable;
  label: string;
  /** "One row per …" on the page and in the README. */
  rowPer: string;
  group: "Plantings" | "Places and species";
  startHere?: boolean;
  columns: readonly ColumnDoc[];
  csv: () => Promise<string>;
}

function defineFile<Row>(
  file: Omit<ExportFile, "columns" | "csv">,
  read: () => Promise<Row[]>,
  columns: readonly Column<Row>[],
): ExportFile {
  return {
    ...file,
    columns: columns.map(({ header, about }) => ({ header, about })),
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

const DEACTIVATED = "Date this row stopped being current. Blank: still in use.";
const SEASON = "The planting season, e.g. Autumn 2019.";
const PLANTED_ON = "Planting date. Blank for workbook history, which only has a season.";
const PLANTING_TYPE = "Establishment, infill or replacement. Blank where not known.";

export const EXPORT_FILES: readonly ExportFile[] = [
  defineFile(
    { name: "planting_lines", label: "Planting lines", rowPer: "species in one planting event, with its site, season, type and quantity", group: "Plantings", startHere: true },
    exportPlantingLines,
    [
      { header: "line_id", about: "This line's ID. Notes link to it.", value: (r) => r.id },
      { header: "event_id", about: "The planting event, in planting_events.csv.", value: (r) => r.planting_event },
      { header: "site_slug", about: "The site, in sites.csv.", value: (r) => r.event?.areas?.site },
      { header: "area_slug", about: "The area, in areas.csv.", value: (r) => r.event?.area },
      { header: "season", about: SEASON, value: (r) => r.event?.seasons?.label },
      { header: "planted_on", about: PLANTED_ON, value: (r) => r.event?.planted_on },
      { header: "planting_type", about: PLANTING_TYPE, value: (r) => r.event?.type },
      { header: "species_slug", about: "The species, in species.csv.", value: (r) => r.species },
      { header: "scientific_name", about: "The species' name in the register.", value: (r) => r.species_row?.scientific_name },
      { header: "quantity", about: "Plants of this species. Blank means unknown (TBC in the workbook), not zero.", value: (r) => r.quantity },
      { header: "legacy_code", about: "The workbook row this line came from, e.g. PH-2019A-FK10. Blank for app entries.", value: (r) => r.legacy_code },
      { header: "source_file", about: "Workbook file the line was imported from.", value: (r) => r.source_file },
      { header: "source_sheet", about: "Sheet in that workbook.", value: (r) => r.source_sheet },
      { header: "source_cell", about: "Cell in that sheet.", value: (r) => r.source_cell },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
      { header: "event_deactivated_at", about: "Date the line's planting event stopped being current. Blank: still in use.", value: (r) => r.event?.deactivated_at },
    ],
  ),
  defineFile(
    { name: "planting_events", label: "Planting events", rowPer: "area planted in one season", group: "Plantings" },
    exportPlantingEvents,
    [
      { header: "event_id", about: "This event's ID. Planting lines link to it.", value: (r) => r.id },
      { header: "site_slug", about: "The site, in sites.csv.", value: (r) => r.areas?.site },
      { header: "area_slug", about: "The area, in areas.csv.", value: (r) => r.area },
      { header: "season", about: SEASON, value: (r) => r.seasons?.label },
      { header: "planted_on", about: PLANTED_ON, value: (r) => r.planted_on },
      { header: "planting_type", about: PLANTING_TYPE, value: (r) => r.type },
      { header: "source", about: "workbook: imported history. app: entered in this app.", value: (r) => r.source },
      { header: "notes", about: "Notes written on the event.", value: (r) => r.notes },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "notes", label: "Review notes", rowPer: "review note on a species line", group: "Plantings" },
    exportNotes,
    [
      { header: "note_id", about: "This note's ID.", value: (r) => r.id },
      { header: "line_id", about: "The species line, in planting_lines.csv.", value: (r) => r.line },
      { header: "kind", about: "ruling: WRT decided. confirm: still to confirm. fyi: for information.", value: (r) => r.kind },
      { header: "question_slug", about: "The question this note belongs to.", value: (r) => r.question },
      { header: "question", about: "The question in full.", value: (r) => r.questions?.question },
      { header: "ruling", about: "WRT's answer to the question, where given.", value: (r) => r.questions?.ruling },
      { header: "text", about: "The note on this line.", value: (r) => r.text },
      { header: "resolved_at", about: "Date the note was resolved. Blank: still open.", value: (r) => r.resolved_at },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "sites", label: "Sites", rowPer: "site", group: "Places and species" },
    exportSites,
    [
      { header: "site_slug", about: "This site's ID. Areas, events and lines link to it.", value: (r) => r.slug },
      { header: "name", about: "Site name.", value: (r) => r.name },
      { header: "description", about: "Site description.", value: (r) => r.description },
      { header: "is_scheme", about: "Yes for a planting scheme rather than a single place.", value: (r) => r.is_scheme },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "areas", label: "Areas", rowPer: "known area within a site, with its map pin", group: "Places and species" },
    exportAreas,
    [
      { header: "area_slug", about: "This area's ID. Events and lines link to it.", value: (r) => r.slug },
      { header: "site_slug", about: "The site, in sites.csv.", value: (r) => r.site },
      { header: "name", about: "Area name.", value: (r) => r.name },
      { header: "wrt_number", about: "WRT's own number for the area, e.g. 9G.", value: (r) => r.wrt_number },
      { header: "class", about: "Kind of site.", value: (r) => r.class },
      { header: "description", about: "Area description.", value: (r) => r.description },
      { header: "lat", about: "Map pin latitude.", value: (r) => r.lat },
      { header: "lng", about: "Map pin longitude.", value: (r) => r.lng },
      { header: "radius_m", about: "Rough size of the area around the pin, in metres.", value: (r) => r.radius_m },
      { header: "pin_source_url", about: "Where the pin's position came from.", value: (r) => r.pin_source_url },
      { header: "pin_checked_on", about: "Date the pin was last checked.", value: (r) => r.pin_checked_on },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
    ],
  ),
  defineFile(
    { name: "species", label: "Species", rowPer: "species, with threatened marks and image links", group: "Places and species" },
    exportSpecies,
    [
      { header: "species_slug", about: "This species' ID. Lines link to it.", value: (r) => r.slug },
      { header: "scientific_name", about: "Name as spelled in the register.", value: (r) => r.scientific_name },
      { header: "suggested_spelling", about: "Usual botanical spelling, where it differs.", value: (r) => r.suggested_spelling },
      { header: "status", about: "Status in the register.", value: (r) => r.status },
      { header: "threatened", about: "Threatened mark (T) in the Plants Out Master. Blank: not recorded.", value: (r) => r.threatened },
      { header: "threatened_te_kakano", about: "Threatened in Te Kākano's list.", value: (r) => r.threatened_te_kakano },
      { header: "over_5m", about: "Grows taller than 5 m. Blank: not recorded.", value: (r) => r.over_5m },
      { header: "register_code", about: "The old SP- register code.", value: (r) => r.register_code },
      { header: "register_note", about: "Note from the register.", value: (r) => r.register_note },
      { header: "photo_urls", about: "Image URLs from the species page, separated by |. The first is the main image.", value: (r) => photoUrls(r.photos) },
      { header: "deactivated_at", about: DEACTIVATED, value: (r) => r.deactivated_at },
    ],
  ),
];

export function findExportFile(name: string): ExportFile | undefined {
  return EXPORT_FILES.find((file) => file.name === name);
}

/** README.txt for the zip: what the files hold, how they link, and every column. */
export function exportReadme(exportedOn: string): string {
  const files = EXPORT_FILES.map((file) => [
    `${file.name}.csv: one row per ${file.rowPer}.`,
    ...file.columns.map((column) => `  ${column.header}: ${column.about}`),
  ].join("\r\n"));
  return [
    "Whakatipu Reforestation Trust: planting data export",
    `Exported ${exportedOn} (New Zealand date).`,
    "",
    "Everything stored in the app: the workbook history and entries made in the app, including rows that are no longer in use.",
    "",
    "Reading the files",
    "- A blank quantity means unknown (TBC in the workbook), not zero. 0 appears only where 0 was recorded.",
    "- Rows no longer in use are kept and have a date in deactivated_at. Filter them out to see today's picture.",
    "- planting_events.source says whether a planting came from the workbook or was entered in the app.",
    "- Totals match the app: add up quantity in planting_lines.csv, leaving out lines with a date in deactivated_at or event_deactivated_at.",
    "- Files link by the *_slug and *_id columns: sites > areas > planting events > planting lines > notes, and species > planting lines.",
    "- Yes/No columns are left blank where the value was never recorded.",
    "",
    ...files.flatMap((text) => [text, ""]),
  ].join("\r\n");
}
