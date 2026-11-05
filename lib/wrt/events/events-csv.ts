/**
 * The planting-events CSV (GET /events/export).
 *
 * One line per event × species, so it pivots and sums cleanly in a
 * spreadsheet. Event-level columns (date, site, area, polygon…) repeat on
 * each of the event's lines; "Event total plants" lets you count an event once.
 *
 * polygon_geojson is the event's area as a GeoJSON Polygon geometry
 * (WGS84 [longitude, latitude]). Paste a cell into geojson.io to see it, or
 * load the column into GIS.
 *
 * Same conventions as the records export (lib/wrt/records-csv.ts): UTF-8 with
 * BOM so macrons survive Excel, CRLF line ends, formula-like text defused.
 */
import { csvField } from "../records-csv";
import type { EventView } from "./views";

const HEADERS = [
  "Planting date",
  "Season",
  "Season year",
  "Site",
  "Part of site",
  "Species (common name)",
  "Botanical name",
  "Quantity",
  "Event total plants",
  "Area (ha)",
  "Notes",
  "Photo URL",
  "Created",
  "Updated",
  "event_id",
  "polygon_geojson",
];

export function eventsToCsv(views: EventView[]): string {
  const lines = [HEADERS.map(csvField).join(",")];
  for (const v of views) {
    const e = v.event;
    for (const s of v.species) {
      lines.push([
        e.plantedOn,
        e.season,
        e.seasonYear,
        v.siteName,
        v.partName ?? "",
        s.isScientific ? "" : s.name,
        s.scientific,
        s.quantity,
        v.totalPlants,
        (v.areaM2 / 10_000).toFixed(4),
        e.notes ?? "",
        e.photoUrl ?? "",
        e.createdAt,
        e.updatedAt,
        e.id,
        JSON.stringify(e.polygon),
      ].map(csvField).join(","));
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
