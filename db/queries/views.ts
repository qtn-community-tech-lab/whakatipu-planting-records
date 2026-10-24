/**
 * One base query per view: its columns and its usual order. Nothing is sent until
 * a query in this folder adds its filter and awaits it, so each read is one request.
 */
import type { Db } from "@/db/types";

/** Every site with its totals, most recorded first. */
export const siteTotals = (db: Db) =>
  db
    .from("totals_by_site")
    .select("site, site_name, plants, species")
    .order("plants", { ascending: false });

/** Every species with planting history, most recorded first. */
export const speciesTotals = (db: Db) =>
  db
    .from("totals_by_species")
    .select("species, maori_name, scientific_name, plants, sites")
    .order("plants", { ascending: false });

/** Recorded season labels, alphabetically. */
export const seasonTotals = (db: Db) =>
  db
    .from("totals_by_season")
    .select("season, plants, sites, species")
    .order("season");

/** Every area with its site and pin, by site then area. */
export const areas = (db: Db) =>
  db
    .from("area_list")
    .select("area, area_name, wrt_number, site_class, site, site_name, is_scheme, latitude, longitude, radius_m")
    .order("site_name")
    .order("area_name");

/** Active planting lines with their event and species, ordered for stable pagination. */
export const lines = (db: Db) =>
  db
    .from("planting_event_species")
    .select("*, event:planting_events!inner(*, site:sites!inner(slug, name, deactivated_at), area:planting_areas(slug, name, deactivated_at)), species:species!inner(slug, scientific_name, maori_name, deactivated_at)")
    .is("deactivated_at", null)
    .is("event.deactivated_at", null)
    .is("event.site.deactivated_at", null)
    .is("event.area.deactivated_at", null)
    .or("planting_area_id.is.null,area.not.is.null", { referencedTable: "event" })
    .is("species.deactivated_at", null)
    .order("id");
