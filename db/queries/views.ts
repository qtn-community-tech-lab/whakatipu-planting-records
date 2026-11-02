/**
 * One base query per view or table: its columns and its usual order. Nothing is sent
 * until a query in this folder adds its filter and awaits it, so each read is one request.
 */
import type { Db } from "@/db/types";

/** Every site with its totals, most recorded first. */
export const siteTotals = (db: Db) =>
  db
    .from("totals_by_site")
    .select("site, site_name, is_scheme, plants, plants_confirmed, plants_needs_review, species, first_season, last_season")
    .order("plants", { ascending: false });

/** Every area with its totals, by site then area. */
export const areaTotals = (db: Db) =>
  db
    .from("totals_by_area")
    .select("area, area_name, wrt_number, class, site, site_name, plants, plants_confirmed, plants_needs_review, species")
    .order("site_name")
    .order("area_name");

/** Every live area with its map pin, by site then area. */
export const areaPins = (db: Db) =>
  db
    .from("areas")
    .select("slug, name, wrt_number, class, site, lat, lng, radius_m")
    .is("retired_at", null)
    .order("site")
    .order("name");

/** Every species with planting history, most recorded first. */
export const speciesTotals = (db: Db) =>
  db
    .from("totals_by_species")
    .select("species, scientific_name, common_name, maori_name, plants, plants_confirmed, plants_needs_review, lines, sites")
    .order("plants", { ascending: false });

/** Every season in planting order, empty ones included, with the workbook's TOTAL cell. */
export const seasonTotals = (db: Db) =>
  db
    .from("totals_by_season")
    .select("season, season_label, workbook_total, plants, plants_confirmed, plants_needs_review, lines, sites, species")
    .order("season_order");

/** Every planting line, oldest season first. line_id last, so pages never skip or repeat a row. */
export const lines = (db: Db) =>
  db
    .from("line_details")
    .select("line_id, planting_id, season, season_label, planted_on, site, site_name, area, area_name, species, scientific_name, maori_name, quantity, needs_review, legacy_code")
    .order("season_order")
    .order("area_name")
    .order("scientific_name")
    .order("line_id");

/** Every live question, with how many of its ruling or confirm notes are still open. */
export const questions = (db: Db) =>
  db
    .from("questions")
    .select("slug, question, ruling, ruled_on, notes(count)")
    .is("retired_at", null)
    .is("notes.resolved_at", null)
    .is("notes.retired_at", null)
    .in("notes.kind", ["ruling", "confirm"])
    .order("slug");
