/** Complete site and area seeds, excluding audit fields maintained by database triggers. */
import { z } from "zod";
import siteDump from "../../data/sites.json";
import areaDump from "../../data/site_areas.json";
import type { TablesInsert } from "../../db/database.types";
import type { Place } from "../../lib/wrt/types";

function withoutAudit<T extends { created_at: unknown; created_by: unknown; updated_at: unknown; updated_by: unknown; deactivated_by?: unknown }>(row: T) {
  const { created_at, created_by, updated_at, updated_by, deactivated_by, ...seed } = row;
  void created_at; void created_by; void updated_at; void updated_by; void deactivated_by;
  return seed;
}

export function readPlaceSeeds() {
  const sites = siteDump.map(withoutAudit) satisfies TablesInsert<"sites">[];
  const areas = areaDump.map((row) => ({ ...withoutAudit(row), class: z.enum(["community", "school", "keystone"]).nullable().parse(row.class) })) satisfies TablesInsert<"areas">[];
  for (const [name, rows] of [["sites", sites], ["site_areas", areas]] as const) {
    if (new Set(rows.map((row) => row.slug)).size !== rows.length) throw new Error(`Duplicate slug in data/${name}.json`);
  }
  const siteSlugs = new Set(sites.map((site) => site.slug));
  for (const area of areas) {
    if (!siteSlugs.has(area.site)) throw new Error(`${area.slug}: site ${area.site} is missing from data/sites.json`);
  }
  return { sites, areas };
}

/** Resolve workbook parcel identities to saved area slugs without regenerating them. */
export function workbookAreaSlugs(places: Place[], seeds = readPlaceSeeds()) {
  const result = new Map<string, string>();
  for (const place of places) {
    if (!seeds.sites.some((site) => site.slug === place.slug)) throw new Error(`Workbook site ${place.slug} is missing from data/sites.json`);
    for (const parcel of place.parcels) {
      const number = /^(unnumbered-|NEW-)/.test(parcel.id) ? null : parcel.id;
      const matches = seeds.areas.filter((area) => area.site === place.slug &&
        (number !== null ? area.wrt_number === number : area.wrt_number === null && area.name === parcel.name));
      if (matches.length !== 1) throw new Error(`Workbook area ${place.slug}|${parcel.id} has ${matches.length} matches in data/site_areas.json`);
      result.set(`${place.slug}|${parcel.id}`, matches[0]!.slug);
    }
  }
  return result;
}
