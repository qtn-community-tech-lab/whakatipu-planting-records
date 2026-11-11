/**
 * One base query per view or table: its columns and its usual order. Nothing is sent
 * until a query in this folder adds its filter and awaits it, so each read is one request.
 */
import type { Db } from "@/db/types";

/** Rows per page. Supabase returns at most 1,000 rows a request, so every unbounded read pages. */
export const PAGE_SIZE = 1000;

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
    .select("slug, name, description, wrt_number, class, site, lat, lng, radius_m, pin_source_url, pin_checked_on")
    .is("deactivated_at", null)
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
    .select("season, season_label, season_order, year, half, workbook_total, workbook_cell, plants, plants_confirmed, plants_needs_review, lines, lines_needs_review, sites, species")
    .order("season_order");

/** Species in each season, most planted first. */
export const seasonSpecies = (db: Db) =>
  db
    .from("season_species")
    .select("season, species, register_code, scientific_name, common_name, maori_name, plants, rank")
    .order("season")
    .order("rank");

/** Sites in each season, most planted first. */
export const seasonSites = (db: Db) =>
  db
    .from("season_sites")
    .select("season, site, site_name, plants, rank")
    .order("season")
    .order("rank");

/** Species at each site and each of its areas, most planted first. Whole-site rows have no area. */
export const siteAreaSpecies = (db: Db) =>
  db
    .from("site_area_species")
    .select("site, area, wrt_number, species, register_code, scientific_name, common_name, maori_name, plants, rank")
    .order("rank");

/** Plants in each season at each site and each of its areas, newest season first. Whole-site rows have no area. */
export const siteAreaSeasons = (db: Db) =>
  db
    .from("site_area_seasons")
    .select("site, area, wrt_number, season, season_label, season_order, plants")
    .order("season_order", { ascending: false });

/** Plants still waiting on each question. */
export const questionTotals = (db: Db) =>
  db
    .from("totals_by_question")
    .select("question, lines, plants");

/** Every planting line, oldest season first. line_id last, so pages never skip or repeat a row. */
export const lines = (db: Db) =>
  db
    .from("line_details")
    .select("line_id, planting_id, legacy_code, season, season_label, season_order, year, planted_on, site, site_name, is_scheme, area, area_name, class, species, scientific_name, common_name, maori_name, threatened, threatened_te_kakano, contested_group, register_code, quantity, needs_review, notes, source_cell, precision, confidence, source_file, source_sheet, season_original, site_original, species_original")
    .order("season_order")
    .order("area_name")
    .order("scientific_name")
    .order("line_id");

/** Every live question, with how many of its ruling or confirm notes are still open. */
export const questions = (db: Db) =>
  db
    .from("questions")
    .select("slug, question, ruling, ruled_on, notes(count)")
    .is("deactivated_at", null)
    .is("notes.resolved_at", null)
    .is("notes.deactivated_at", null)
    .in("notes.kind", ["ruling", "confirm"])
    .order("slug");
