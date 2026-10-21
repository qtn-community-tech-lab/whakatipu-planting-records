/**
 * One base query per view: its columns and its usual order. Nothing is sent until
 * a query in this folder adds its filter and awaits it, so each read is one request.
 */
import type { Db } from "@/db/types";

/** Every site with its totals, most recorded first. */
export const siteTotals = (db: Db) =>
  db
    .from("totals_by_site")
    .select("site, site_name, plants, plants_resolved, plants_needs_review, species")
    .order("plants", { ascending: false });

/** Every species with planting history, most recorded first. */
export const speciesTotals = (db: Db) =>
  db
    .from("totals_by_species")
    .select("species, maori_name, scientific_name, plants, plants_resolved, plants_needs_review, sites")
    .order("plants", { ascending: false });

/** Every season in order, empty ones included. */
export const seasonTotals = (db: Db) =>
  db
    .from("totals_by_season")
    .select("season, season_label, plants, plants_resolved, plants_needs_review, sites, species")
    .order("season_order");

/** Every area with its site and pin, by site then area. */
export const areas = (db: Db) =>
  db
    .from("area_list")
    .select("area, area_name, wrt_number, site_class, site, site_name, is_scheme, latitude, longitude, radius_m")
    .order("site_name")
    .order("area_name");

/** Every planting line, oldest season first. */
export const lines = (db: Db) =>
  db
    .from("line_details")
    .select("line_id, event_id, season_label, planting_date, site_name, area_name, maori_name, scientific_name, quantity, needs_review, legacy_code")
    .order("season_order")
    .order("area_name")
    .order("scientific_name");

/** Every review question with its open lines, biggest first. A line can sit under two: don't add rows up. */
export const reviewTotals = (db: Db) =>
  db
    .from("totals_by_review_topic")
    .select("topic, label, question, decision, plants_needs_review, lines_needs_review")
    .order("plants_needs_review", { ascending: false });
