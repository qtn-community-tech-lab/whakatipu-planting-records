/**
 * Every stored row for the staff data export (/export), deactivated rows included.
 * Large tables are read a page at a time: Supabase returns at most PAGE_SIZE rows a request.
 */
import { db } from "@/db/client";
import { PAGE_SIZE } from "./views";

/** Read every page of a query ordered by a unique key. `page` must apply `.range(from, to)`. */
async function readAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await page(from, from + PAGE_SIZE - 1);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function exportSites() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("sites")
      .select("slug, name, description, deactivated_at")
      .order("slug")
      .range(from, to)
      .throwOnError(),
  );
}

export async function exportAreas() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("areas")
      .select("slug, site, name, wrt_number, class, description, lat, lng, radius_m, pin_source_url, pin_checked_on, deactivated_at")
      .order("slug")
      .range(from, to)
      .throwOnError(),
  );
}

export async function exportSpecies() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("species")
      .select("slug, scientific_name, suggested_spelling, status, threatened, threatened_te_kakano, over_5m, register_code, register_note, photos, deactivated_at")
      .order("slug")
      .range(from, to)
      .throwOnError(),
  );
}

export async function exportPlantingEvents() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("planting_events")
      .select("id, area, planted_on, type, source, notes, deactivated_at, areas(site), seasons(label)")
      .order("id")
      .range(from, to)
      .throwOnError(),
  );
}

export async function exportPlantingLines() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("planting_lines")
      .select("id, planting_event, species, quantity, legacy_code, source_file, source_sheet, source_cell, deactivated_at, species_row:species(scientific_name), event:planting_events(area, planted_on, type, deactivated_at, areas(site), seasons(label))")
      .order("id")
      .range(from, to)
      .throwOnError(),
  );
}

export async function exportNotes() {
  const client = await db();
  return readAllPages((from, to) =>
    client
      .from("notes")
      .select("id, line, kind, question, text, resolved_at, deactivated_at, questions(question, ruling)")
      .order("id")
      .range(from, to)
      .throwOnError(),
  );
}

export type ExportTable = "sites" | "areas" | "species" | "planting_events" | "planting_lines" | "notes";

/** How many rows a table holds, counted by the database without sending them. */
export async function countExportRows(table: ExportTable) {
  const { count } = await (await db())
    .from(table)
    .select("*", { count: "exact", head: true })
    .throwOnError();
  return count ?? 0;
}
