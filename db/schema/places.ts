/**
 * Where planting happens: sites, the areas inside them, and their map pins.
 */
import { sql } from "drizzle-orm";
import {
  boolean, check, date, doublePrecision, foreignKey, integer, pgTable, text, unique, uniqueIndex,
} from "drizzle-orm/pg-core";
import { editTrail, publicRead, staffAccess } from "./access";
import { locationAccuracy, siteClass } from "./enums";

/** A place people plant: "Lake Hayes", "Whitechapel". Paper4Trees is a scheme, not a place. */
export const sites = pgTable("sites", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),                       // "lake-hayes": used in URLs
  name: text().notNull(),
  description: text().notNull().default(""),
  isScheme: boolean().notNull().default(false),
  isPublic: boolean().notNull().default(false),
  ...editTrail(),
}, (t) => [
  ...staffAccess(),
  publicRead(sql`${t.isPublic} and ${t.deactivatedAt} is null`),
]);

/** A part of a site as WRT registers it: "Lake Hayes Pavilion", WRT site number "9G". */
export const siteAreas = pgTable("site_areas", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  siteId: integer().notNull().references(() => sites.id),
  slug: text().notNull(),                                // unique within the site
  name: text().notNull(),
  description: text().notNull().default(""),
  wrtNumber: text(),                                     // "9G", "13C", "NEW-…"; null if none
  siteClass: siteClass(),                                // null for Paper4Trees
  isPublic: boolean().notNull().default(false),
  ...editTrail(),
}, (t) => [
  unique().on(t.siteId, t.slug),
  unique().on(t.siteId, t.wrtNumber),
  unique("site_areas_id_site_id_key").on(t.id, t.siteId), // lets pins check the area is in the site
  ...staffAccess(),
  publicRead(sql`${t.isPublic} and ${t.deactivatedAt} is null and exists (
    select 1 from public.sites s where s.id = ${t.siteId} and s.is_public and s.deactivated_at is null)`),
]);

/**
 * A map pin with an optional radius wide enough to cover private land.
 * Covers the whole site, or one area when site_area_id is set.
 * At most one active pin per site and one per area. Polygons can join later (PostGIS).
 */
export const siteLocations = pgTable("site_locations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),                       // "slope-hill-riparian"
  siteId: integer().notNull().references(() => sites.id),
  siteAreaId: integer(),
  label: text().notNull(),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  radiusM: integer(),
  accuracy: locationAccuracy().notNull(),
  description: text().notNull().default(""),
  sourceLabel: text(),
  sourceUrl: text(),
  coordinateSourceUrl: text(),
  coordinateMethod: text(),
  checkedOn: date(),
  ...editTrail(),
}, (t) => [
  foreignKey({ columns: [t.siteAreaId, t.siteId], foreignColumns: [siteAreas.id, siteAreas.siteId] }),
  check("latitude_in_range", sql`${t.latitude} between -90 and 90`),
  check("longitude_in_range", sql`${t.longitude} between -180 and 180`),
  check("radius_positive", sql`${t.radiusM} > 0`),
  uniqueIndex("one_site_pin").on(t.siteId).where(sql`${t.siteAreaId} is null and ${t.deactivatedAt} is null`),
  uniqueIndex("one_area_pin").on(t.siteAreaId).where(sql`${t.siteAreaId} is not null and ${t.deactivatedAt} is null`),
  ...staffAccess(),
  publicRead(sql`${t.deactivatedAt} is null and exists (
    select 1 from public.sites s where s.id = ${t.siteId} and s.is_public and s.deactivated_at is null)`),
]);
